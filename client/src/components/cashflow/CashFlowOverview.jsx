import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

function ChartTooltip({
  active,
  payload,
  label,
  currency,
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
        {label}
      </p>

      {payload.map(
        (item) => (
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
        )
      )}
    </div>
  );
}

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

export default function CashFlowOverview({
  data,
}) {
  const {
    currency,
    summary,
    chartData,
    period,
  } = data;

  return (
    <section className="cf-overview-card">
      <div className="cf-card-heading">
        <div>
          <p className="cf-card-eyebrow">
            Cash Flow Overview
          </p>

          <h2>
            {formatCurrency(
              summary.netCashFlow,
              currency
            )}
          </h2>

          <p className="cf-card-subtitle">
            Net cash flow for the
            current{" "}
            {period === "monthly"
              ? "monthly"
              : "yearly"}{" "}
            view
          </p>
        </div>

        <span
          className={
            summary.netCashFlow >=
            0
              ? "cf-balance-status cf-balance-positive"
              : "cf-balance-status cf-balance-negative"
          }
        >
          {summary.netCashFlow >=
          0
            ? "Positive"
            : "Negative"}
        </span>
      </div>

      <div className="cf-chart-container">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 12,
              left: 0,
              bottom: 5,
            }}
            barGap={4}
          >
            <CartesianGrid
              vertical={false}
              stroke="#ebe8f1"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#817b91",
                fontSize: 12,
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{
                fill: "#9b95aa",
                fontSize: 11,
              }}
              tickFormatter={(
                value
              ) =>
                Intl.NumberFormat(
                  "en-US",
                  {
                    notation:
                      "compact",
                    maximumFractionDigits: 1,
                  }
                ).format(value)
              }
            />

            <Tooltip
              cursor={{
                fill:
                  "rgba(105, 89, 226, 0.05)",
              }}
              content={
                <ChartTooltip
                  currency={
                    currency
                  }
                />
              }
            />

            <Legend
              wrapperStyle={{
                paddingTop:
                  "18px",
                fontSize:
                  "12px",
              }}
            />

            <Bar
              dataKey="totalIn"
              name="Total In"
              fill="#1fb58a"
              radius={[
                6,
                6,
                0,
                0,
              ]}
              maxBarSize={24}
            />

            <Bar
              dataKey="totalOut"
              name="Total Out"
              fill="#ef5c61"
              radius={[
                6,
                6,
                0,
                0,
              ]}
              maxBarSize={24}
            />

            <Bar
              dataKey="netCashFlow"
              name="Net Cash Flow"
              fill="#5146d9"
              radius={[
                6,
                6,
                0,
                0,
              ]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

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