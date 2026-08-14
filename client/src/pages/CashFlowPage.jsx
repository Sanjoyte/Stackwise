import {
  Bell,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import CashFlowOverview from "../components/cashflow/CashFlowOverview";
import ForecastCard from "../components/cashflow/ForecastCard";
import InsightCard from "../components/cashflow/InsightCard";
import PeriodToggle from "../components/cashflow/PeriodToggle";
import "../styles/expenseCategories.css";


import {
  CashFlowMobileNav,
  CashFlowSidebar,
} from "../components/cashflow/CashFlowNav";

import {
  fetchCashFlowDashboard,
} from "../api/cashFlowApi";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/cashFlow.css";

export default function CashFlowPage() {
  const { user } =
    useAuth();

  const [period, setPeriod] =
    useState("monthly");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadCashFlow =
    async (
      selectedPeriod =
        period
    ) => {
      setLoading(true);
      setError("");

      try {
        const result =
          await fetchCashFlowDashboard(
            selectedPeriod
          );

        setData(result);
      } catch (requestError) {
        setError(
          requestError.response
            ?.data?.message ||
            "Unable to load your cash flow dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadCashFlow(period);
  }, [period]);

  const handlePeriodChange = (
    nextPeriod
  ) => {
    if (
      nextPeriod === period
    ) {
      return;
    }

    setPeriod(nextPeriod);
  };

  const getInitials = () => {
    const name =
      user?.name?.trim();

    if (!name) {
      return "SW";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (word) =>
          word[0]?.toUpperCase()
      )
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
                {user?.name ||
                  "Stackwise User"}
              </strong>

              <span>
                {user?.email ||
                  ""}
              </span>
            </div>
          </div>
        </header>

        <main className="cf-main">
          <div className="cf-page-heading">
            <div>
              <div className="cf-heading-kicker">
                <Sparkles
                  size={15}
                />

                Financial overview
              </div>

              <h1>
                Cash Flow
              </h1>

              <p>
                Understand what is
                coming in, what is
                going out and what
                your future balance
                may look like.
              </p>
            </div>

            <PeriodToggle
              value={period}
              onChange={
                handlePeriodChange
              }
              disabled={loading}
            />
          </div>

          {data?.source ===
            "demo" && (
            <div className="cf-demo-notice">
              <span className="cf-demo-dot" />

              <div>
                <strong>
                  Development data
                </strong>

                <span>
                  {
                    data.sourceMessage
                  }
                </span>
              </div>
            </div>
          )}

          {loading && !data ? (
            <CashFlowLoading />
          ) : error ? (
            <div className="cf-error-state">
              <h2>
                Couldn't load Cash
                Flow
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadCashFlow(
                    period
                  )
                }
              >
                <RefreshCw
                  size={17}
                />

                Try again
              </button>
            </div>
          ) : data ? (
            <>
              <CashFlowOverview
                data={data}
              />

              <section className="cf-ai-section">
                <div className="cf-section-title">
                  <Sparkles
                    size={19}
                  />

                  <div>
                    <h2>
                      AI Forecast
                    </h2>

                    <p>
                      Forward-looking
                      insights based
                      on your cash
                      flow and
                      recurring costs.
                    </p>
                  </div>
                </div>

                <div className="cf-ai-grid">
                  <ForecastCard
                    forecast={
                      data.forecast
                    }
                    currency={
                      data.currency
                    }
                  />

                  <InsightCard
                    insight={
                      data.insight
                    }
                    currency={
                      data.currency
                    }
                  />
                </div>
              </section>
              
            </>
          ) : null}
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}

function CashFlowLoading() {
  return (
    <div className="cf-loading">
      <div className="cf-loading-header">
        <div />

        <div />
      </div>

      <div className="cf-loading-chart" />

      <div className="cf-loading-cards">
        <div />
        <div />
        <div />
      </div>
    </div>
  );
}