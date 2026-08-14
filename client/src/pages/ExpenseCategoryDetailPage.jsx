import {
  ArrowDownLeft,
  ArrowLeft,
  CalendarDays,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";

import {
  CashFlowMobileNav,
  CashFlowSidebar,
} from "../components/cashflow/CashFlowNav";

import {
  fetchCategoryDetail,
} from "../api/expenseCategoryApi";

import "../styles/cashFlow.css";
import "../styles/expenseCategories.css";

const formatMoney = (
  value,
  currency = "BDT"
) => {
  if (
    currency === "USD"
  ) {
    return `$${Number(
      value || 0
    ).toFixed(2)}`;
  }

  return `BDT ${Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        2,
    }
  )}`;
};

export default function ExpenseCategoryDetailPage() {
  const { slug } =
    useParams();

  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const initialPeriod =
    searchParams.get(
      "period"
    ) === "yearly"
      ? "yearly"
      : "monthly";

  const [
    period,
    setPeriod,
  ] = useState(
    initialPeriod
  );

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const load =
      async () => {
        try {
          setLoading(true);

          const result =
            await fetchCategoryDetail(
              slug,
              period
            );

          setData(result);
          setError("");
        } catch (err) {
          setError(
            "Could not load category details."
          );
        } finally {
          setLoading(false);
        }
      };

    load();
  }, [
    slug,
    period,
  ]);

  const changePeriod = (
    nextPeriod
  ) => {
    setPeriod(
      nextPeriod
    );

    setSearchParams({
      period:
        nextPeriod,
    });
  };

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="ec-detail-page">
          <div className="ec-detail-container">
            <div className="ec-detail-nav">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/category-spending"
                  )
                }
                className="ec-back-button"
              >
                <ArrowLeft
                  size={17}
                />

                Cash Flow
              </button>

              <div className="ec-period-toggle">
                <button
                  type="button"
                  className={
                    period ===
                    "monthly"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changePeriod(
                      "monthly"
                    )
                  }
                >
                  Monthly
                </button>

                <button
                  type="button"
                  className={
                    period ===
                    "yearly"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changePeriod(
                      "yearly"
                    )
                  }
                >
                  Yearly
                </button>
              </div>
            </div>

            {loading ? (
              <div className="ec-detail-loading">
                Loading category
                summary...
              </div>
            ) : error ? (
              <div className="ec-error">
                {error}
              </div>
            ) : data ? (
              <>
                <header className="ec-detail-header">
                  <p className="ec-kicker">
                    Expense Category
                  </p>

                  <h1>
                    {
                      data.category
                        .name
                    }
                  </h1>

                  <p>
                    Your{" "}
                    {period ===
                    "monthly"
                      ? "monthly"
                      : "yearly"}{" "}
                    spending
                    overview.
                  </p>
                </header>

                {/* Budget / Spend Card */}

                <section className="ec-budget-card">
                  <div className="ec-budget-top">
                    <div>
                      <span>
                        {data
                          .summary
                          .budget
                          ? period ===
                            "monthly"
                            ? "Monthly Budget"
                            : "Yearly Budget"
                          : "Total Spending"}
                      </span>

                      <strong>
                        {formatMoney(
                          data
                            .summary
                            .budget ??
                            data
                              .summary
                              .totalSpent
                        )}
                      </strong>
                    </div>

                    {data
                      .summary
                      .budget !==
                      null && (
                      <div className="ec-budget-remaining">
                        <span>
                          Remaining
                        </span>

                        <strong>
                          {formatMoney(
                            data
                              .summary
                              .remaining
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  {data
                    .summary
                    .budget !==
                    null && (
                    <>
                      <div className="ec-big-progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              data
                                .summary
                                .percentageUsed ||
                                0
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="ec-budget-footer">
                        <span>
                          {
                            data
                              .summary
                              .percentageUsed
                          }
                          % Used
                        </span>

                        <strong>
                          {data
                            .summary
                            .remaining <
                          0
                            ? "Over Limit"
                            : "Within Budget"}
                        </strong>
                      </div>
                    </>
                  )}

                  {data
                    .summary
                    .budget ===
                    null && (
                    <p className="ec-total-spent-copy">
                      {formatMoney(
                        data
                          .summary
                          .totalSpent
                      )}{" "}
                      spent during
                      this period.
                    </p>
                  )}
                </section>

                {/* Quick Summary */}

                <section className="ec-detail-metrics">
                  <article>
                    {data
                      .summary
                      .savingsPercentage >=
                    0 ? (
                      <TrendingDown
                        size={
                          20
                        }
                      />
                    ) : (
                      <TrendingUp
                        size={
                          20
                        }
                      />
                    )}

                    <span>
                      Vs Last{" "}
                      {period ===
                      "monthly"
                        ? "Month"
                        : "Year"}
                    </span>

                    <strong>
                      {data
                        .summary
                        .savingsPercentage >
                      0
                        ? "+"
                        : ""}
                      {
                        data
                          .summary
                          .savingsPercentage
                      }
                      % saved
                    </strong>
                  </article>

                  <article>
                    <CalendarDays
                      size={
                        20
                      }
                    />

                    <span>
                      Daily
                      Average
                    </span>

                    <strong>
                      {formatMoney(
                        data
                          .summary
                          .averagePerDay
                      )}
                      /day
                    </strong>
                  </article>

                  <article>
                    <ReceiptText
                      size={
                        20
                      }
                    />

                    <span>
                      Transactions
                    </span>

                    <strong>
                      {
                        data
                          .summary
                          .transactionCount
                      }
                    </strong>
                  </article>
                </section>

                {/* Transactions */}

                <section className="ec-transactions">
                  <div className="ec-transactions-heading">
                    <div>
                      <p className="ec-kicker">
                        Activity
                      </p>

                      <h2>
                        Recent
                        Transactions
                      </h2>
                    </div>

                    <Wallet
                      size={
                        22
                      }
                    />
                  </div>

                  {data
                    .recentTransactions
                    .length ===
                  0 ? (
                    <div className="ec-empty-transactions">
                      No transactions
                      in this
                      category for
                      this period.
                    </div>
                  ) : (
                    <div className="ec-transaction-list">
                      {data.recentTransactions.map(
                        (
                          transaction
                        ) => (
                          <article
                            key={
                              transaction.id
                            }
                          >
                            <div className="ec-transaction-icon">
                              <ArrowDownLeft
                                size={
                                  16
                                }
                              />
                            </div>

                            <div className="ec-transaction-copy">
                              <strong>
                                {
                                  transaction.title
                                }
                              </strong>

                              <span>
                                {new Date(
                                  transaction.date
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    month:
                                      "short",

                                    day: "numeric",

                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>

                            <strong className="ec-transaction-amount">
                              -
                              {formatMoney(
                                transaction.amount,
                                transaction.currency
                              )}
                            </strong>
                          </article>
                        )
                      )}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}