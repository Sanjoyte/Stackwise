import mongoose from "mongoose";

import {
  demoCashFlowSeries,
} from "../data/cashFlowDemoData.js";
import {
  getSubscriptionExpenseRows,
} from "./subscriptionExpenseService.js";

/* =========================================
   COLLECTION NAMES
   ========================================= */

const COLLECTION_NAMES = {
  users: "users",
  incomes: "incomes",
  expenses: "expenses",
};

/* =========================================
   TEMPORARY CURRENCY CONVERSION

   Same rate currently used elsewhere
   in the Stackwise project.

   Later this can be replaced by a
   real exchange-rate service.
   ========================================= */

const USD_TO_BDT = 120;

/* =========================================
   DEMO FALLBACK
   ========================================= */

const buildDemoResult = (period) => ({
  source: "demo",

  series:
    demoCashFlowSeries[period],

  meta: {
    subscriptionCount: 3,

    sourceMessage:
      "Demo data is being shown until Income and Expense data are available.",
  },
});

/* =========================================
   CHECK COLLECTION EXISTS
   ========================================= */

const collectionExists =
  async (collectionName) => {
    const database =
      mongoose.connection.db;

    if (!database) {
      return false;
    }

    const collections =
      await database
        .listCollections({
          name: collectionName,
        })
        .toArray();

    return collections.length > 0;
  };

/* =========================================
   GET DOCUMENTS BELONGING TO USER
   ========================================= */

const getUserDocuments =
  async (
    collectionName,
    userId
  ) => {
    const database =
      mongoose.connection.db;

    if (!database) {
      return [];
    }

    const exists =
      await collectionExists(
        collectionName
      );

    if (!exists) {
      return [];
    }

    const conditions = [
      {
        user: String(userId),
      },

      {
        userId:
          String(userId),
      },

      {
        owner: String(userId),
      },
    ];

    /*
     * Most MongoDB references are
     * stored as ObjectId.
     */
    if (
      mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      const objectId =
        new mongoose.Types.ObjectId(
          userId
        );

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
      .collection(
        collectionName
      )
      .find({
        $or: conditions,
      })
      .toArray();
  };

/* =========================================
   GET USER BASE CURRENCY
   ========================================= */

const getUserBaseCurrency =
  async (userId) => {
    const database =
      mongoose.connection.db;

    if (!database) {
      return "BDT";
    }

    try {
      let query = {
        _id: String(userId),
      };

      if (
        mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        query = {
          $or: [
            {
              _id:
                new mongoose.Types.ObjectId(
                  userId
                ),
            },

            {
              _id:
                String(userId),
            },
          ],
        };
      }

      const user =
        await database
          .collection(
            COLLECTION_NAMES.users
          )
          .findOne(query);

      return (
        String(
          user?.baseCurrency ||
            "BDT"
        ).toUpperCase()
      );
    } catch (error) {
      console.error(
        "Could not read user base currency:",
        error.message
      );

      return "BDT";
    }
  };

/* =========================================
   NORMAL MONEY AMOUNT

   Used for Income and Expense exactly
   as before.
   ========================================= */

const getAmount = (
  document
) => {
  const rawValue =
    document.amount ??
    document.total ??
    document.value ??
    document.cost ??
    document.price ??
    0;

  const amount =
    Number(rawValue);

  return Number.isFinite(
    amount
  )
    ? Math.abs(amount)
    : 0;
};

/* =========================================
   CURRENCY HELPERS
   ========================================= */

const normalizeCurrency = (
  currency,
  fallbackCurrency = "BDT"
) => {
  const value =
    String(
      currency ||
        fallbackCurrency
    )
      .trim()
      .toUpperCase();

  if (value === "৳") {
    return "BDT";
  }

  if (value === "$") {
    return "USD";
  }

  return value;
};

/* =========================================
   CONVERT MONEY INTO USER'S BASE CURRENCY
   ========================================= */

const convertCurrency = ({
  amount,
  fromCurrency,
  toCurrency,
}) => {
  const value =
    Number(amount);

  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  const from =
    normalizeCurrency(
      fromCurrency,
      toCurrency
    );

  const to =
    normalizeCurrency(
      toCurrency,
      "BDT"
    );

  /*
   * Same currency.
   */
  if (from === to) {
    return Math.abs(value);
  }

  /*
   * USD → BDT
   */
  if (
    from === "USD" &&
    to === "BDT"
  ) {
    return (
      Math.abs(value) *
      USD_TO_BDT
    );
  }

  /*
   * BDT → USD
   */
  if (
    from === "BDT" &&
    to === "USD"
  ) {
    return (
      Math.abs(value) /
      USD_TO_BDT
    );
  }

  /*
   * Unknown currency.
   *
   * We leave the numeric value unchanged
   * rather than failing the whole Cash Flow.
   */
  return Math.abs(value);
};

/* =========================================
   GET DOCUMENT DATE
   ========================================= */

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

  if (
    type === "subscription"
  ) {
    candidates = [
      document.startDate,
      document.subscriptionStartDate,
      document.billingDate,
      document.createdAt,
      document.renewalDate,
      document.nextRenewalDate,
    ];
  }

  const rawDate =
    candidates.find(Boolean);

  if (!rawDate) {
    return null;
  }

  const date =
    new Date(rawDate);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

/* =========================================
   MONTHLY BUCKETS

   Always creates Jan → Dec for the
   current year.
   ========================================= */

const createMonthlyBuckets =
  () => {
    const currentYear =
      new Date().getFullYear();

    return Array.from(
      {
        length: 12,
      },

      (_, monthIndex) => {
        const date =
          new Date(
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
                month:
                  "short",
              }
            ).format(date),

          totalIn: 0,

          expenses: 0,

          subscriptions: 0,
        };
      }
    );
  };

/* =========================================
   YEARLY BUCKETS

   Current year + previous four years.
   ========================================= */

const createYearlyBuckets =
  () => {
    const currentYear =
      new Date().getFullYear();

    return Array.from(
      {
        length: 5,
      },

      (_, index) => {
        const year =
          currentYear -
          4 +
          index;

        return {
          key: String(year),

          label:
            String(year),

          totalIn: 0,

          expenses: 0,

          subscriptions: 0,
        };
      }
    );
  };

/* =========================================
   GET BUCKET KEY
   ========================================= */

const getBucketKey = (
  date,
  period
) => {
  if (
    period === "yearly"
  ) {
    return String(
      date.getFullYear()
    );
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

/* =========================================
   ADD NORMAL DOCUMENTS TO BUCKETS

   Income and Expense continue using
   this function.
   ========================================= */

const addDocumentsToBuckets =
  ({
    documents,
    buckets,
    period,
    type,
    targetField,
    baseCurrency,
  }) => {
    documents.forEach(
      (document) => {
        const date =
          getDocumentDate(
            document,
            type
          );

        if (!date) {
          return;
        }

        const key =
          getBucketKey(
            date,
            period
          );

        const bucket =
          buckets.find(
            (item) =>
              item.key ===
              key
          );

        if (!bucket) {
          return;
        }

        const value =
          baseCurrency
            ? convertCurrency({
                amount: getAmount(document),
                fromCurrency:
                  document.currency ??
                  document.currencyCode ??
                  baseCurrency,
                toCurrency:
                  baseCurrency,
              })
            : getAmount(document);

        bucket[targetField] += value;
      }
    );
  };

/* =========================================
   ROUND BUCKET VALUES
   ========================================= */

const roundSeriesValues = (
  buckets
) => {
  return buckets.map(
    ({
      key,
      ...item
    }) => ({
      ...item,

      totalIn:
        Math.round(
          (item.totalIn +
            Number.EPSILON) *
            100
        ) / 100,

      expenses:
        Math.round(
          (item.expenses +
            Number.EPSILON) *
            100
        ) / 100,

      subscriptions:
        Math.round(
          (item.subscriptions +
            Number.EPSILON) *
            100
        ) / 100,
    })
  );
};

/* =========================================
   BUILD LIVE SERIES
   ========================================= */

const buildLiveSeries = ({
  incomes,
  expenses,
  subscriptions,
  period,
  baseCurrency,
}) => {
  const buckets =
    period === "yearly"
      ? createYearlyBuckets()
      : createMonthlyBuckets();

  /* Income */
  addDocumentsToBuckets({
    documents: incomes,

    buckets,

    period,

    type: "income",

    targetField:
      "totalIn",
  });

  /* Expenses */
  addDocumentsToBuckets({
    documents: expenses,

    buckets,

    period,

    type: "expense",

    targetField:
      "expenses",

    baseCurrency,
  });

  /*
   * Subscriptions are handled separately
   * because they are recurring and may
   * require currency conversion.
   */
  addDocumentsToBuckets({
    documents: subscriptions,
    buckets,
    period,
    type: "expense",
    targetField: "subscriptions",
    baseCurrency,
  });

  return roundSeriesValues(
    buckets
  );
};

/* =========================================
   MAIN CASH FLOW SOURCE
   ========================================= */

export const getCashFlowSourceData =
  async ({
    userId,
    period,
  }) => {
    /*
     * During parallel group development,
     * use safe demonstration data if
     * MongoDB is unavailable.
     */

    if (
      mongoose.connection
        .readyState !== 1
    ) {
      return buildDemoResult(
        period
      );
    }

    try {
      const [
        incomes,
        expenses,
        subscriptions,
        baseCurrency,
      ] =
        await Promise.all([
          getUserDocuments(
            COLLECTION_NAMES.incomes,
            userId
          ),

          getUserDocuments(
            COLLECTION_NAMES.expenses,
            userId
          ),

          getSubscriptionExpenseRows(
            userId
          ),

          getUserBaseCurrency(
            userId
          ),
        ]);

      /*
       * Require both Income and Expense
       * before switching to live mode.
       */
      const hasCompleteFinancialData =
        incomes.length >
          0 &&
        expenses.length >
          0;

      if (
        !hasCompleteFinancialData
      ) {
        return buildDemoResult(
          period
        );
      }

      const series =
        buildLiveSeries({
          incomes,

          expenses,

          subscriptions,

          period,

          baseCurrency,
        });

      return {
        source: "live",

        series,

        meta: {
          subscriptionCount:
            new Set(
              subscriptions.map(
                (item) => item.subscription
              )
            ).size,

          sourceMessage:
            "Cash Flow is calculated from your current Income, Expense and Subscription records.",
        },
      };
    } catch (error) {
      console.error(
        "Cash Flow data source error:",
        error.message
      );

      return buildDemoResult(
        period
      );
    }
  };
