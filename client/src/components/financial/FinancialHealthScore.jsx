import {
  Activity,
  HeartPulse,
  RefreshCw,
} from "lucide-react";

/*
 * Score bands drive the colour of the ring and of
 * every progress bar, so a weak metric reads as
 * weak at a glance.
 */
const bandFor = (score) => {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";

  return "weak";
};

function MetricRow({ metric }) {
  const score = Number(metric.score || 0);

  return (
    <li className="fh-metric">
      <div className="fh-metric-head">
        <span className="fh-metric-label">
          {metric.label}
        </span>

        <span className="fh-metric-score">
          {score}
        </span>
      </div>

      <div
        className="fh-metric-track"
        role="progressbar"
        aria-label={metric.label}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`fh-metric-fill fh-band-${bandFor(score)}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      {metric.detail && (
        <p className="fh-metric-detail">
          {metric.detail}
        </p>
      )}
    </li>
  );
}

function FinancialHealthSkeleton() {
  return (
    <article className="fh-card fh-card-loading">
      <div className="fh-skeleton-score" />

      <div className="fh-skeleton-rows">
        <div />
        <div />
        <div />
        <div />
      </div>

      <div className="fh-skeleton-insight" />
    </article>
  );
}

export default function FinancialHealthScore({
  data,
  status = "idle",
  error = null,
  onRetry,
}) {
  if (status === "loading" || (status === "idle" && !data)) {
    return <FinancialHealthSkeleton />;
  }

  if (status === "failed") {
    return (
      <article className="fh-card fh-card-error">
        <h3>
          Couldn't load your score
        </h3>

        <p>
          {error ||
            "Something went wrong while calculating your financial health."}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        )}
      </article>
    );
  }

  if (!data) {
    return null;
  }

  const score = Number(data.score || 0);
  const band = bandFor(score);
  const metrics = data.metrics || [];

  return (
    <article className="fh-card">
      <header className="fh-card-head">
        <div className="fh-card-heading">
          <span className="fh-card-icon">
            <HeartPulse size={20} />
          </span>

          <div>
            <p className="fh-card-kicker">
              Financial Health Score
            </p>

            <h3>
              How you are doing overall
            </h3>
          </div>
        </div>

        <span className={`fh-grade fh-band-${band}`}>
          {data.grade}
        </span>
      </header>

      <div className="fh-score-block">
        <div
          className={`fh-score-ring fh-band-${band}`}
          style={{ "--fh-score": score }}
          role="img"
          aria-label={`Financial health score ${score} out of 100`}
        >
          <div className="fh-score-ring-inner">
            <strong>{score}</strong>

            <span>/ 100</span>
          </div>
        </div>

        <div className="fh-score-copy">
          <p className="fh-score-grade">
            {data.grade}
          </p>

          <p className="fh-score-note">
            {data.hasData
              ? "Calculated from your income consistency, spending, subscriptions and savings over the last 6 months."
              : "Add income and expense records to replace this neutral baseline with your real score."}
          </p>
        </div>
      </div>

      <ul className="fh-metrics">
        {metrics.map((metric) => (
          <MetricRow
            key={metric.key}
            metric={metric}
          />
        ))}
      </ul>

      {data.insight && (
        <div className="fh-insight">
          <p className="fh-insight-title">
            <span
              className="fh-insight-emoji"
              aria-hidden="true"
            >
              💡
            </span>

            <span>Insight:</span>
          </p>

          <p className="fh-insight-body">
            {data.insight}
          </p>
        </div>
      )}

      {data.insights?.length > 1 && (
        <ul className="fh-insight-list">
          {data.insights.slice(1).map((item) => (
            <li
              key={item.id}
              className={`fh-insight-item fh-tone-${item.tone}`}
            >
              <Activity size={14} />

              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
