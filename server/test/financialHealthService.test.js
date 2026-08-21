import assert from "node:assert/strict";
import test from "node:test";

import {
  METRIC_WEIGHTS,
  buildInsights,
  buildMonthlyBuckets,
  computeFinancialHealth,
} from "../src/services/financialHealthService.js";

/* A fixed "now" keeps the six-month window deterministic. */
const NOW = new Date(2026, 7, 15); // 15 Aug 2026

const monthsAgo = (count, day = 10) =>
  new Date(NOW.getFullYear(), NOW.getMonth() - count, day);

const rows = (amounts, { currency = "BDT" } = {}) =>
  amounts.map((amount, index) => ({
    amount,
    currency,
    date: monthsAgo(amounts.length - 1 - index),
  }));

/* Steady 100k income, steady 50k spend, six months running. */
const healthyFixture = {
  incomes: rows([100000, 100000, 100000, 100000, 100000, 100000]),
  expenses: rows([50000, 50000, 50000, 50000, 50000, 50000]),
  recurringRows: rows([4000, 4000, 4000, 4000, 4000, 4000]),
  baseCurrency: "BDT",
  now: NOW,
};

/* Erratic income, spending consistently above it. */
const strugglingFixture = {
  incomes: rows([20000, 90000, 10000, 75000, 5000, 60000]),
  expenses: rows([70000, 95000, 40000, 110000, 30000, 90000]),
  recurringRows: rows([25000, 25000, 25000, 25000, 25000, 25000]),
  baseCurrency: "BDT",
  now: NOW,
};

test("metric weights sum to exactly 100", () => {
  const total = Object.values(METRIC_WEIGHTS).reduce((sum, w) => sum + w, 0);

  assert.equal(total, 100);
});

test("a healthy profile scores well above a struggling one", () => {
  const healthy = computeFinancialHealth(healthyFixture);
  const struggling = computeFinancialHealth(strugglingFixture);

  assert.equal(healthy.hasData, true);
  assert.equal(struggling.hasData, true);

  assert.ok(
    healthy.score >= 70,
    `expected a healthy profile to score >= 70, got ${healthy.score}`
  );
  assert.ok(
    struggling.score < 50,
    `expected a struggling profile to score < 50, got ${struggling.score}`
  );
  assert.ok(healthy.score > struggling.score);
});

test("every sub-score and display metric stays inside 0-100", () => {
  for (const fixture of [healthyFixture, strugglingFixture]) {
    const result = computeFinancialHealth(fixture);

    for (const [key, value] of Object.entries(result.subScores)) {
      assert.ok(Number.isInteger(value), `${key} should be an integer`);
      assert.ok(value >= 0 && value <= 100, `${key} out of range: ${value}`);
    }

    for (const metric of result.metrics) {
      assert.ok(Number.isInteger(metric.score), `${metric.key} not an integer`);
      assert.ok(
        metric.score >= 0 && metric.score <= 100,
        `${metric.key} out of range: ${metric.score}`
      );
    }

    assert.ok(Number.isInteger(result.score));
    assert.ok(result.score >= 0 && result.score <= 100);
  }
});

test("the four display metrics match the requested UI rows", () => {
  const result = computeFinancialHealth(healthyFixture);

  assert.deepEqual(
    result.metrics.map((metric) => metric.label),
    [
      "Income Stability",
      "Expense Control",
      "Savings Progress",
      "Spending Consistency",
    ]
  );
});

test("empty input returns a neutral score without NaN", () => {
  const result = computeFinancialHealth({
    incomes: [],
    expenses: [],
    recurringRows: [],
    baseCurrency: "BDT",
    now: NOW,
  });

  assert.equal(result.hasData, false);
  assert.equal(result.score, 50);
  assert.ok(result.insight.length > 0);

  for (const value of Object.values(result.subScores)) {
    assert.ok(Number.isFinite(value), "sub-score must not be NaN");
  }

  for (const metric of result.metrics) {
    assert.ok(Number.isFinite(metric.score), "metric must not be NaN");
  }
});

test("income without any expenses does not divide by zero", () => {
  const result = computeFinancialHealth({
    incomes: rows([50000, 50000, 50000]),
    expenses: [],
    recurringRows: [],
    baseCurrency: "BDT",
    now: NOW,
  });

  assert.equal(result.hasData, true);
  assert.ok(Number.isFinite(result.score));
  assert.equal(result.subScores.expenseToIncome, 100);
});

test("monthly buckets convert currency into the user's base currency", () => {
  const buckets = buildMonthlyBuckets({
    incomes: [{ amount: 100, currency: "USD", date: monthsAgo(0) }],
    expenses: [{ amount: 1200, currency: "BDT", date: monthsAgo(0) }],
    recurringRows: [],
    baseCurrency: "BDT",
    now: NOW,
    months: 6,
  });

  const current = buckets.at(-1);

  // 100 USD at the project's reference rate of 120 BDT
  assert.equal(current.income, 12000);
  assert.equal(current.expenses, 1200);
  assert.equal(current.net, 10800);
  assert.equal(buckets.length, 6);
});

test("subscription-sourced expenses are not counted twice", () => {
  const date = monthsAgo(0);

  const withoutDuplicate = buildMonthlyBuckets({
    incomes: [],
    expenses: [],
    recurringRows: [{ amount: 900, currency: "BDT", date }],
    baseCurrency: "BDT",
    now: NOW,
  });

  const withDuplicate = buildMonthlyBuckets({
    incomes: [],
    expenses: [
      { amount: 900, currency: "BDT", date, sourceType: "subscription" },
    ],
    recurringRows: [{ amount: 900, currency: "BDT", date }],
    baseCurrency: "BDT",
    now: NOW,
  });

  assert.equal(withoutDuplicate.at(-1).totalOut, 900);
  assert.equal(withDuplicate.at(-1).totalOut, 900);
});

test("an expense spike produces the expected insight phrasing", () => {
  const { insight } = buildInsights({
    current: { income: 100000, expenses: 59000, recurring: 0, totalOut: 59000 },
    previous: { income: 100000, expenses: 50000, recurring: 0, totalOut: 50000 },
    subScores: { recurringExpenses: 100 },
    emergencyFund: { saved: 0, target: 0, monthsCovered: 0, progress: 0 },
    unusual: { count: 0 },
    hasData: true,
  });

  assert.equal(
    insight,
    "Your expenses increased 18% this month, while income remained approximately stable."
  );
});

test("a spending drop reads as a decrease", () => {
  const { insight } = buildInsights({
    current: { income: 120000, expenses: 40000, recurring: 0, totalOut: 40000 },
    previous: { income: 100000, expenses: 50000, recurring: 0, totalOut: 50000 },
    subScores: { recurringExpenses: 100 },
    emergencyFund: { saved: 0, target: 0, monthsCovered: 0, progress: 0 },
    unusual: { count: 0 },
    hasData: true,
  });

  assert.equal(
    insight,
    "Your expenses decreased 20% this month, while income increased 20%."
  );
});

test("rising expenses only warn when income does not keep pace", () => {
  const base = {
    subScores: { recurringExpenses: 100 },
    emergencyFund: { saved: 0, target: 0, monthsCovered: 0, progress: 0 },
    unusual: { count: 0 },
    hasData: true,
  };

  const outpaced = buildInsights({
    ...base,
    current: { income: 100000, expenses: 70000, recurring: 0, totalOut: 70000 },
    previous: { income: 100000, expenses: 50000, recurring: 0, totalOut: 50000 },
  });

  const keptPace = buildInsights({
    ...base,
    current: { income: 150000, expenses: 55000, recurring: 0, totalOut: 55000 },
    previous: { income: 100000, expenses: 50000, recurring: 0, totalOut: 50000 },
  });

  assert.equal(outpaced.insights[0].tone, "warning");
  assert.equal(keptPace.insights[0].tone, "info");
});

test("unusually large transactions are flagged and lower the sub-score", () => {
  const steady = Array.from({ length: 10 }, () => ({
    amount: 1000,
    currency: "BDT",
    date: monthsAgo(1),
  }));

  const result = computeFinancialHealth({
    incomes: rows([100000, 100000]),
    expenses: [
      ...steady,
      { amount: 90000, currency: "BDT", date: monthsAgo(0) },
    ],
    recurringRows: [],
    baseCurrency: "BDT",
    now: NOW,
  });

  assert.equal(result.totals.unusualSpending.count, 1);
  assert.equal(result.subScores.unusualSpending, 80);
  assert.ok(
    result.insights.some((item) => item.id === "unusual-spending"),
    "expected an unusual-spending insight"
  );
});

test("the emergency fund targets three months of average spending", () => {
  const result = computeFinancialHealth({
    incomes: rows([100000, 100000, 100000]),
    expenses: rows([40000, 40000, 40000]),
    recurringRows: [],
    baseCurrency: "BDT",
    now: NOW,
  });

  const { emergencyFund } = result.totals;

  assert.equal(emergencyFund.target, 120000);
  assert.equal(emergencyFund.saved, 180000);
  assert.equal(emergencyFund.progress, 1);
  assert.equal(result.subScores.emergencySavings, 100);
});
