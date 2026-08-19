import {
  Lightbulb,
  Sparkles,
} from "lucide-react";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

export default function InsightCard({
  insight,
  currency,
}) {
  return (
    <article className="cf-insight-card">
      <div className="cf-insight-top">
        <div className="cf-insight-heading">
          <span className="cf-insight-icon">
            <Lightbulb
              size={20}
            />
          </span>

          <div>
            <p className="cf-insight-label">
              Key Insight
            </p>

            <h3>
              Subscription
              optimization
            </h3>
          </div>
        </div>

        <span className="cf-insight-badge">
          <Sparkles
            size={13}
          />

          {insight.badge}
        </span>
      </div>

      <div className="cf-insight-saving">
        <span>
          Potential impact
        </span>

        <strong>
          {formatCurrency(
            insight.amountSaved,
            currency
          )}
        </strong>
      </div>

      <p className="cf-insight-description">
        {insight.description}
      </p>

      <div className="cf-insight-note">
        Stackwise analyzes
        recurring costs to
        identify opportunities for
        better cash-flow decisions.
      </div>
    </article>
  );
}