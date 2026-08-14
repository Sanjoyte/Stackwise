import mongoose from "mongoose";
import ExpenseCategory from "../models/ExpenseCategory.js";
import { DEFAULT_EXPENSE_CATEGORIES } from "../data/defaultExpenseCategories.js";

const USD_TO_BDT = 120;
const ENTERTAINMENT = [
  "netflix", "spotify", "youtube", "disney", "prime video",
  "hoichoi", "chorki", "bongo", "hulu", "hbo", "apple music"
];

const slugify = (v = "") =>
  String(v).toLowerCase().trim()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const round = (v) =>
  Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;

const normalizeCurrency = (v, fallback = "BDT") => {
  const c = String(v || fallback).trim().toUpperCase();
  return c === "$" ? "USD" : c === "৳" ? "BDT" : c;
};

const convert = (value, from, to) => {
  const n = Math.abs(Number(value) || 0);
  const f = normalizeCurrency(from, to);
  const t = normalizeCurrency(to);

  if (f === t) return n;
  if (f === "USD" && t === "BDT") return n * USD_TO_BDT;
  if (f === "BDT" && t === "USD") return n / USD_TO_BDT;

  return n;
};

const amount = (doc, base) =>
  convert(
    doc.amount ?? doc.total ?? doc.value ?? doc.cost ?? doc.price ?? 0,
    doc.currency ?? doc.currencyCode ?? base,
    base
  );

const getUserDocuments = async (collection, userId) => {
  const db = mongoose.connection.db;
  if (!db) return [];

  const id = String(userId);
  const filters = [
    { user: id },
    { userId: id },
    { owner: id },
  ];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    const oid = new mongoose.Types.ObjectId(userId);

    filters.push(
      { user: oid },
      { userId: oid },
      { owner: oid }
    );
  }

  return db.collection(collection).find({ $or: filters }).toArray();
};

const getBaseCurrency = async (userId) => {
  const db = mongoose.connection.db;
  if (!db) return "BDT";

  const query = mongoose.Types.ObjectId.isValid(userId)
    ? {
        $or: [
          { _id: new mongoose.Types.ObjectId(userId) },
          { _id: String(userId) },
        ],
      }
    : { _id: String(userId) };

  const user = await db.collection("users").findOne(query);

  return normalizeCurrency(user?.baseCurrency || "BDT");
};

const toDate = (...values) => {
  const raw = values.find(Boolean);
  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
};

const expenseDate = (doc) =>
  toDate(
    doc.date,
    doc.expenseDate,
    doc.paidAt,
    doc.paymentDate,
    doc.createdAt
  );

const subStart = (doc) =>
  toDate(
    doc.startDate,
    doc.subscriptionStartDate,
    doc.billingDate,
    doc.createdAt,
    doc.renewalDate,
    doc.nextRenewalDate
  );

const subEnd = (doc) =>
  toDate(
    doc.cancelledAt,
    doc.canceledAt,
    doc.endDate,
    doc.expiredAt,
    doc.expiresAt
  );

const getRange = (period, previous = false) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "yearly") {
    const y = previous ? year - 1 : year;

    return {
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1),
    };
  }

  const m = previous ? month - 1 : month;

  return {
    start: new Date(year, m, 1),
    end: new Date(year, m + 1, 1),
  };
};

const inRange = (date, range) =>
  date &&
  date >= range.start &&
  date < range.end;

const getCycle = (subscription) => {
  const cycle = String(
    subscription.billingCycle ??
    subscription.billingFrequency ??
    subscription.frequency ??
    subscription.interval ??
    "once"
  ).toLowerCase();

  if (["monthly", "month"].includes(cycle)) return "monthly";
  if (["weekly", "week"].includes(cycle)) return "weekly";
  if (["quarterly", "quarter"].includes(cycle)) return "quarterly";

  if (
    ["yearly", "annual", "annually", "year"].includes(cycle)
  ) {
    return "yearly";
  }

  if (
    ["semiannual", "semi-annually", "half-yearly"].includes(cycle)
  ) {
    return "semiannual";
  }

  return "once";
};

const nextCharge = (date, cycle) => {
  const next = new Date(date);

  if (cycle === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (cycle === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (cycle === "quarterly") {
    next.setMonth(next.getMonth() + 3);
  } else if (cycle === "semiannual") {
    next.setMonth(next.getMonth() + 6);
  } else if (cycle === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    return null;
  }

  return next;
};

const chargeDates = (subscription) => {
  const start = subStart(subscription);
  if (!start) return [];

  const now = new Date();
  const end = subEnd(subscription);
  const limit = end && end < now ? end : now;

  if (start > limit) return [];

  const cycle = getCycle(subscription);

  if (cycle === "once") return [start];

  const dates = [];
  let current = new Date(start);
  let guard = 0;

  while (current <= limit && guard++ < 1000) {
    dates.push(new Date(current));

    current = nextCharge(current, cycle);

    if (!current) break;
  }

  return dates;
};

const skipSubscription = (subscription) =>
  ["inactive", "deleted"].includes(
    String(subscription.status || "").toLowerCase()
  );

const subscriptionCategory = (subscription) => {
  const category = String(
    subscription.category?.name ||
    subscription.category ||
    subscription.categoryName ||
    ""
  ).trim().toLowerCase();

  const entertainmentCategories = [
    "entertainment",
    "streaming",
    "music",
    "movies",
  ];

  if (entertainmentCategories.includes(category)) {
    return "Entertainment";
  }

  const name = String(
    subscription.name ??
    subscription.toolName ??
    subscription.serviceName ??
    subscription.title ??
    ""
  ).toLowerCase();

  if (ENTERTAINMENT.some((item) => name.includes(item))) {
    return "Entertainment";
  }

  // All other subscription/tool categories are grouped here.
  return "Software & Subscriptions";
};

export const getCategoryOptions = async (userId) => {
  const saved = await ExpenseCategory.find({ user: userId })
    .sort({ createdAt: 1 })
    .lean();

  const savedMap = new Map(saved.map((c) => [c.slug, c]));
  const defaultSlugs = new Set(
    DEFAULT_EXPENSE_CATEGORIES.map((c) => c.slug)
  );

  const defaults = DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    monthlyBudget:
      savedMap.get(category.slug)?.monthlyBudget ?? null,
    isCustom: false,
  }));

  const custom = saved
    .filter((category) => !defaultSlugs.has(category.slug))
    .map((category) => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      theme: category.theme,
      monthlyBudget: category.monthlyBudget,
      isCustom: true,
    }));

  return [...defaults, ...custom];
};

const makeCategoryMap = (categories) =>
  new Map(
    categories
      .filter((category) => category.id)
      .map((category) => [
        String(category.id),
        category.name,
      ])
  );

const expenseCategory = (expense, map) =>
  expense.category?.name ||
  (typeof expense.category === "string"
    ? expense.category
    : null) ||
  expense.categoryName ||
  map.get(
    String(
      expense.categoryId ??
      expense.category
    )
  ) ||
  "Other";

const addTotal = (totals, slug, value) => {
  const row =
    totals.get(slug) || {
      amount: 0,
      transactionCount: 0,
    };

  row.amount += value;
  row.transactionCount++;

  totals.set(slug, row);
};

const loadData = async (userId) => {
  const [
    categories,
    expenses,
    subscriptions,
    base,
  ] = await Promise.all([
    getCategoryOptions(userId),
    getUserDocuments("expenses", userId),
    getUserDocuments("subscriptions", userId),
    getBaseCurrency(userId),
  ]);

  return {
    categories,
    expenses,
    subscriptions,
    base,
  };
};

export const getExpenseCategorySpending = async ({
  userId,
  period = "monthly",
}) => {
  const {
    categories,
    expenses,
    subscriptions,
    base,
  } = await loadData(userId);

  const range = getRange(period);
  const map = makeCategoryMap(categories);
  const totals = new Map();

  expenses.forEach((expense) => {
    if (!inRange(expenseDate(expense), range)) return;

    addTotal(
      totals,
      slugify(
        expenseCategory(
          expense,
          map
        )
      ),
      amount(expense, base)
    );
  });

  subscriptions.forEach((subscription) => {
    if (skipSubscription(subscription)) return;

    const value =
      amount(subscription, base);

    if (value <= 0) return;

    const slug =
      slugify(
        subscriptionCategory(
          subscription
        )
      );

    chargeDates(subscription)
      .forEach((date) => {
        if (inRange(date, range)) {
          addTotal(
            totals,
            slug,
            value
          );
        }
      });
  });

  const result =
    categories
      .map((category) => {
        const row =
          totals.get(category.slug) || {
            amount: 0,
            transactionCount: 0,
          };

        const budget =
          category.monthlyBudget
            ? period === "yearly"
              ? category.monthlyBudget * 12
              : category.monthlyBudget
            : null;

        return {
          ...category,
          amount: round(row.amount),
          transactionCount:
            row.transactionCount,
          budget,

          percentageUsed:
            budget
              ? Math.round(
                  Math.min(
                    100,
                    (row.amount / budget) *
                      100
                  )
                )
              : null,
        };
      })
      .sort(
        (a, b) =>
          b.amount - a.amount
      );

  return {
    period,
    currency: base,

    totalSpent:
      round(
        result.reduce(
          (sum, category) =>
            sum + category.amount,
          0
        )
      ),

    categories: result,
  };
};

const getTransactions = ({
  expenses,
  subscriptions,
  slug,
  range,
  map,
  base,
}) => {
  const rows =
    expenses
      .filter(
        (expense) =>
          slugify(
            expenseCategory(
              expense,
              map
            )
          ) === slug &&
          inRange(
            expenseDate(expense),
            range
          )
      )
      .map((expense) => ({
        id: String(expense._id),

        title:
          expense.title ??
          expense.name ??
          expense.merchant ??
          expense.description ??
          "Expense",

        amount:
          amount(expense, base),

        currency: base,

        date:
          expenseDate(expense),

        notes:
          expense.notes ?? "",

        source: "expense",
      }));

  subscriptions.forEach(
    (subscription) => {
      if (
        skipSubscription(
          subscription
        ) ||
        slugify(
          subscriptionCategory(
            subscription
          )
        ) !== slug
      ) {
        return;
      }

      const value =
        amount(
          subscription,
          base
        );

      if (value <= 0) return;

      const title =
        subscription.toolName ??
        subscription.name ??
        subscription.serviceName ??
        subscription.title ??
        "Subscription";

      chargeDates(subscription)
        .forEach((date) => {
          if (
            !inRange(
              date,
              range
            )
          ) {
            return;
          }

          rows.push({
            id:
              `${subscription._id}-${date.toISOString()}`,

            title,
            amount: value,
            currency: base,
            date,

            notes:
              `${getCycle(subscription)} subscription`,

            source:
              "subscription",
          });
        });
    }
  );

  return rows;
};

export const getExpenseCategoryDetail = async ({
  userId,
  slug,
  period = "monthly",
}) => {
  const {
    categories,
    expenses,
    subscriptions,
    base,
  } = await loadData(userId);

  const category =
    categories.find(
      (item) =>
        item.slug === slug
    );

  if (!category) return null;

  const map =
    makeCategoryMap(categories);

  const collect = (range) =>
    getTransactions({
      expenses,
      subscriptions,
      slug,
      range,
      map,
      base,
    });

  const current =
    collect(
      getRange(period)
    );

  const previous =
    collect(
      getRange(
        period,
        true
      )
    );

  const total =
    round(
      current.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      )
    );

  const previousTotal =
    round(
      previous.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      )
    );

  const now =
    new Date();

  const days =
    period === "yearly"
      ? Math.max(
          1,
          Math.ceil(
            (now -
              new Date(
                now.getFullYear(),
                0,
                1
              )) /
              86400000
          )
        )
      : Math.max(
          1,
          now.getDate()
        );

  const budget =
    category.monthlyBudget
      ? period === "yearly"
        ? category.monthlyBudget *
          12
        : category.monthlyBudget
      : null;

  return {
    category,
    period,
    currency: base,

    summary: {
      totalSpent: total,

      previousPeriodSpent:
        previousTotal,

      savingsPercentage:
        previousTotal
          ? Math.round(
              ((previousTotal -
                total) /
                previousTotal) *
                100
            )
          : 0,

      averagePerDay:
        round(
          total / days
        ),

      transactionCount:
        current.length,

      budget,

      remaining:
        budget === null
          ? null
          : round(
              budget - total
            ),

      percentageUsed:
        budget
          ? Math.round(
              Math.min(
                100,
                (total /
                  budget) *
                  100
              )
            )
          : null,
    },

    recentTransactions:
      current
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        )
        .slice(0, 10),
  };
};

const fail = (
  message,
  statusCode
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  throw error;
};

export const setCategoryBudget = async ({
  userId,
  slug,
  monthlyBudget,
}) => {
  const budget = Number(monthlyBudget);

  if (!Number.isFinite(budget) || budget < 0) {
    fail("Budget must be a valid positive number.", 400);
  }

  const existing = await ExpenseCategory.findOne({
    user: userId,
    slug,
  });

  if (existing) {
    existing.monthlyBudget = budget;
    await existing.save();
    return existing;
  }

  const defaultCategory =
    DEFAULT_EXPENSE_CATEGORIES.find(
      (category) => category.slug === slug
    );

  if (!defaultCategory) return null;

  return ExpenseCategory.create({
    user: userId,
    ...defaultCategory,
    monthlyBudget: budget,
    isCustom: false,
  });s
};

export const createExpenseCategory = async ({
  userId,
  name,
  icon,
  theme,
  monthlyBudget,
}) => {
  const cleanName =
    String(name || "")
      .trim();

  if (!cleanName) {
    fail(
      "Category name is required.",
      400
    );
  }

  const slug =
    slugify(cleanName);

  const exists =
    DEFAULT_EXPENSE_CATEGORIES.some(
      (category) =>
        category.slug === slug
    ) ||
    await ExpenseCategory.exists({
      user: userId,
      slug,
    });

  if (exists) {
    fail(
      "This category already exists.",
      409
    );
  }

  const budget =
    monthlyBudget === "" ||
    monthlyBudget == null
      ? null
      : Number(monthlyBudget);

  if (
    budget !== null &&
    (
      !Number.isFinite(budget) ||
      budget < 0
    )
  ) {
    fail(
      "Monthly budget must be a valid positive number.",
      400
    );
  }

  return ExpenseCategory.create({
    user: userId,
    name: cleanName,
    slug,
    icon: icon || "wallet",
    theme: theme || "indigo",
    monthlyBudget: budget,
  });
};