import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import { convertCurrency, roundMoney } from "../utils/expenseUtils.js";
import { getSubscriptionExpenseRows } from "./subscriptionExpenseService.js";

/* =========================================
   FINANCIAL HEALTH SCORE

   Rolls the user's Income, Expense and
   Subscription history into a single
   0-100 score built from seven weighted
   metrics, plus month-over-month insights.
   ========================================= */

const MONTHS_IN_WINDOW = 6;

const EMERGENCY_FUND_MONTHS = 3;

/* A month-over-month move smaller than this
   reads as "approximately stable". */
const STABLE_CHANGE_THRESHOLD = 5;

/* Used when there is too little history for a
   metric to mean anything - we neither reward
   nor punish the user for being new. */
const NEUTRAL_SCORE = 60;

/* Fewest transactions before outlier detection
   is worth trusting. */
const MIN_SAMPLE_FOR_OUTLIERS = 8;

export const METRIC_WEIGHTS = Object.freeze({
  incomeConsistency: 20,
  expenseToIncome: 20,
  monthlySavings: 20,
  recurringExpenses: 10,
  spendingVolatility: 15,
  emergencySavings: 10,
  unusualSpending: 5,
});

const GRADE_BANDS = [
  { min: 85, grade: "Excellent" },
  { min: 70, grade: "Good" },
  { min: 50, grade: "Fair" },
  { min: 0, grade: "Needs attention" },
];

/* =========================================
   NUMERIC HELPERS
   ========================================= */

const clampScore = (value) => {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
};

const average = (numbers) =>
  numbers.length
    ? numbers.reduce((sum, value) => sum + Number(value || 0), 0) /
      numbers.length
    : 0;

const standardDeviation = (numbers) => {
  if (numbers.length < 2) return 0;

  const mean = average(numbers);

  return Math.sqrt(average(numbers.map((value) => (value - mean) ** 2)));
};

/*
 * Lower input is better: `best` scores 100,
 * `worst` scores 0, linear in between.
 */
const fallingScore = (value, best, worst) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= best) return 100;
  if (value >= worst) return 0;

  return clampScore(((worst - value) / (worst - best)) * 100);
};

/*
 * Higher input is better: `best` scores 100,
 * `worst` scores 0, linear in between.
 */
const risingScore = (value, worst, best) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= worst) return 0;
  if (value >= best) return 100;

  return clampScore(((value - worst) / (best - worst)) * 100);
};

/*
 * Coefficient of variation turned into a score.
 * Mirrors calculateStability() in cashFlowService.js
 * so both features rate steadiness the same way.
 */
const consistencyScore = (values) => {
  const meaningful = values.filter((value) => value > 0);

  if (meaningful.length < 2) return NEUTRAL_SCORE;

  const mean = average(meaningful);

  if (mean <= 0) return 0;

  const relativeVariation = standardDeviation(meaningful) / mean;

  return clampScore(100 - Math.min(relativeVariation * 100, 80));
};

const percentChange = (previous, current) => {
  if (!Number.isFinite(previous) || previous <= 0) return null;

  return ((current - previous) / previous) * 100;
};

/* =========================================
   ROW NORMALIZATION
   ========================================= */

const monthKeyOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const toBaseAmount = (row, baseCurrency) =>
  convertCurrency({
    amount: row.amount,
    fromCurrency: row.currency,
    toCurrency: baseCurrency,
  });

/*
 * Expenses materialized from a subscription are
 * already produced by getSubscriptionExpenseRows,
 * so counting the stored copy too would double
 * the user's recurring spend.
 */
const isMaterializedSubscription = (expense) =>
  expense.sourceType === "subscription";

const normalizeRows = (rows, baseCurrency) =>
  rows
    .map((row) => ({
      date: toDate(row.date ?? row.createdAt),
      amount: toBaseAmount(row, baseCurrency),
    }))
    .filter((row) => row.date && Number.isFinite(row.amount) && row.amount > 0);

/* =========================================
   MONTHLY WINDOW
   ========================================= */

export const buildMonthlyBuckets = ({
  incomes = [],
  expenses = [],
  recurringRows = [],
  baseCurrency = "BDT",
  now = new Date(),
  months = MONTHS_IN_WINDOW,
}) => {
  const buckets = [];
  const byKey = new Map();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);

    const bucket = {
      key: monthKeyOf(start),
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(start),
      income: 0,
      expenses: 0,
      recurring: 0,
    };

    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  const add = (rows, field) => {
    rows.forEach((row) => {
      const bucket = byKey.get(monthKeyOf(row.date));

      if (bucket) bucket[field] += row.amount;
    });
  };

  add(normalizeRows(incomes, baseCurrency), "income");
  add(
    normalizeRows(expenses.filter((e) => !isMaterializedSubscription(e)), baseCurrency),
    "expenses"
  );
  add(normalizeRows(recurringRows, baseCurrency), "recurring");

  return buckets.map((bucket) => ({
    ...bucket,
    income: roundMoney(bucket.income),
    expenses: roundMoney(bucket.expenses),
    recurring: roundMoney(bucket.recurring),
    totalOut: roundMoney(bucket.expenses + bucket.recurring),
    net: roundMoney(bucket.income - bucket.expenses - bucket.recurring),
  }));
};

/* =========================================
   UNUSUAL SPENDING

   A current-month transaction is "unusual"
   when it sits more than two standard
   deviations above the trailing average.
   ========================================= */

const findUnusualSpending = ({ expenses, baseCurrency, now, months }) => {
  const windowStart = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const currentMonthKey = monthKeyOf(now);

  const rows = normalizeRows(
    expenses.filter((expense) => !isMaterializedSubscription(expense)),
    baseCurrency
  ).filter((row) => row.date >= windowStart);

  /* A two-sigma cut on a tiny sample flags ordinary
     variation, so require a real history first. */
  if (rows.length < MIN_SAMPLE_FOR_OUTLIERS) {
    return { count: 0, threshold: 0, largest: 0 };
  }

  const amounts = rows.map((row) => row.amount);
  const threshold = average(amounts) + 2 * standardDeviation(amounts);

  const flagged = rows.filter(
    (row) => monthKeyOf(row.date) === currentMonthKey && row.amount > threshold
  );

  return {
    count: flagged.length,
    threshold: roundMoney(threshold),
    largest: roundMoney(Math.max(0, ...flagged.map((row) => row.amount))),
  };
};

/* =========================================
   INSIGHTS
   ========================================= */

const describeChange = (change) => {
  if (change === null) return null;

  if (Math.abs(change) < STABLE_CHANGE_THRESHOLD) {
    return "remained approximately stable";
  }

  return `${change > 0 ? "increased" : "decreased"} ${Math.abs(
    Math.round(change)
  )}%`;
};

export const buildInsights = ({
  current,
  previous,
  subScores,
  emergencyFund,
  unusual,
  hasData,
}) => {
  if (!hasData) {
    return {
      insight:
        "Add a few income and expense records so Stackwise can measure your financial health.",
      insights: [
        {
          id: "no-data",
          tone: "info",
          message:
            "Your score stays neutral until there is enough history to analyze.",
        },
      ],
    };
  }

  const expenseChange = percentChange(previous.totalOut, current.totalOut);
  const incomeChange = percentChange(previous.income, current.income);

  const expensePhrase = describeChange(expenseChange);
  const incomePhrase = describeChange(incomeChange);

  let primary;

  if (expensePhrase && incomePhrase) {
    primary = `Your expenses ${expensePhrase} this month, while income ${incomePhrase}.`;
  } else if (expensePhrase) {
    primary = `Your expenses ${expensePhrase} this month.`;
  } else if (incomePhrase) {
    primary = `Your income ${incomePhrase} this month.`;
  } else {
    primary =
      "This is your first month with recorded activity, so there is nothing to compare it against yet.";
  }

  /* Rising expenses only matter when income did not
     rise with them - otherwise the month is fine. */
  const expensesOutpacingIncome =
    expenseChange !== null &&
    expenseChange >= STABLE_CHANGE_THRESHOLD &&
    (incomeChange === null || expenseChange > incomeChange);

  const insights = [
    {
      id: "month-over-month",
      tone: expensesOutpacingIncome ? "warning" : "info",
      message: primary,
    },
  ];

  const savingsRate =
    current.income > 0
      ? ((current.income - current.totalOut) / current.income) * 100
      : null;

  if (savingsRate !== null) {
    insights.push(
      savingsRate >= 20
        ? {
            id: "savings-rate",
            tone: "positive",
            message: `You kept ${Math.round(
              savingsRate
            )}% of this month's income, which is a healthy savings rate.`,
          }
        : {
            id: "savings-rate",
            tone: savingsRate < 0 ? "warning" : "info",
            message:
              savingsRate < 0
                ? "You spent more than you earned this month, so your savings went backwards."
                : `You kept ${Math.round(
                    savingsRate
                  )}% of this month's income. Aiming for 20% would lift your score.`,
          }
    );
  }

  if (current.recurring > 0 && subScores.recurringExpenses < 70) {
    insights.push({
      id: "recurring-load",
      tone: "warning",
      message:
        "Recurring subscriptions take up a large share of your income. Reviewing them is the fastest way to raise this score.",
    });
  }

  if (emergencyFund.target > 0) {
    insights.push({
      id: "emergency-fund",
      tone: emergencyFund.monthsCovered >= EMERGENCY_FUND_MONTHS ? "positive" : "info",
      message: `Your savings cover about ${emergencyFund.monthsCovered.toFixed(
        1
      )} month(s) of spending, against a ${EMERGENCY_FUND_MONTHS}-month target.`,
    });
  }

  if (unusual.count > 0) {
    insights.push({
      id: "unusual-spending",
      tone: "warning",
      message: `${unusual.count} unusually large transaction${
        unusual.count === 1 ? "" : "s"
      } stood out this month compared with your recent history.`,
    });
  }

  return { insight: primary, insights };
};

/* =========================================
   SCORE COMPOSITION
   ========================================= */

const gradeFor = (score) =>
  GRADE_BANDS.find((band) => score >= band.min)?.grade ?? "Needs attention";

const weightedBlend = (parts) => {
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);

  if (!totalWeight) return 0;

  return clampScore(
    parts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight
  );
};

const buildDisplayMetrics = (subScores) => [
  {
    key: "incomeStability",
    label: "Income Stability",
    score: subScores.incomeConsistency,
    detail: "How evenly your income arrives month to month.",
  },
  {
    key: "expenseControl",
    label: "Expense Control",
    score: weightedBlend([
      { score: subScores.expenseToIncome, weight: METRIC_WEIGHTS.expenseToIncome },
      {
        score: subScores.recurringExpenses,
        weight: METRIC_WEIGHTS.recurringExpenses,
      },
    ]),
    detail: "What share of your income goes out as spending and subscriptions.",
  },
  {
    key: "savingsProgress",
    label: "Savings Progress",
    score: weightedBlend([
      { score: subScores.monthlySavings, weight: METRIC_WEIGHTS.monthlySavings },
      {
        score: subScores.emergencySavings,
        weight: METRIC_WEIGHTS.emergencySavings,
      },
    ]),
    detail: "Your monthly savings rate and emergency fund progress.",
  },
  {
    key: "spendingConsistency",
    label: "Spending Consistency",
    score: weightedBlend([
      {
        score: subScores.spendingVolatility,
        weight: METRIC_WEIGHTS.spendingVolatility,
      },
      { score: subScores.unusualSpending, weight: METRIC_WEIGHTS.unusualSpending },
    ]),
    detail: "How predictable your spending is, and whether anything spiked.",
  },
];

const emptyMonth = { income: 0, expenses: 0, recurring: 0, totalOut: 0, net: 0 };

/*
 * Pure entry point - takes already-loaded rows so
 * it can be unit tested without a database.
 */
export const computeFinancialHealth = ({
  incomes = [],
  expenses = [],
  recurringRows = [],
  baseCurrency = "BDT",
  now = new Date(),
  months = MONTHS_IN_WINDOW,
}) => {
  const buckets = buildMonthlyBuckets({
    incomes,
    expenses,
    recurringRows,
    baseCurrency,
    now,
    months,
  });

  const current = buckets.at(-1) ?? emptyMonth;
  const previous = buckets.at(-2) ?? emptyMonth;

  const windowIncome = buckets.reduce((sum, month) => sum + month.income, 0);
  const windowOut = buckets.reduce((sum, month) => sum + month.totalOut, 0);
  const windowRecurring = buckets.reduce((sum, month) => sum + month.recurring, 0);

  const activeMonths = buckets.filter(
    (month) => month.income > 0 || month.totalOut > 0
  );

  const hasData = activeMonths.length > 0 && (windowIncome > 0 || windowOut > 0);

  /* All-time totals drive the emergency fund, which is
     about accumulated savings rather than this window. */
  const allTimeIncome = normalizeRows(incomes, baseCurrency).reduce(
    (sum, row) => sum + row.amount,
    0
  );

  const allTimeOut = [
    ...normalizeRows(
      expenses.filter((expense) => !isMaterializedSubscription(expense)),
      baseCurrency
    ),
    ...normalizeRows(recurringRows, baseCurrency),
  ].reduce((sum, row) => sum + row.amount, 0);

  const averageMonthlyOut = activeMonths.length
    ? windowOut / activeMonths.length
    : 0;

  const saved = Math.max(0, allTimeIncome - allTimeOut);
  const target = roundMoney(averageMonthlyOut * EMERGENCY_FUND_MONTHS);

  const emergencyFund = {
    saved: roundMoney(saved),
    target,
    monthsCovered: averageMonthlyOut > 0 ? saved / averageMonthlyOut : 0,
    progress: target > 0 ? Math.min(1, saved / target) : 0,
  };

  const unusual = findUnusualSpending({ expenses, baseCurrency, now, months });

  if (!hasData) {
    const { insight, insights } = buildInsights({
      current,
      previous,
      subScores: {},
      emergencyFund,
      unusual,
      hasData: false,
    });

    const subScores = Object.fromEntries(
      Object.keys(METRIC_WEIGHTS).map((key) => [key, 50])
    );

    return {
      currency: baseCurrency,
      score: 50,
      grade: gradeFor(50),
      hasData: false,
      metrics: buildDisplayMetrics(subScores),
      subScores,
      insight,
      insights,
      totals: {
        currentMonth: current,
        previousMonth: previous,
        window: { income: 0, totalOut: 0, recurring: 0, months: months },
        emergencyFund,
        unusualSpending: unusual,
      },
      monthlySeries: buckets,
      generatedAt: new Date().toISOString(),
    };
  }

  const savingsRates = activeMonths
    .filter((month) => month.income > 0)
    .map((month) => (month.income - month.totalOut) / month.income);

  const subScores = {
    incomeConsistency: consistencyScore(buckets.map((month) => month.income)),

    expenseToIncome:
      windowIncome > 0
        ? fallingScore(windowOut / windowIncome, 0.5, 1)
        : 0,

    monthlySavings: savingsRates.length
      ? risingScore(average(savingsRates), 0, 0.2)
      : 0,

    recurringExpenses:
      windowIncome > 0
        ? fallingScore(windowRecurring / windowIncome, 0.1, 0.4)
        : windowRecurring > 0
          ? 0
          : NEUTRAL_SCORE,

    spendingVolatility: consistencyScore(buckets.map((month) => month.totalOut)),

    emergencySavings:
      emergencyFund.target > 0
        ? risingScore(emergencyFund.progress, 0, 1)
        : NEUTRAL_SCORE,

    unusualSpending: clampScore(100 - Math.min(unusual.count * 20, 100)),
  };

  const score = clampScore(
    Object.entries(METRIC_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + subScores[key] * weight,
      0
    ) / 100
  );

  const { insight, insights } = buildInsights({
    current,
    previous,
    subScores,
    emergencyFund,
    unusual,
    hasData: true,
  });

  return {
    currency: baseCurrency,
    score,
    grade: gradeFor(score),
    hasData: true,
    metrics: buildDisplayMetrics(subScores),
    subScores,
    insight,
    insights,
    totals: {
      currentMonth: current,
      previousMonth: previous,
      window: {
        income: roundMoney(windowIncome),
        totalOut: roundMoney(windowOut),
        recurring: roundMoney(windowRecurring),
        months: activeMonths.length,
      },
      emergencyFund,
      unusualSpending: unusual,
    },
    monthlySeries: buckets,
    generatedAt: new Date().toISOString(),
  };
};

/* =========================================
   DATABASE ENTRY POINT
   ========================================= */

export const getFinancialHealthReport = async ({
  userId,
  baseCurrency = "BDT",
  now = new Date(),
}) => {
  const [incomes, expenses, recurringRows] = await Promise.all([
    Income.find({ user: userId }).lean(),
    Expense.find({ user: userId }).lean(),
    getSubscriptionExpenseRows(userId),
  ]);

  return computeFinancialHealth({
    incomes,
    expenses,
    recurringRows,
    baseCurrency,
    now,
  });
};
