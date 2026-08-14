import mongoose from "mongoose";

import {
  demoCashFlowSeries,
} from "../data/cashFlowDemoData.js";

/* =========================================
   COLLECTION NAMES
   ========================================= */

const COLLECTION_NAMES = {
  users: "users",
  incomes: "incomes",
  expenses: "expenses",
  subscriptions: "subscriptions",
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
   GET SUBSCRIPTION AMOUNT

   Unlike normal Expense/Income, this
   checks currency.
   ========================================= */

const getSubscriptionAmount = (
  subscription,
  baseCurrency
) => {
  const rawAmount =
    subscription.amount ??
    subscription.price ??
    subscription.cost ??
    subscription.total ??
    subscription.value ??
    0;

  const amount =
    Number(rawAmount);

  if (
    !Number.isFinite(amount)
  ) {
    return 0;
  }

  /*
   * IMPORTANT:
   *
   * If an older subscription document
   * does not have a currency field,
   * we assume it is already stored in
   * the user's base currency.
   */
  const subscriptionCurrency =
    subscription.currency ??
    subscription.currencyCode ??
    baseCurrency;

  return convertCurrency({
    amount,

    fromCurrency:
      subscriptionCurrency,

    toCurrency:
      baseCurrency,
  });
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
   SUBSCRIPTION END DATE
   ========================================= */

const getSubscriptionEndDate = (
  subscription
) => {
  const rawDate =
    subscription.cancelledAt ??
    subscription.canceledAt ??
    subscription.endDate ??
    subscription.expiredAt ??
    subscription.expiresAt ??
    null;

  if (!rawDate) {
    return null;
  }

  const date =
    new Date(rawDate);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
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

        bucket[
          targetField
        ] +=
          getAmount(document);
      }
    );
  };

/* =========================================
   NORMALIZE BILLING CYCLE
   ========================================= */

const getBillingCycle = (
  subscription
) => {
  const rawCycle =
    subscription.billingCycle ??
    subscription.billingFrequency ??
    subscription.frequency ??
    subscription.interval ??
    "once";

  const cycle =
    String(rawCycle)
      .trim()
      .toLowerCase();

  if (
    cycle === "monthly" ||
    cycle === "month"
  ) {
    return "monthly";
  }

  if (
    cycle === "yearly" ||
    cycle === "annual" ||
    cycle === "annually" ||
    cycle === "year"
  ) {
    return "yearly";
  }

  if (
    cycle === "weekly" ||
    cycle === "week"
  ) {
    return "weekly";
  }

  if (
    cycle === "quarterly" ||
    cycle === "quarter"
  ) {
    return "quarterly";
  }

  if (
    cycle ===
      "semi-annually" ||
    cycle ===
      "semiannual" ||
    cycle ===
      "half-yearly"
  ) {
    return "semiannual";
  }

  return "once";
};

/* =========================================
   ADD ONE BILLING INTERVAL
   ========================================= */

const moveToNextCharge = (
  currentDate,
  billingCycle
) => {
  const next =
    new Date(currentDate);

  switch (
    billingCycle
  ) {
    case "weekly":
      next.setDate(
        next.getDate() + 7
      );
      break;

    case "monthly":
      next.setMonth(
        next.getMonth() + 1
      );
      break;

    case "quarterly":
      next.setMonth(
        next.getMonth() + 3
      );
      break;

    case "semiannual":
      next.setMonth(
        next.getMonth() + 6
      );
      break;

    case "yearly":
      next.setFullYear(
        next.getFullYear() + 1
      );
      break;

    default:
      return null;
  }

  return next;
};

/* =========================================
   CHECK SUBSCRIPTION SHOULD BE SKIPPED
   ========================================= */

const shouldSkipSubscription = (
  subscription
) => {
  const status =
    String(
      subscription.status ??
        ""
    )
      .trim()
      .toLowerCase();

  /*
   * If the record is explicitly marked
   * inactive and has no historical
   * cancellation/end date, ignore it.
   */
  if (
    [
      "inactive",
      "deleted",
    ].includes(status)
  ) {
    return true;
  }

  return false;
};

/* =========================================
   GENERATE SUBSCRIPTION CHARGE DATES

   Example:

   Monthly subscription started:
   June 10

   Current date:
   August 9

   Charges:
   June 10
   July 10

   August 10 is still future,
   therefore it is NOT counted yet.

   If it started August 6 and today is
   August 9, August 6 is counted.
   ========================================= */

const generateSubscriptionChargeDates =
  (
    subscription,
    now
  ) => {
    const startDate =
      getDocumentDate(
        subscription,
        "subscription"
      );

    if (!startDate) {
      return [];
    }

    const endDate =
      getSubscriptionEndDate(
        subscription
      );

    const effectiveEnd =
      endDate &&
      endDate < now
        ? endDate
        : now;

    if (
      startDate >
      effectiveEnd
    ) {
      return [];
    }

    const billingCycle =
      getBillingCycle(
        subscription
      );

    /*
     * No recurring cycle:
     * count only once.
     */
    if (
      billingCycle ===
      "once"
    ) {
      return [
        startDate,
      ];
    }

    const chargeDates =
      [];

    let currentCharge =
      new Date(
        startDate
      );

    /*
     * Safety guard:
     * prevents accidental infinite loops
     * from malformed data.
     */
    let iterations = 0;

    const MAX_ITERATIONS =
      1000;

    while (
      currentCharge <=
        effectiveEnd &&
      iterations <
        MAX_ITERATIONS
    ) {
      chargeDates.push(
        new Date(
          currentCharge
        )
      );

      const nextCharge =
        moveToNextCharge(
          currentCharge,
          billingCycle
        );

      if (!nextCharge) {
        break;
      }

      currentCharge =
        nextCharge;

      iterations += 1;
    }

    return chargeDates;
  };

/* =========================================
   ADD SUBSCRIPTIONS TO BUCKETS

   Dedicated recurring subscription
   calculation.
   ========================================= */

const addSubscriptionsToBuckets =
  ({
    subscriptions,
    buckets,
    period,
    baseCurrency,
  }) => {
    const now =
      new Date();

    subscriptions.forEach(
      (subscription) => {
        if (
          shouldSkipSubscription(
            subscription
          )
        ) {
          return;
        }

        const amount =
          getSubscriptionAmount(
            subscription,
            baseCurrency
          );

        if (amount <= 0) {
          return;
        }

        const chargeDates =
          generateSubscriptionChargeDates(
            subscription,
            now
          );

        chargeDates.forEach(
          (chargeDate) => {
            const key =
              getBucketKey(
                chargeDate,
                period
              );

            const bucket =
              buckets.find(
                (item) =>
                  item.key ===
                  key
              );

            /*
             * Example:
             * Monthly mode only has
             * current-year buckets.
             *
             * Old charges therefore
             * simply won't match.
             */
            if (!bucket) {
              return;
            }

            bucket.subscriptions +=
              amount;
          }
        );
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
  });

  /*
   * Subscriptions are handled separately
   * because they are recurring and may
   * require currency conversion.
   */
  addSubscriptionsToBuckets({
    subscriptions,

    buckets,

    period,

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

          getUserDocuments(
            COLLECTION_NAMES.subscriptions,
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

      return buildDemoResult(
        period
      );
    }
  };