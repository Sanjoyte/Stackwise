import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import Expense from "../src/models/Expense.js";
import {
  buildExpenseSummary,
  filterAndSortRows,
  getOwnedExpense,
  validateExpenseInput,
} from "../src/services/expenseService.js";
import {
  generateSubscriptionChargeDates,
  normalizeSubscriptionExpenses,
} from "../src/services/subscriptionExpenseService.js";
import {
  RECEIPT_MAX_BYTES,
  RECEIPT_MIME_TYPES,
} from "../src/middleware/receiptUpload.js";

const categories = [
  { name: "Travel", slug: "travel" },
  { name: "Software & Subscriptions", slug: "software-subscriptions" },
];

const validInput = {
  date: "2026-08-14",
  description: "Laptop Stand",
  amount: 3000,
  currency: "BDT",
  category: "Travel",
  expenseType: "business",
  merchant: "Star Tech",
};

test("manual expense validation normalizes an available category", () => {
  const result = validateExpenseInput({ input: validInput, categories });

  assert.equal(result.valid, true);
  assert.equal(result.value.category.slug, "travel");
  assert.equal(result.value.expenseType, "business");
});

test("critical validation rejects zero/negative amounts and invalid types", () => {
  for (const amount of [0, -10]) {
    const result = validateExpenseInput({
      input: { ...validInput, amount, expenseType: "company" },
      categories,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((message) => message.includes("greater than zero")));
    assert.ok(result.errors.some((message) => message.includes("business or personal")));
  }
});

test("CSV dates are strict and unknown categories are rejected", () => {
  const result = validateExpenseInput({
    input: { ...validInput, date: "08/14/2026", category: "Hardware" },
    categories,
    strictDate: true,
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Date must use YYYY-MM-DD"));
  assert.ok(result.errors.some((message) => message.includes("not available")));
});

test("filtering searches text, filters source, and sorts converted amount", () => {
  const rows = [
    {
      _id: "1",
      description: "Adobe",
      merchant: "Adobe",
      notes: "Design",
      amount: 20,
      currency: "USD",
      date: new Date("2026-08-10"),
      category: { name: "Software & Subscriptions", slug: "software-subscriptions" },
      expenseType: "business",
      source: "csv",
    },
    {
      _id: "2",
      description: "Bus",
      amount: 100,
      currency: "BDT",
      date: new Date("2026-08-11"),
      category: { name: "Travel", slug: "travel" },
      expenseType: "personal",
      source: "manual",
    },
  ];

  const filtered = filterAndSortRows({
    rows,
    filters: { search: "adobe", source: "csv", sort: "highest" },
    baseCurrency: "BDT",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]._id, "1");
  assert.equal(filtered[0].baseAmount, 2400);
});

test("summary counts duplicate rows independently", () => {
  const duplicate = { expenseType: "business", baseAmount: 500 };
  const summary = buildExpenseSummary([duplicate, { ...duplicate }], "BDT");

  assert.equal(summary.totalExpenses, 1000);
  assert.equal(summary.business, 1000);
  assert.equal(summary.transactions, 2);
});

test("subscription occurrences recur and separate identical records are never deduplicated", () => {
  const baseSubscription = {
    name: "ChatGPT Plus",
    amount: 20,
    currency: "USD",
    billingCycle: "monthly",
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    status: "active",
  };
  const now = new Date("2026-08-14T00:00:00.000Z");
  const chargeDates = generateSubscriptionChargeDates(baseSubscription, now);

  assert.equal(chargeDates.length, 3);

  const rows = normalizeSubscriptionExpenses(
    [
      { ...baseSubscription, _id: "subscription-a" },
      { ...baseSubscription, _id: "subscription-b" },
    ],
    now
  );

  assert.equal(rows.length, 6);
  assert.equal(rows.filter((row) => row.date.toISOString() === "2026-08-10T00:00:00.000Z").length, 2);
  assert.ok(rows.every((row) => row.source === "subscription" && row.readOnly));
});

test("receipt policy accepts JPEG/PNG, rejects PDF, and caps files at 5 MB", () => {
  assert.deepEqual(RECEIPT_MIME_TYPES, ["image/jpeg", "image/png"]);
  assert.equal(RECEIPT_MIME_TYPES.includes("application/pdf"), false);
  assert.equal(RECEIPT_MAX_BYTES, 5 * 1024 * 1024);
});

test("single-record access always includes the authenticated owner", async () => {
  const expenseId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const originalFindOne = Expense.findOne;
  let capturedQuery;

  Expense.findOne = (query) => {
    capturedQuery = query;
    return Promise.resolve(null);
  };

  try {
    await getOwnedExpense(userId, expenseId);
  } finally {
    Expense.findOne = originalFindOne;
  }

  assert.equal(String(capturedQuery._id), String(expenseId));
  assert.equal(String(capturedQuery.user), String(userId));
});
