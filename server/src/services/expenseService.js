import mongoose from "mongoose";

import Expense from "../models/Expense.js";
import { getCategoryOptions } from "./expenseCategoryService.js";
import { ensureClientProject } from "../controllers/clientController.js";
import { getSubscriptionExpenseRows } from "./subscriptionExpenseService.js";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  isValidDateOnly,
  normalizeCurrency,
  roundMoney,
} from "../utils/expenseUtils.js";

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const cleanText = (value) => String(value ?? "").trim();

const normalizeCategory = (value, categories) => {
  const token =
    typeof value === "object" && value
      ? value.slug || value.id || value.name
      : value;
  const normalized = cleanText(token).toLowerCase();

  if (!normalized) return null;

  const match = categories.find(
    (category) =>
      String(category.slug).toLowerCase() === normalized ||
      String(category.name).toLowerCase() === normalized ||
      (category.id && String(category.id).toLowerCase() === normalized)
  );

  if (!match) return null;

  return {
    id: match.id || null,
    name: match.name,
    slug: match.slug,
  };
};

export const validateExpenseInput = ({ input, categories, strictDate = false }) => {
  const candidate = input && typeof input === "object" ? input : {};
  const errors = [];
  const description = cleanText(candidate.description);
  const amount = Number(candidate.amount);
  const currency = normalizeCurrency(candidate.currency, "");
  const expenseType = cleanText(candidate.expenseType).toLowerCase();
  const category = normalizeCategory(candidate.category, categories);
  const dateValue = cleanText(candidate.date);
  const date = new Date(dateValue);
  const dateOnlyIsInvalid = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && !isValidDateOnly(dateValue);
  const clientName = cleanText(candidate.clientName);
  const merchant = cleanText(candidate.merchant);
  const paymentMethod = cleanText(candidate.paymentMethod);
  const notes = cleanText(candidate.notes);

  if (!description) errors.push("Description is required");
  if (description.length > 120) errors.push("Description cannot exceed 120 characters");
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Amount must be a number greater than zero");
  }
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`);
  }
  if (
    !dateValue ||
    Number.isNaN(date.getTime()) ||
    dateOnlyIsInvalid ||
    (strictDate && !isValidDateOnly(dateValue))
  ) {
    errors.push(strictDate ? "Date must use YYYY-MM-DD" : "A valid date is required");
  }
  if (!category) errors.push("Category is not available in your Stackwise categories");
  if (!["business", "personal"].includes(expenseType)) {
    errors.push("Expense type must be business or personal");
  }
  if (clientName.length > 100) errors.push("Client/Project name cannot exceed 100 characters");
  if (merchant.length > 100) errors.push("Merchant cannot exceed 100 characters");
  if (paymentMethod.length > 80) errors.push("Payment method cannot exceed 80 characters");
  if (notes.length > 500) errors.push("Notes cannot exceed 500 characters");

  return {
    valid: errors.length === 0,
    errors,
    value: {
      description,
      amount,
      currency,
      date,
      category,
      expenseType,
      clientName,
      merchant,
      paymentMethod,
      notes,
    },
  };
};

const getCategories = (userId) => getCategoryOptions(userId);

export const createExpenseRecord = async ({ userId, input, source = "manual" }) => {
  const categories = await getCategories(userId);
  const validation = validateExpenseInput({ input, categories });

  if (!validation.valid) fail(validation.errors[0]);

  const value = { ...validation.value };

  // Resolve clientProject either from the posted id or auto-create from clientName.
  if (input.clientProject || value.clientName) {
    if (input.clientProject) {
      value.clientProject = input.clientProject;
    } else if (value.clientName) {
      const client = await ensureClientProject({ userId, name: value.clientName });
      value.clientProject = client?._id || null;
    }
  }

  return Expense.create({ user: userId, ...value, source });
};

const normalizeStoredExpense = (expense) => ({
  ...expense,
  _id: String(expense._id),
  categorySlug: expense.category?.slug,
  readOnly: false,
});

const parseRange = (startDate, endDate) => {
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

  if (
    (startDate && (!isValidDateOnly(startDate) || Number.isNaN(start.getTime()))) ||
    (endDate && (!isValidDateOnly(endDate) || Number.isNaN(end.getTime())))
  ) {
    fail("The requested date range is invalid");
  }
  if (start && end && start > end) fail("Start date must be before end date");

  return { start, end };
};

const filterAndSortRows = ({ rows, filters, baseCurrency }) => {
  const { start, end } = parseRange(filters.startDate, filters.endDate);
  const search = cleanText(filters.search).toLowerCase();
  const type = cleanText(filters.type).toLowerCase();
  const source = cleanText(filters.source).toLowerCase();
  const category = cleanText(filters.category).toLowerCase();

  const result = rows
    .filter((row) => {
      const rowDate = new Date(row.date);
      const text = [row.description, row.merchant, row.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (search && !text.includes(search)) return false;
      if (type && type !== "all" && row.expenseType !== type) return false;
      if (source && source !== "all" && row.source !== source) return false;
      if (
        category &&
        category !== "all" &&
        row.category?.slug?.toLowerCase() !== category &&
        row.category?.name?.toLowerCase() !== category
      ) {
        return false;
      }
      if (start && rowDate < start) return false;
      if (end && rowDate > end) return false;

      return true;
    })
    .map((row) => ({
      ...row,
      baseAmount: roundMoney(
        convertCurrency({
          amount: row.amount,
          fromCurrency: row.currency,
          toCurrency: baseCurrency,
        })
      ),
    }));

  const sort = filters.sort || "newest";
  result.sort((a, b) => {
    if (sort === "oldest") return new Date(a.date) - new Date(b.date);
    if (sort === "highest") return b.baseAmount - a.baseAmount;
    if (sort === "lowest") return a.baseAmount - b.baseAmount;
    return new Date(b.date) - new Date(a.date);
  });

  return result;
};

export const buildExpenseSummary = (rows, currency) => {
  const business = rows
    .filter((row) => row.expenseType === "business")
    .reduce((sum, row) => sum + row.baseAmount, 0);
  const personal = rows
    .filter((row) => row.expenseType === "personal")
    .reduce((sum, row) => sum + row.baseAmount, 0);

  return {
    totalExpenses: roundMoney(business + personal),
    business: roundMoney(business),
    personal: roundMoney(personal),
    transactions: rows.length,
    currency,
  };
};

export const getUnifiedExpenses = async ({ user, filters = {} }) => {
  const includePersisted = !filters.source || ["all", "manual", "csv"].includes(filters.source);
  const includeSubscriptions = !filters.source || ["all", "subscription"].includes(filters.source);

  const [stored, subscriptions] = await Promise.all([
    includePersisted ? Expense.find({ user: user._id }).lean() : [],
    includeSubscriptions ? getSubscriptionExpenseRows(user._id) : [],
  ]);
  const rows = filterAndSortRows({
    rows: [...stored.map(normalizeStoredExpense), ...subscriptions],
    filters,
    baseCurrency: user.baseCurrency || "BDT",
  });

  return {
    expenses: rows,
    summary: buildExpenseSummary(rows, user.baseCurrency || "BDT"),
  };
};

export const getOwnedExpense = async (userId, expenseId) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) return null;
  return Expense.findOne({ _id: expenseId, user: userId });
};

export const updateExpenseRecord = async ({ userId, expenseId, input }) => {
  const expense = await getOwnedExpense(userId, expenseId);
  if (!expense) fail("Expense not found", 404);

  const categories = await getCategories(userId);
  const merged = {
    description: input.description ?? expense.description,
    amount: input.amount ?? expense.amount,
    currency: input.currency ?? expense.currency,
    date: input.date ?? expense.date.toISOString(),
    category: input.category ?? expense.category,
    expenseType: input.expenseType ?? expense.expenseType,
    clientName: input.clientName ?? expense.clientName ?? "",
    merchant: input.merchant ?? expense.merchant,
    paymentMethod: input.paymentMethod ?? expense.paymentMethod,
    notes: input.notes ?? expense.notes,
  };
  const validation = validateExpenseInput({ input: merged, categories });

  if (!validation.valid) fail(validation.errors[0]);

  const value = { ...validation.value };

  // Resolve clientProject either from the posted id or auto-create from clientName.
  if (input.clientProject !== undefined) {
    value.clientProject = input.clientProject;
  } else if (value.clientName) {
    const client = await ensureClientProject({ userId, name: value.clientName });
    value.clientProject = client?._id || null;
  } else if (input.clientName === "") {
    value.clientProject = null;
  }

  Object.assign(expense, value);
  return expense.save();
};

export const importExpenseRows = async ({ userId, rows }) => {
  if (!Array.isArray(rows) || rows.length === 0) fail("At least one CSV row is required");
  if (rows.length > 1000) fail("A maximum of 1,000 rows can be imported at once");

  const categories = await getCategories(userId);
  const validDocuments = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const validation = validateExpenseInput({ input: row, categories, strictDate: true });

    if (!validation.valid) {
      invalidRows.push({ row: index + 2, errors: validation.errors });
      return;
    }

    validDocuments.push({
      user: userId,
      ...validation.value,
      source: "csv",
    });
  });

  const imported = validDocuments.length ? await Expense.insertMany(validDocuments) : [];

  return {
    imported: imported.length,
    invalid: invalidRows.length,
    invalidRows,
    expenses: imported,
  };
};

export { filterAndSortRows, normalizeCategory };
