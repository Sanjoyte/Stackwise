import {
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

function ForecastTooltip({
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

      <strong>
        {formatCurrency(
          payload[0].value,
          currency
        )}
      </strong>
    </div>
  );
}

export default function ForecastCard({
  forecast,
  currency,
}) {
  const isWarning =
    forecast.status ===
    "warning";

  const Icon = isWarning
    ? AlertTriangle
    : ShieldCheck;

  return (
    <article
      className={`cf-forecast-card ${
        isWarning
          ? "cf-forecast-warning"
          : "cf-forecast-stable"
      }`}
    >
      <div className="cf-forecast-header">
        <div className="cf-forecast-icon">
          <Icon size={25} />
        </div>

        <div>
          <h3>
            {forecast.title}
          </h3>

          <p>
            Projected balance by{" "}
            <strong>
              {
                forecast.horizonLabel
              }
            </strong>
          </p>
        </div>
      </div>

      <div
        className={
          isWarning
            ? "cf-projected-value cf-projected-negative"
            : "cf-projected-value cf-projected-positive"
        }
      >
        {formatCurrency(
          forecast.projectedBalance,
          currency
        )}
      </div>

      <p className="cf-forecast-description">
        {forecast.description}
      </p>

      <div className="cf-forecast-chart">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={
              forecast.points
            }
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#eeeaf2"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#8e8798",
                fontSize: 11,
              }}
            />

            <YAxis hide />

            <ReferenceLine
              y={0}
              stroke="#d7d2dc"
              strokeDasharray="4 4"
            />

            <Tooltip
              content={
                <ForecastTooltip
                  currency={
                    currency
                  }
                />
              }
            />

            <Line
              type="monotone"
              dataKey="balance"
              stroke={
                isWarning
                  ? "#ef5558"
                  : "#23aa80"
              }
              strokeWidth={2.5}
              dot={{
                r: 3,
              }}
              activeDot={{
                r: 5,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="cf-stability">
        <div className="cf-stability-label">
          <span>
            Predicted Stability
          </span>

          <strong>
            {forecast.stability}%
          </strong>
        </div>

        <div className="cf-stability-track">
          <div
            className="cf-stability-progress"
            style={{
              width: `${forecast.stability}%`,
            }}
          />
        </div>
      </div>
    </article>
  );
}