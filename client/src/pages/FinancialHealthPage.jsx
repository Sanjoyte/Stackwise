import { Bell, HeartPulse, RefreshCw } from "lucide-react";

import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  CashFlowMobileNav,
  CashFlowSidebar,
} from "../components/cashflow/CashFlowNav";

import FinancialHealthScore from "../components/financial/FinancialHealthScore";

import { useAuth } from "../context/AuthContext";

import { loadFinancialHealth } from "../store/financialHealthSlice";

import { formatCurrency } from "../utils/formatCurrency";

import "../styles/cashFlow.css";
import "../styles/financialHealth.css";

/* The seven weighted inputs behind the four
   headline bars, shown so the score is auditable. */
const SUB_SCORE_ROWS = [
  { key: "incomeConsistency", label: "Income consistency", weight: 20 },
  { key: "expenseToIncome", label: "Expense-to-income ratio", weight: 20 },
  { key: "monthlySavings", label: "Monthly savings", weight: 20 },
  { key: "spendingVolatility", label: "Spending volatility", weight: 15 },
  { key: "recurringExpenses", label: "Recurring expenses", weight: 10 },
  { key: "emergencySavings", label: "Emergency savings", weight: 10 },
  { key: "unusualSpending", label: "Unusual spending", weight: 5 },
];

const bandFor = (score) => {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";

  return "weak";
};

function ScoreBreakdown({ data }) {
  const currency = data.currency || "BDT";
  const currentMonth = data.totals?.currentMonth || {};
  const emergencyFund = data.totals?.emergencyFund || {};

  return (
    <section className="fh-breakdown">
      <h3>
        Score breakdown
      </h3>

      <p className="fh-breakdown-note">
        Each metric is scored out of 100, then weighted into your overall
        score.
      </p>

      <ul className="fh-subscores">
        {SUB_SCORE_ROWS.map((row) => {
          const score = Number(data.subScores?.[row.key] ?? 0);

          return (
            <li
              key={row.key}
              className="fh-subscore"
            >
              <div>
                <div className="fh-subscore-label">
                  {row.label}
                </div>

                <div className="fh-weight">
                  weight {row.weight}%
                </div>
              </div>

              <div className="fh-subscore-track">
                <div
                  className={`fh-subscore-fill fh-band-${bandFor(score)}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, score))}%`,
                  }}
                />
              </div>

              <span className="fh-subscore-value">
                {score}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="fh-totals">
        <div className="fh-total">
          <span>
            Income this month
          </span>

          <strong>
            {formatCurrency(currentMonth.income, currency)}
          </strong>
        </div>

        <div className="fh-total">
          <span>
            Spending this month
          </span>

          <strong>
            {formatCurrency(currentMonth.totalOut, currency)}
          </strong>
        </div>

        <div className="fh-total">
          <span>
            Recurring costs
          </span>

          <strong>
            {formatCurrency(currentMonth.recurring, currency)}
          </strong>
        </div>

        <div className="fh-total">
          <span>
            Emergency fund
          </span>

          <strong>
            {formatCurrency(emergencyFund.saved, currency)}
          </strong>
        </div>
      </div>
    </section>
  );
}

export default function FinancialHealthPage() {
  const { user } = useAuth();

  const dispatch = useDispatch();

  const { data, status, error } = useSelector(
    (state) => state.financialHealth
  );

  useEffect(() => {
    if (status === "idle") {
      dispatch(loadFinancialHealth());
    }
  }, [status, dispatch]);

  const handleRetry = () => {
    dispatch(loadFinancialHealth());
  };

  const getInitials = () => {
    const name = user?.name?.trim();

    if (!name) {
      return "SW";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  };

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <header className="cf-topbar">
          <div className="cf-mobile-brand">
            <div className="cf-mobile-brand-mark">
              S
            </div>

            <span>
              Stackwise
            </span>
          </div>

          <div className="cf-topbar-spacer" />

          <button
            type="button"
            className="cf-icon-button"
            aria-label="Notifications"
          >
            <Bell size={19} />
          </button>

          <div className="cf-user-summary">
            <div className="cf-avatar">
              {getInitials()}
            </div>

            <div className="cf-user-copy">
              <strong>
                {user?.name || "Stackwise User"}
              </strong>

              <span>
                {user?.email || ""}
              </span>
            </div>
          </div>
        </header>

        <main className="cf-main">
          <div className="cf-page-heading">
            <div>
              <div className="cf-heading-kicker">
                <HeartPulse size={15} />

                Financial overview
              </div>

              <h1>
                Financial Health
              </h1>

              <p>
                One score for how steady your income is, how well you control
                spending, and how your savings are building.
              </p>
            </div>

            <button
              type="button"
              className="cf-icon-button"
              onClick={handleRetry}
              disabled={status === "loading"}
              aria-label="Refresh financial health score"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="fh-layout">
            <FinancialHealthScore
              data={data}
              status={status}
              error={error}
              onRetry={handleRetry}
            />

            {status === "succeeded" && data && (
              <ScoreBreakdown data={data} />
            )}
          </div>
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}
