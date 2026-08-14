import {
  LogOut,
  Sparkles,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
  Briefcase,
  Repeat,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

import AddIncomeDrawer from "../components/AddIncomeDrawer";
import IncomeDetailModal from "../components/IncomeDetailModal";
import TemplateDetailModal from "../components/TemplateDetailModal";

import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";

import "../subscriptions.css";
import "../styles/cashFlow.css";

export default function IncomePage() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [incomes, setIncomes] =
    useState([]);

  const [templates, setTemplates] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // UI States
  const [
    isDrawerOpen,
    setIsDrawerOpen,
  ] = useState(false);

  const [
    isDetailOpen,
    setIsDetailOpen,
  ] = useState(false);

  const [
    isTemplateDetailOpen,
    setIsTemplateDetailOpen,
  ] = useState(false);

  const [
    selectedIncome,
    setSelectedIncome,
  ] = useState(null);

  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState(null);

  const [
    incomeToEdit,
    setIncomeToEdit,
  ] = useState(null);

  const [
    drawerMode,
    setDrawerMode,
  ] = useState("income");

  // Conversion rate:
  // 1 USD = 120 BDT
  const USD_TO_BDT = 120;

  const baseCurrency =
    user?.baseCurrency || "BDT";

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        incomeRes,
        templateRes,
      ] = await Promise.all([
        api.get("/incomes"),

        api.get(
          "/income-templates"
        ),
      ]);

      setIncomes(
        incomeRes.data.incomes ||
          []
      );

      setTemplates(
        templateRes.data.templates ||
          []
      );

      setError("");
    } catch (err) {
      setError(
        "Failed to fetch income data. Please try reloading."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (
    item,
    mode = "income"
  ) => {
    setIncomeToEdit(item);
    setDrawerMode(mode);

    if (mode === "income") {
      setIsDetailOpen(false);
    } else {
      setIsTemplateDetailOpen(
        false
      );
    }

    setIsDrawerOpen(true);
  };

  const handleAddClick = (
    mode = "income"
  ) => {
    setIncomeToEdit(null);
    setDrawerMode(mode);
    setIsDrawerOpen(true);
  };

  const handleCardClick = (
    income
  ) => {
    setSelectedIncome(income);
    setIsDetailOpen(true);
  };

  const handleTemplateCardClick = (
    template
  ) => {
    setSelectedTemplate(
      template
    );

    setIsTemplateDetailOpen(
      true
    );
  };

  const convertToUserBase = (
    amount,
    fromCurrency
  ) => {
    if (
      fromCurrency ===
      baseCurrency
    ) {
      return amount;
    }

    if (
      fromCurrency === "USD" &&
      baseCurrency === "BDT"
    ) {
      return (
        amount *
        USD_TO_BDT
      );
    }

    if (
      fromCurrency === "BDT" &&
      baseCurrency === "USD"
    ) {
      return (
        amount /
        USD_TO_BDT
      );
    }

    return amount;
  };

  const formatCurrency = (
    value
  ) => {
    if (
      baseCurrency === "USD"
    ) {
      return `$${value.toFixed(
        2
      )}`;
    }

    return `৳${value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0,
      }
    )}`;
  };

  const formatItemCurrency = (
    value,
    currency
  ) => {
    if (currency === "USD") {
      return `$${Number(
        value
      ).toFixed(2)}`;
    }

    if (currency === "BDT") {
      return `৳${Number(
        value
      ).toFixed(0)}`;
    }

    return `${currency} ${Number(
      value
    ).toFixed(2)}`;
  };

  // Calculate totals from
  // the last 30 days and
  // the last 365 days
  const now = new Date();

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000
    );

  const oneYearAgo =
    new Date(
      now.getTime() -
        365 *
          24 *
          60 *
          60 *
          1000
    );

  const totalMonthlyIncome =
    incomes
      .filter(
        (income) =>
          new Date(
            income.date
          ) >=
          thirtyDaysAgo
      )
      .reduce(
        (
          sum,
          income
        ) =>
          sum +
          convertToUserBase(
            income.amount,
            income.currency
          ),
        0
      );

  const totalAnnualIncome =
    incomes
      .filter(
        (income) =>
          new Date(
            income.date
          ) >=
          oneYearAgo
      )
      .reduce(
        (
          sum,
          income
        ) =>
          sum +
          convertToUserBase(
            income.amount,
            income.currency
          ),
        0
      );

  return (
    <div className="cf-page">
      {/* =====================================
          SHARED LEFT SIDEBAR
          ===================================== */}

      <CashFlowSidebar />

      {/* =====================================
          INCOME WORKSPACE
          ===================================== */}

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            {/* ===============================
                Navigation Header
                =============================== */}

            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark
                darkText
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/subscription"
                    )
                  }
                  className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 sm:inline-flex"
                >
                  Subscriptions
                </button>

                <span className="hidden items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 sm:inline-flex">
                  <Layers
                    size={13}
                  />

                  Base:{" "}
                  {baseCurrency}
                </span>

                <button
                  type="button"
                  onClick={logout}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-100"
                >
                  <LogOut
                    size={14}
                  />

                  Logout
                </button>
              </div>
            </header>

            {/* ===============================
                Error Message
                =============================== */}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {/* ===============================
                Income Metrics
                =============================== */}

            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Last 30 Days */}

              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Last 30 Days
                    </span>

                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-500">
                      <DollarSign
                        size={
                          18
                        }
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(
                      totalMonthlyIncome
                    )}
                  </p>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Income received in
                  the last 30 days.
                </p>
              </article>

              {/* Last 365 Days */}

              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Last 365 Days
                    </span>

                    <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                      <TrendingUp
                        size={
                          18
                        }
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(
                      totalAnnualIncome
                    )}
                  </p>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Income received in
                  the last year.
                </p>
              </article>

              {/* Quick Action */}

              <article className="flex flex-col justify-between rounded-3xl bg-indigo-600 p-6 text-white shadow-xs sm:col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles
                      size={
                        11
                      }
                    />

                    Income Tracking
                  </div>

                  <h3 className="text-lg font-bold">
                    Track your
                    cashflow
                  </h3>

                  <p className="text-xs text-indigo-100">
                    Log one-off
                    payments or set
                    up recurring
                    client
                    templates.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddClick(
                        "income"
                      )
                    }
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                  >
                    <Plus
                      size={
                        18
                      }
                    />

                    Log Income
                  </button>
                </div>
              </article>
            </section>

            {/* ===============================
                Recurring Templates
                =============================== */}

            {templates.length >
              0 && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Repeat
                    className="text-indigo-600"
                    size={20}
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Recurring
                    Templates
                  </h2>
                </div>

                <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
                  {templates.map(
                    (
                      template
                    ) => (
                      <article
                        key={
                          template._id
                        }
                        onClick={() =>
                          handleTemplateCardClick(
                            template
                          )
                        }
                        className="flex cursor-pointer flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-5 shadow-xs transition hover:border-indigo-300"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-sm font-bold text-slate-800">
                              {
                                template.templateName
                              }
                            </h3>

                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                              {
                                template.frequency
                              }
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {template.clientName ||
                              template.source}
                          </p>

                          <div className="mt-3 text-lg font-extrabold text-slate-900">
                            {formatItemCurrency(
                              template.amount,
                              template.currency
                            )}
                          </div>

                          {template.expectedDate && (
                            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                              <Calendar
                                size={
                                  11
                                }
                              />

                              Exp:{" "}
                              {new Date(
                                template.expectedDate
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month:
                                    "short",

                                  day: "numeric",

                                  year: "numeric",
                                }
                              )}
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  )}
                </div>
              </section>
            )}

            {/* ===============================
                Income History
                =============================== */}

            <section className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  Income History

                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {
                      incomes.length
                    }
                  </span>
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center rounded-3xl border border-indigo-50 bg-white py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                </div>
              ) : incomes.length ===
                0 ? (
                <div className="rounded-3xl border border-dashed border-indigo-200 bg-white py-16 text-center">
                  <Briefcase
                    className="mx-auto mb-4 text-indigo-300"
                    size={40}
                  />

                  <h3 className="text-sm font-bold text-slate-700">
                    No Income
                    Logged
                  </h3>

                  <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
                    Get started by
                    clicking the
                    "Log Income"
                    button to track
                    your cashflow.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
                  {incomes.map(
                    (
                      income
                    ) => (
                      <article
                        key={
                          income._id
                        }
                        onClick={() =>
                          handleCardClick(
                            income
                          )
                        }
                        className="sub-item-card cursor-pointer rounded-3xl border border-indigo-100 bg-white p-5 shadow-xs transition hover:border-indigo-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-800 capitalize">
                                {
                                  income.source
                                }
                              </h3>

                              {income.linkedTemplate && (
                                <span className="inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                                  Template
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {income.clientName ||
                                "General"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-emerald-600">
                            +
                            {formatItemCurrency(
                              income.amount,
                              income.currency
                            )}
                          </span>
                        </div>

                        {income.notes && (
                          <p className="mt-3 truncate rounded-xl bg-slate-50 p-2 text-xs text-slate-500">
                            {
                              income.notes
                            }
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar
                              size={
                                13
                              }
                              className="text-indigo-400"
                            />

                            <span>
                              {new Date(
                                income.date
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

                          <ArrowRight
                            size={
                              13
                            }
                            className="text-slate-300"
                          />
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ===============================
              Add / Edit Income Drawer
              =============================== */}

          <AddIncomeDrawer
            isOpen={
              isDrawerOpen
            }
            onClose={() => {
              setIsDrawerOpen(
                false
              );

              setIncomeToEdit(
                null
              );
            }}
            onSuccess={
              fetchData
            }
            incomeToEdit={
              incomeToEdit
            }
            userCurrency={
              baseCurrency
            }
            initialMode={
              drawerMode
            }
          />

          {/* ===============================
              Income Detail Modal
              =============================== */}

          <IncomeDetailModal
            income={
              selectedIncome
            }
            isOpen={
              isDetailOpen
            }
            onClose={() => {
              setIsDetailOpen(
                false
              );

              setSelectedIncome(
                null
              );
            }}
            onSuccess={
              fetchData
            }
            onEdit={(
              income
            ) =>
              handleEditClick(
                income,
                "income"
              )
            }
          />

          {/* ===============================
              Template Detail Modal
              =============================== */}

          <TemplateDetailModal
            template={
              selectedTemplate
            }
            isOpen={
              isTemplateDetailOpen
            }
            onClose={() => {
              setIsTemplateDetailOpen(
                false
              );

              setSelectedTemplate(
                null
              );
            }}
            onSuccess={
              fetchData
            }
            onEdit={(
              template
            ) =>
              handleEditClick(
                template,
                "template"
              )
            }
          />
        </main>

        {/* =================================
            MOBILE NAVBAR
            ================================= */}

        <CashFlowMobileNav />
      </div>
    </div>
  );
}