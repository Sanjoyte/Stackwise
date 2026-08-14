import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

/* =========================================
   MONTH LABELS
   ========================================= */

const FULL_MONTH_NAMES = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};

const getCurrentPeriodLabel = (period) => {
  const now = new Date();

  if (period === "yearly") {
    return String(now.getFullYear());
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
    }
  ).format(now);
};

const getReadablePeriodLabel = (
  label,
  period
) => {
  if (!label) {
    return "";
  }

  if (period === "yearly") {
    return String(label);
  }

  return FULL_MONTH_NAMES[label] || label;
};

/* =========================================
   NUMBER HELPERS
   ========================================= */

const getAxisMaximum = (chartData) => {
  if (!chartData?.length) {
    return 1000;
  }

  const maximumValue = Math.max(
    ...chartData.flatMap((item) => [
      Number(item.totalIn || 0),
      Number(item.totalOut || 0),
      Number(item.netCashFlow || 0),
    ])
  );

  if (maximumValue <= 0) {
    return 1000;
  }

  /*
   * Gives us a nice rounded chart maximum.
   *
   * Example:
   * 4700 -> 6000
   * 68200 -> 80000
   */
  const magnitude = Math.pow(
    10,
    Math.floor(
      Math.log10(maximumValue)
    )
  );

  const normalized =
    maximumValue / magnitude;

  let rounded;

  if (normalized <= 2) {
    rounded = 2;
  } else if (normalized <= 4) {
    rounded = 4;
  } else if (normalized <= 6) {
    rounded = 6;
  } else if (normalized <= 8) {
    rounded = 8;
  } else {
    rounded = 10;
  }

  return rounded * magnitude;
};

const createAxisTicks = (maximum) => {
  return [
    0,
    maximum * 0.25,
    maximum * 0.5,
    maximum * 0.75,
    maximum,
  ];
};

const compactNumber = (value) => {
  return Intl.NumberFormat(
    "en-US",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(value);
};

/* =========================================
   SELECTED X AXIS TICK
   ========================================= */

function PeriodTick({
  x,
  y,
  payload,
  selectedLabel,
}) {
  const isSelected =
    String(payload?.value) ===
    String(selectedLabel);

  return (
    <g
      transform={`translate(${x}, ${y})`}
    >
      {isSelected && (
        <rect
          x={-32}
          y={5}
          width={64}
          height={28}
          rx={9}
          className="cf-selected-tick-background"
        />
      )}

      <text
        x={0}
        y={23}
        textAnchor="middle"
        className={
          isSelected
            ? "cf-chart-tick cf-chart-tick-selected"
            : "cf-chart-tick"
        }
      >
        {payload?.value}
      </text>
    </g>
  );
}

/* =========================================
   TOOLTIP
   ========================================= */

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  period,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div className="cf-chart-tooltip">
      <p className="cf-chart-tooltip-label">
        {getReadablePeriodLabel(
          label,
          period
        )}
      </p>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="cf-tooltip-row"
        >
          <span
            className="cf-tooltip-dot"
            style={{
              background:
                item.color,
            }}
          />

          <span>
            {item.name}
          </span>

          <strong>
            {formatCurrency(
              item.value,
              currency
            )}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* =========================================
   SUMMARY CARD
   ========================================= */

function SummaryCard({
  type,
  title,
  value,
  currency,
}) {
  const configurations = {
    income: {
      icon: ArrowDownLeft,
      className:
        "cf-summary-income",
    },

    outflow: {
      icon: ArrowUpRight,
      className:
        "cf-summary-outflow",
    },

    net: {
      icon: Wallet,
      className:
        "cf-summary-net",
    },
  };

  const configuration =
    configurations[type];

  const Icon =
    configuration.icon;

  return (
    <article
      className={`cf-summary-card ${configuration.className}`}
    >
      <div className="cf-summary-card-top">
        <span className="cf-summary-icon">
          <Icon size={18} />
        </span>

        <span className="cf-summary-title">
          {title}
        </span>
      </div>

      <strong className="cf-summary-value">
        {formatCurrency(
          value,
          currency
        )}
      </strong>
    </article>
  );
}

/* =========================================
   FIXED LEGEND
   ========================================= */

function CashFlowLegend() {
  return (
    <div className="cf-fixed-legend">
      <div className="cf-fixed-legend-item">
        <span className="cf-legend-box cf-legend-net" />

        <span>
          Net Cash Flow
        </span>
      </div>

      <div className="cf-fixed-legend-item">
        <span className="cf-legend-box cf-legend-income" />

        <span>
          Total In
        </span>
      </div>

      <div className="cf-fixed-legend-item">
        <span className="cf-legend-box cf-legend-out" />

        <span>
          Total Out
        </span>
      </div>
    </div>
  );
}

/* =========================================
   FIXED Y AXIS
   ========================================= */

function FixedYAxis({
  maximum,
  ticks,
}) {
  return (
    <div className="cf-fixed-y-axis">
      {ticks
        .slice()
        .reverse()
        .map((tick) => (
          <span
            key={tick}
            className="cf-fixed-y-tick"
          >
            {compactNumber(tick)}
          </span>
        ))}
    </div>
  );
}

/* =========================================
   CASH FLOW OVERVIEW
   ========================================= */

export default function CashFlowOverview({
  data,
}) {
  const {
    currency,
    summary,
    chartData,
    period,
  } = data;

  const chartScrollRef =
    useRef(null);

  const [
    selectedLabel,
    setSelectedLabel,
  ] = useState(null);

  /* =========================================
     SELECT CURRENT MONTH / YEAR
     ========================================= */

  useEffect(() => {
    if (!chartData?.length) {
      return;
    }

    const currentLabel =
      getCurrentPeriodLabel(
        period
      );

    const currentPeriod =
      chartData.find(
        (item) =>
          String(item.label) ===
          String(currentLabel)
      );

    const latestAvailablePeriod =
      [...chartData]
        .reverse()
        .find(
          (item) =>
            Number(
              item.totalIn
            ) !== 0 ||
            Number(
              item.totalOut
            ) !== 0 ||
            Number(
              item.netCashFlow
            ) !== 0
        );

    const fallback =
      latestAvailablePeriod ||
      chartData[
        chartData.length - 1
      ];

    setSelectedLabel(
      currentPeriod?.label ||
        fallback?.label
    );
  }, [
    chartData,
    period,
  ]);

  /* =========================================
     SELECTED ITEM
     ========================================= */

  const selectedItem =
    useMemo(() => {
      if (!chartData?.length) {
        return null;
      }

      return (
        chartData.find(
          (item) =>
            String(
              item.label
            ) ===
            String(
              selectedLabel
            )
        ) ||
        chartData[0]
      );
    }, [
      chartData,
      selectedLabel,
    ]);

  /* =========================================
     AXIS SETTINGS
     ========================================= */

  const axisMaximum =
    useMemo(
      () =>
        getAxisMaximum(
          chartData
        ),
      [chartData]
    );

  const axisTicks =
    useMemo(
      () =>
        createAxisTicks(
          axisMaximum
        ),
      [axisMaximum]
    );

  /* =========================================
     AUTO SCROLL TO CURRENT PERIOD
     ========================================= */

  useEffect(() => {
    const container =
      chartScrollRef.current;

    if (
      !container ||
      !chartData?.length ||
      !selectedLabel
    ) {
      return;
    }

    const selectedIndex =
      chartData.findIndex(
        (item) =>
          String(
            item.label
          ) ===
          String(
            selectedLabel
          )
      );

    if (selectedIndex < 0) {
      return;
    }

    const frame =
      requestAnimationFrame(
        () => {
          const totalWidth =
            container.scrollWidth;

          const visibleWidth =
            container.clientWidth;

          const itemWidth =
            totalWidth /
            chartData.length;

          const selectedCenter =
            selectedIndex *
              itemWidth +
            itemWidth / 2;

          container.scrollTo({
            left: Math.max(
              0,
              selectedCenter -
                visibleWidth /
                  2
            ),

            behavior: "smooth",
          });
        }
      );

    return () =>
      cancelAnimationFrame(
        frame
      );
  }, [
    selectedLabel,
    chartData,
  ]);

  /* =========================================
     CLICK PERIOD
     ========================================= */

  const handleChartClick = (
    state
  ) => {
    if (!state?.activeLabel) {
      return;
    }

    setSelectedLabel(
      state.activeLabel
    );
  };

  const selectedPeriodName =
    getReadablePeriodLabel(
      selectedItem?.label,
      period
    );

  const isCurrentPeriod =
    String(
      selectedItem?.label
    ) ===
    String(
      getCurrentPeriodLabel(
        period
      )
    );

  const selectedNetCashFlow =
    Number(
      selectedItem
        ?.netCashFlow || 0
    );

  /*
   * Wider chart = wider gaps.
   *
   * Bar thickness is controlled separately
   * with barSize={22}, so bars won't become
   * thin even when the chart gets wider.
   */
  const chartMinimumWidth =
    period === "monthly"
      ? Math.max(
          1900,
          chartData.length *
            158
        )
      : Math.max(
          900,
          chartData.length *
            170
        );

  return (
    <section className="cf-overview-card">
      {/* =====================================
          CASH FLOW HEADER
          ===================================== */}

      <div className="cf-card-heading">
        <div>
          <div className="cf-overview-title-row">
            <p className="cf-card-eyebrow">
              Cash Flow Overview
            </p>

            {selectedItem && (
              <span className="cf-selected-period">
                {selectedPeriodName}

                {isCurrentPeriod &&
                  " • Current"}
              </span>
            )}
          </div>

          <h2>
            {formatCurrency(
              selectedNetCashFlow,
              currency
            )}
          </h2>

          <p className="cf-card-subtitle">
            Net cash flow for{" "}
            <strong>
              {selectedPeriodName}
            </strong>
          </p>

          <p className="cf-chart-help">
            Click any{" "}
            {period === "monthly"
              ? "month"
              : "year"}{" "}
            in the chart to view
            its individual cash
            flow.
          </p>
        </div>

        <span
          className={
            selectedNetCashFlow >=
            0
              ? "cf-balance-status cf-balance-positive"
              : "cf-balance-status cf-balance-negative"
          }
        >
          {selectedNetCashFlow >=
          0
            ? "Positive"
            : "Negative"}
        </span>
      </div>

      {/* =====================================
          CHART
          Fixed Y-axis + scrollable plot
          ===================================== */}

      <div className="cf-chart-layout">
        {/* Fixed Y axis */}
        <FixedYAxis
          maximum={
            axisMaximum
          }
          ticks={axisTicks}
        />

        {/* Only this section scrolls */}
        <div
          ref={chartScrollRef}
          className="cf-chart-scroll"
        >
          <div
            className="cf-chart-container cf-chart-scroll-inner"
            style={{
              minWidth:
                chartMinimumWidth,
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 40,
                  left: 20,
                  bottom: 6,
                }}
                barGap={7}
                barCategoryGap="50%"
                onClick={
                  handleChartClick
                }
                style={{
                  cursor:
                    "pointer",

                  outline:
                    "none",
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#ebe8f1"
                  strokeDasharray="4 4"
                />

                {/* Hidden axis controls scale */}
                <YAxis
                  hide
                  domain={[
                    0,
                    axisMaximum,
                  ]}
                  ticks={
                    axisTicks
                  }
                />

                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={42}
                  tick={(props) => (
                    <PeriodTick
                      {...props}
                      selectedLabel={
                        selectedLabel
                      }
                    />
                  )}
                />

                {/* Selected group background */}
                {selectedLabel && (
                  <ReferenceLine
                    x={
                      selectedLabel
                    }
                    stroke="#6d5ce7"
                    strokeWidth={95}
                    strokeOpacity={
                      0.065
                    }
                  />
                )}

                <Tooltip
                  cursor={{
                    fill:
                      "rgba(81, 70, 217, 0.055)",
                  }}
                  content={
                    <ChartTooltip
                      currency={
                        currency
                      }
                      period={
                        period
                      }
                    />
                  }
                />

                {/* TOTAL IN */}
                <Bar
                  dataKey="totalIn"
                  name="Total In"
                  fill="#1fb58a"
                  barSize={22}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                {/* TOTAL OUT */}
                <Bar
                  dataKey="totalOut"
                  name="Total Out"
                  fill="#ef5c61"
                  barSize={22}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                {/* NET CASH FLOW */}
                <Bar
                  dataKey="netCashFlow"
                  name="Net Cash Flow"
                  fill="#5146d9"
                  barSize={22}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =====================================
          FIXED LEGEND
          ===================================== */}

      <CashFlowLegend />

      {/* =====================================
          SCROLL HINT
          ===================================== */}

      {period === "monthly" && (
        <div className="cf-scroll-hint">
          <span>
            ← Scroll to view all
            months →
          </span>
        </div>
      )}

      {/* =====================================
          SUMMARY TOTALS
          ===================================== */}

      <div className="cf-summary-grid">
        <SummaryCard
          type="income"
          title="Total In"
          value={
            summary.totalIn
          }
          currency={currency}
        />

        <SummaryCard
          type="outflow"
          title="Total Out"
          value={
            summary.totalOut
          }
          currency={currency}
        />

        <SummaryCard
          type="net"
          title="Net Cash Flow"
          value={
            summary.netCashFlow
          }
          currency={currency}
        />
      </div>

      {/* =====================================
          BREAKDOWN
          ===================================== */}

      <div className="cf-breakdown">
        <div>
          <span>
            Expenses
          </span>

          <strong>
            {formatCurrency(
              summary.expenses,
              currency
            )}
          </strong>
        </div>

        <div>
          <span>
            Subscription costs
          </span>

          <strong>
            {formatCurrency(
              summary.subscriptions,
              currency
            )}
          </strong>
        </div>
      </div>
    </section>
  );
}