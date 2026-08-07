import {
  getCashFlowSourceData,
} from "./cashFlowSource.js";

const roundMoney = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) *
      100
  ) / 100;

const sumBy = (
  items,
  key
) =>
  items.reduce(
    (total, item) =>
      total + Number(item[key] || 0),
    0
  );

const enrichSeries = (series) =>
  series.map((item) => {
    const totalIn =
      Number(item.totalIn || 0);

    const expenses =
      Number(item.expenses || 0);

    const subscriptions =
      Number(
        item.subscriptions || 0
      );

    const totalOut =
      expenses + subscriptions;

    const netCashFlow =
      totalIn - totalOut;

    return {
      label: item.label,

      totalIn:
        roundMoney(totalIn),

      expenses:
        roundMoney(expenses),

      subscriptions:
        roundMoney(subscriptions),

      totalOut:
        roundMoney(totalOut),

      netCashFlow:
        roundMoney(netCashFlow),
    };
  });

const buildSummary = (series) => {
  const totalIn =
    sumBy(series, "totalIn");

  const expenses =
    sumBy(series, "expenses");

  const subscriptions =
    sumBy(
      series,
      "subscriptions"
    );

  const totalOut =
    expenses + subscriptions;

  return {
    totalIn:
      roundMoney(totalIn),

    expenses:
      roundMoney(expenses),

    subscriptions:
      roundMoney(subscriptions),

    totalOut:
      roundMoney(totalOut),

    netCashFlow:
      roundMoney(
        totalIn - totalOut
      ),
  };
};

const average = (numbers) => {
  if (!numbers.length) {
    return 0;
  }

  return (
    numbers.reduce(
      (sum, value) =>
        sum + Number(value || 0),
      0
    ) / numbers.length
  );
};

const calculateStability = (
  series
) => {
  const values = series
    .map(
      (item) =>
        Number(
          item.netCashFlow || 0
        )
    )
    .filter(
      (value) => value !== 0
    );

  if (values.length < 2) {
    return 70;
  }

  const mean =
    average(values);

  const variance =
    average(
      values.map(
        (value) =>
          Math.pow(
            value - mean,
            2
          )
      )
    );

  const deviation =
    Math.sqrt(variance);

  const relativeVariation =
    Math.abs(mean) > 0
      ? deviation /
        Math.abs(mean)
      : 1;

  const score =
    100 -
    Math.min(
      relativeVariation * 100,
      80
    );

  return Math.max(
    20,
    Math.min(
      95,
      Math.round(score)
    )
  );
};

const getFutureLabels = (
  period,
  count
) => {
  const now = new Date();

  if (period === "yearly") {
    const currentYear =
      now.getFullYear();

    return Array.from(
      {
        length: count,
      },
      (_, index) =>
        String(
          currentYear + index + 1
        )
    );
  }

  return Array.from(
    {
      length: count,
    },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() +
          index +
          1,
        1
      );

      return new Intl.DateTimeFormat(
        "en-US",
        {
          month: "short",
        }
      ).format(date);
    }
  );
};

const buildDemoForecast = (
  period
) => {
  if (period === "yearly") {
    return {
      status: "stable",

      title:
        "Cash Flow Outlook",

      projectedBalance: 8400,

      horizonLabel:
        "next year",

      description:
        "Your current income trend is expected to remain above recurring costs.",

      stability: 78,

      points: [
        {
          label: "Now",
          balance: 12450,
        },
        {
          label: "2027",
          balance: 15100,
        },
        {
          label: "2028",
          balance: 16400,
        },
        {
          label: "2029",
          balance: 17500,
        },
        {
          label: "2030",
          balance: 18400,
        },
      ],
    };
  }

  const future =
    getFutureLabels(
      "monthly",
      5
    );

  return {
    status: "warning",

    title:
      "Cash Flow Warning",

    projectedBalance: -1240,

    horizonLabel:
      future[future.length - 1],

    description:
      "Projected net balance may drop because of cumulative subscription renewals.",

    stability: 42,

    points: [
      {
        label: "Now",
        balance: 1800,
      },
      {
        label: future[0],
        balance: 1200,
      },
      {
        label: future[1],
        balance: 1450,
      },
      {
        label: future[2],
        balance: 620,
      },
      {
        label: future[3],
        balance: 150,
      },
      {
        label: future[4],
        balance: -1240,
      },
    ],
  };
};

const buildLiveForecast = ({
  series,
  period,
}) => {
  const meaningfulSeries =
    series.filter(
      (item) =>
        item.totalIn !== 0 ||
        item.totalOut !== 0
    );

  const recent =
    meaningfulSeries.slice(-3);

  const averageNet =
    average(
      recent.map(
        (item) =>
          item.netCashFlow
      )
    );

  const averageSubscriptions =
    average(
      recent.map(
        (item) =>
          item.subscriptions
      )
    );

  let runningBalance =
    recent.at(-1)
      ?.netCashFlow || 0;

  const futureLabels =
    getFutureLabels(
      period,
      period === "yearly"
        ? 4
        : 5
    );

  const points = [
    {
      label: "Now",
      balance:
        roundMoney(
          runningBalance
        ),
    },
  ];

  futureLabels.forEach(
    (label, index) => {
      const renewalPressure =
        averageSubscriptions *
        (1 + index * 0.04);

      runningBalance =
        runningBalance +
        averageNet -
        renewalPressure;

      points.push({
        label,

        balance:
          roundMoney(
            runningBalance
          ),
      });
    }
  );

  const projectedBalance =
    points.at(-1)
      ?.balance || 0;

  const stability =
    calculateStability(series);

  return {
    status:
      projectedBalance < 0
        ? "warning"
        : "stable",

    title:
      projectedBalance < 0
        ? "Cash Flow Warning"
        : "Cash Flow Outlook",

    projectedBalance,

    horizonLabel:
      points.at(-1)?.label,

    description:
      projectedBalance < 0
        ? "Based on your recent cash flow and recurring subscription costs, your projected balance may become negative."
        : "Based on your recent cash flow, your projected balance is expected to remain positive.",

    stability,

    points,
  };
};

const buildInsight = ({
  source,
  period,
  summary,
  meta,
}) => {
  if (source === "demo") {
    if (
      period === "yearly"
    ) {
      return {
        status: "optimized",

        badge: "OPTIMIZED",

        amountSaved: 1488,

        description:
          "You could save approximately 1,488 this year by optimizing recurring subscription billing.",
      };
    }

    return {
      status: "optimized",

      badge: "OPTIMIZED",

      amountSaved: 124,

      description:
        "You saved 124 this month by switching three subscriptions to annual billing.",
    };
  }

  const subscriptionCount =
    Number(
      meta.subscriptionCount || 0
    );

  const estimatedSavings =
    roundMoney(
      summary.subscriptions *
        0.08
    );

  if (
    subscriptionCount === 0
  ) {
    return {
      status: "info",

      badge: "INSIGHT",

      amountSaved: 0,

      description:
        "Add subscription records to receive subscription optimization insights.",
    };
  }

  return {
    status: "optimized",

    badge: "OPTIMIZED",

    amountSaved:
      estimatedSavings,

    description:
      `Reviewing ${subscriptionCount} recurring subscription${
        subscriptionCount === 1
          ? ""
          : "s"
      } could reduce your current subscription outflow.`,
  };
};

export const getCashFlowDashboard =
  async ({
    userId,
    currency,
    period,
  }) => {
    const sourceData =
      await getCashFlowSourceData({
        userId,
        period,
      });

    const series =
      enrichSeries(
        sourceData.series
      );

    const summary =
      buildSummary(series);

    const forecast =
      sourceData.source ===
      "demo"
        ? buildDemoForecast(
            period
          )
        : buildLiveForecast({
            series,
            period,
          });

    const insight =
      buildInsight({
        source:
          sourceData.source,

        period,

        summary,

        meta:
          sourceData.meta,
      });

    return {
      period,

      currency:
        currency || "USD",

      source:
        sourceData.source,

      sourceMessage:
        sourceData.meta
          ?.sourceMessage,

      summary,

      chartData: series,

      forecast,

      insight,

      generatedAt:
        new Date().toISOString(),
    };
  };