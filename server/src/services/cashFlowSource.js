import mongoose from "mongoose";

import { demoCashFlowSeries } from "../data/cashFlowDemoData.js";

const COLLECTION_NAMES = {
  incomes: "incomes",
  expenses: "expenses",
  subscriptions: "subscriptions",
};

const buildDemoResult = (period) => ({
  source: "demo",

  series: demoCashFlowSeries[period],

  meta: {
    subscriptionCount: 3,

    sourceMessage:
      "Demo data is being shown until Income and Expense data are available.",
  },
});

const collectionExists = async (collectionName) => {
  const database = mongoose.connection.db;

  if (!database) {
    return false;
  }

  const collections = await database
    .listCollections({
      name: collectionName,
    })
    .toArray();

  return collections.length > 0;
};

const getUserDocuments = async (
  collectionName,
  userId
) => {
  const database = mongoose.connection.db;

  if (!database) {
    return [];
  }

  const exists =
    await collectionExists(collectionName);

  if (!exists) {
    return [];
  }

  const conditions = [
    {
      user: userId,
    },
    {
      userId,
    },
    {
      owner: userId,
    },
  ];

  if (
    mongoose.Types.ObjectId.isValid(userId)
  ) {
    const objectId =
      new mongoose.Types.ObjectId(userId);

    conditions.push(
      {
        user: objectId,
      },
      {
        userId: objectId,
      },
      {
        owner: objectId,
      }
    );
  }

  return database
    .collection(collectionName)
    .find({
      $or: conditions,
    })
    .toArray();
};

const getAmount = (document) => {
  const rawValue =
    document.amount ??
    document.total ??
    document.value ??
    document.cost ??
    document.price ??
    0;

  const amount = Number(rawValue);

  return Number.isFinite(amount)
    ? Math.abs(amount)
    : 0;
};

const getDocumentDate = (
  document,
  type
) => {
  let candidates = [];

  if (type === "income") {
    candidates = [
      document.date,
      document.incomeDate,
      document.receivedAt,
      document.paymentDate,
      document.createdAt,
    ];
  }

  if (type === "expense") {
    candidates = [
      document.date,
      document.expenseDate,
      document.paidAt,
      document.paymentDate,
      document.createdAt,
    ];
  }

  if (type === "subscription") {
    candidates = [
      document.renewalDate,
      document.nextRenewalDate,
      document.billingDate,
      document.startDate,
      document.createdAt,
    ];
  }

  const rawDate = candidates.find(Boolean);

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const createMonthlyBuckets = () => {
  const currentYear =
    new Date().getFullYear();

  return Array.from(
    {
      length: 12,
    },
    (_, monthIndex) => {
      const date = new Date(
        currentYear,
        monthIndex,
        1
      );

      return {
        key: `${currentYear}-${String(
          monthIndex + 1
        ).padStart(2, "0")}`,

        label:
          new Intl.DateTimeFormat(
            "en-US",
            {
              month: "short",
            }
          ).format(date),

        totalIn: 0,
        expenses: 0,
        subscriptions: 0,
      };
    }
  );
};

const createYearlyBuckets = () => {
  const currentYear =
    new Date().getFullYear();

  return Array.from(
    {
      length: 5,
    },
    (_, index) => {
      const year =
        currentYear - 4 + index;

      return {
        key: String(year),
        label: String(year),
        totalIn: 0,
        expenses: 0,
        subscriptions: 0,
      };
    }
  );
};

const getBucketKey = (
  date,
  period
) => {
  if (period === "yearly") {
    return String(date.getFullYear());
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const addDocumentsToBuckets = ({
  documents,
  buckets,
  period,
  type,
  targetField,
}) => {
  documents.forEach((document) => {
    const date = getDocumentDate(
      document,
      type
    );

    if (!date) {
      return;
    }

    const key = getBucketKey(
      date,
      period
    );

    const bucket = buckets.find(
      (item) => item.key === key
    );

    if (!bucket) {
      return;
    }

    bucket[targetField] +=
      getAmount(document);
  });
};

const buildLiveSeries = ({
  incomes,
  expenses,
  subscriptions,
  period,
}) => {
  const buckets =
    period === "yearly"
      ? createYearlyBuckets()
      : createMonthlyBuckets();

  addDocumentsToBuckets({
    documents: incomes,
    buckets,
    period,
    type: "income",
    targetField: "totalIn",
  });

  addDocumentsToBuckets({
    documents: expenses,
    buckets,
    period,
    type: "expense",
    targetField: "expenses",
  });

  addDocumentsToBuckets({
    documents: subscriptions,
    buckets,
    period,
    type: "subscription",
    targetField: "subscriptions",
  });

  return buckets.map(
    ({
      key,
      ...item
    }) => item
  );
};

export const getCashFlowSourceData =
  async ({
    userId,
    period,
  }) => {
    /*
     * During parallel group development,
     * fall back to safe demonstration data.
     *
     * Once Income and Expense collections
     * contain records for this user,
     * this service automatically begins
     * returning live data.
     */

    if (
      mongoose.connection.readyState !== 1
    ) {
      return buildDemoResult(period);
    }

    try {
      const [
        incomes,
        expenses,
        subscriptions,
      ] = await Promise.all([
        getUserDocuments(
          COLLECTION_NAMES.incomes,
          userId
        ),

        getUserDocuments(
          COLLECTION_NAMES.expenses,
          userId
        ),

        getUserDocuments(
          COLLECTION_NAMES.subscriptions,
          userId
        ),
      ]);

      /*
       * We require both Income and Expense
       * records before switching to live
       * dashboard calculations.
       *
       * This prevents a half-finished group
       * module from producing misleading
       * cash-flow values.
       */
      const hasCompleteFinancialData =
        incomes.length > 0 &&
        expenses.length > 0;

      if (!hasCompleteFinancialData) {
        return buildDemoResult(period);
      }

      const series =
        buildLiveSeries({
          incomes,
          expenses,
          subscriptions,
          period,
        });

      return {
        source: "live",

        series,

        meta: {
          subscriptionCount:
            subscriptions.length,

          sourceMessage:
            "Cash Flow is calculated from your current Income, Expense and Subscription records.",
        },
      };
    } catch (error) {
      console.error(
        "Cash Flow data source error:",
        error.message
      );

      return buildDemoResult(period);
    }
  };