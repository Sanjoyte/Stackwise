import {
  LogOut,
  Sparkles,
  WalletCards,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

import AddSubscriptionDrawer from "../components/AddSubscriptionDrawer";
import SubscriptionDetailModal from "../components/SubscriptionDetailModal";

import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";

import "../subscriptions.css";
import "../styles/cashFlow.css";

export default function SubscriptionPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // UI STATES
  // =========================
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [selectedSub, setSelectedSub] = useState(null);
  const [subToEdit, setSubToEdit] = useState(null);

  // =========================
  // CURRENCY CONVERSION
  // =========================
  // Conversion rate: 1 USD = 120 BDT
  const USD_TO_BDT = 120;

  const baseCurrency = user?.baseCurrency || "BDT";

  const convertToUserBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) {
      return amount;
    }

    if (
      fromCurrency === "USD" &&
      baseCurrency === "BDT"
    ) {
      return amount * USD_TO_BDT;
    }

    if (
      fromCurrency === "BDT" &&
      baseCurrency === "USD"
    ) {
      return amount / USD_TO_BDT;
    }

    return amount;
  };

  // =========================
  // FETCH SUBSCRIPTIONS
  // =========================
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);

      const res = await api.get("/subscriptions");

      setSubscriptions(
        res.data.subscriptions || []
      );

      setError("");
    } catch (err) {
      console.error(
        "Failed to fetch subscriptions:",
        err
      );

      setError(
        "Failed to fetch subscriptions. Please try reloading."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // =========================
  // SUBSCRIPTION ACTIONS
  // =========================
  const handleEditClick = (sub) => {
    setSubToEdit(sub);
    setIsDetailOpen(false);
    setIsDrawerOpen(true);
  };

  const handleAddClick = () => {
    setSubToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleCardClick = (sub) => {
    setSelectedSub(sub);
    setIsDetailOpen(true);
  };

  // =========================
  // FILTER SUBSCRIPTIONS
  // =========================
  const activeSubs = subscriptions.filter(
    (sub) => sub.status === "active"
  );

  const cancelledSubs = subscriptions.filter(
    (sub) => sub.status === "cancelled"
  );

  // =========================
  // MONTHLY SPEND
  // =========================
  const totalMonthlySpend = activeSubs.reduce(
    (sum, sub) => {
      const amountInBase = convertToUserBase(
        sub.amount,
        sub.currency
      );

      let monthlyAmount = amountInBase;

      if (sub.billingCycle === "annual") {
        monthlyAmount = amountInBase / 12;
      } else if (
        sub.billingCycle === "weekly"
      ) {
        monthlyAmount = amountInBase * 4.33;
      }

      return sum + monthlyAmount;
    },
    0
  );

  // =========================
  // ANNUAL SPEND
  // =========================
  const totalAnnualSpend = activeSubs.reduce(
    (sum, sub) => {
      const amountInBase = convertToUserBase(
        sub.amount,
        sub.currency
      );

      let annualAmount = amountInBase;

      if (sub.billingCycle === "monthly") {
        annualAmount = amountInBase * 12;
      } else if (
        sub.billingCycle === "weekly"
      ) {
        annualAmount = amountInBase * 52;
      }

      return sum + annualAmount;
    },
    0
  );

  // =========================
  // TRIAL ALERTS
  // =========================
  const impendingTrials = activeSubs.filter(
    (sub) => {
      if (!sub.isTrial) {
        return false;
      }

      const diffMs =
        new Date(sub.renewalDate) -
        new Date();

      const diffHours =
        diffMs / (1000 * 60 * 60);

      return (
        diffHours > 0 &&
        diffHours <= 48
      );
    }
  );

  // =========================
  // FORMAT CURRENCY
  // =========================
  const formatCurrency = (val) => {
    if (baseCurrency === "USD") {
      return `$${val.toFixed(2)}`;
    }

    return `৳${val.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0,
      }
    )}`;
  };

  const formatItemCurrency = (
    val,
    curr
  ) => {
    if (curr === "USD") {
      return `$${Number(val).toFixed(2)}`;
    }

    if (curr === "BDT") {
      return `৳${Number(val).toFixed(0)}`;
    }

    return `${curr} ${Number(
      val
    ).toFixed(2)}`;
  };

  return (
    <div className="cf-page">
      {/* =========================
          LEFT SIDEBAR
          ========================= */}
      <CashFlowSidebar />

      {/* =========================
          MAIN WORKSPACE
          ========================= */}
      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            {/* =========================
                NAVIGATION HEADER
                ========================= */}
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark darkText />

              <div className="flex items-center gap-3">
                {/* Income Tracking */}
                <button
                  type="button"
                  onClick={() =>
                    navigate("/income")
                  }
                  className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 sm:inline-flex"
                >
                  Income Tracking
                </button>

                {/* Base Currency */}
                <span className="hidden items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 sm:inline-flex">
                  <Layers size={13} />
                  Base: {baseCurrency}
                </span>

                {/* Logout */}
                <button
                  type="button"
                  onClick={logout}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-100"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </header>

            {/* =========================
                ERROR MESSAGE
                ========================= */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {/* =========================
                TRIAL COUNTDOWN
                ========================= */}
            {impendingTrials.length > 0 && (
              <section className="space-y-3.5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-amber-800">
                  <AlertTriangle
                    size={18}
                    className="animate-pulse text-amber-600"
                  />

                  IMPENDING TRIAL CONVERSIONS (
                  {"<"} 48 HOURS)
                </div>

                <div className="grid gap-3.5 md:grid-cols-2">
                  {impendingTrials.map(
                    (sub) => {
                      const diffMs =
                        new Date(
                          sub.renewalDate
                        ) - new Date();

                      const totalHours =
                        Math.floor(
                          diffMs /
                            (1000 *
                              60 *
                              60)
                        );

                      const days =
                        Math.floor(
                          totalHours / 24
                        );

                      const hours =
                        totalHours % 24;

                      return (
                        <article
                          key={sub._id}
                          onClick={() =>
                            handleCardClick(
                              sub
                            )
                          }
                          className="flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-amber-100 bg-white p-4 shadow-xs transition hover:border-amber-300"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800">
                              {sub.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              Renewal price:{" "}
                              {formatItemCurrency(
                                sub.amount,
                                sub.currency
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-700">
                            <Clock size={13} />

                            <span>
                              {days > 0
                                ? `${days}d `
                                : ""}
                              {hours}h left
                            </span>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {/* =========================
                SPEND METRICS
                ========================= */}
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Monthly Spend */}
              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Monthly Spend
                    </span>

                    <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-500">
                      <DollarSign
                        size={18}
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(
                      totalMonthlySpend
                    )}
                  </p>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Aggregated monthly
                  cost in base currency.
                </p>
              </article>

              {/* Annual Spend */}
              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Annual Spend
                    </span>

                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <TrendingUp
                        size={18}
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(
                      totalAnnualSpend
                    )}
                  </p>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Aggregated annual
                  cost in base currency.
                </p>
              </article>

              {/* Control Center */}
              <article className="flex flex-col justify-between rounded-3xl bg-indigo-600 p-6 text-white shadow-xs sm:col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles size={11} />
                    Control center
                  </div>

                  <h3 className="text-lg font-bold">
                    Manage your stack
                  </h3>

                  <p className="text-xs text-indigo-100">
                    Track promotional
                    dates, free trial
                    end times and cancel
                    services instantly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleAddClick
                  }
                  className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                >
                  <Plus size={18} />
                  Add Subscription
                </button>
              </article>
            </section>

            {/* =========================
                ACTIVE SUBSCRIPTIONS
                ========================= */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  Active Subscriptions

                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {activeSubs.length}
                  </span>
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center rounded-3xl border border-indigo-50 bg-white py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                </div>
              ) : activeSubs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-indigo-200 bg-white py-16 text-center">
                  <WalletCards
                    className="mx-auto mb-4 text-indigo-300"
                    size={40}
                  />

                  <h3 className="text-sm font-bold text-slate-700">
                    No Active Subscriptions
                  </h3>

                  <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
                    Get started by
                    clicking the "Add
                    Subscription"
                    button to track
                    trials or recurring
                    tools.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
                  {activeSubs.map(
                    (sub) => {
                      const isImpending =
                        impendingTrials.some(
                          (trial) =>
                            trial._id ===
                            sub._id
                        );

                      return (
                        <article
                          key={sub._id}
                          onClick={() =>
                            handleCardClick(
                              sub
                            )
                          }
                          className={`sub-item-card cursor-pointer rounded-3xl border bg-white p-5 shadow-xs ${
                            isImpending
                              ? "border-amber-300 ring-2 ring-amber-100"
                              : "border-indigo-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800">
                                  {sub.name}
                                </h3>

                                <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium capitalize text-indigo-600">
                                  {sub.category ||
                                    "AI"}
                                </span>
                              </div>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {sub.planName ||
                                  "PRO TIER"}
                              </p>
                            </div>

                            {sub.isTrial && (
                              <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                Trial
                              </span>
                            )}
                          </div>

                          <div className="mt-5 flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold text-slate-900">
                              {formatItemCurrency(
                                sub.amount,
                                sub.currency
                              )}
                            </span>

                            <span className="text-xs capitalize text-slate-400">
                              /
                              {
                                sub.billingCycle
                              }
                            </span>
                          </div>

                          {sub.capabilities &&
                            sub
                              .capabilities
                              .length >
                              0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {sub.capabilities
                                  .slice(
                                    0,
                                    3
                                  )
                                  .map(
                                    (
                                      cap,
                                      index
                                    ) => (
                                      <span
                                        key={`${cap}-${index}`}
                                        className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600"
                                      >
                                        {
                                          cap
                                        }
                                      </span>
                                    )
                                  )}

                                {sub
                                  .capabilities
                                  .length >
                                  3 && (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    +
                                    {sub
                                      .capabilities
                                      .length -
                                      3}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            )}

                          <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3.5 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar
                                size={13}
                                className="text-indigo-400"
                              />

                              <span>
                                {sub.isTrial
                                  ? "Trial ends"
                                  : "Renews"}
                                :{" "}
                                {new Date(
                                  sub.renewalDate
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    month:
                                      "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>

                            <ArrowRight
                              size={13}
                              className="text-slate-300"
                            />
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}

              {/* =========================
                  CANCELLED SUBSCRIPTIONS
                  ========================= */}
              {cancelledSubs.length > 0 && (
                <div className="space-y-4 pt-5">
                  <h3 className="text-md font-bold text-slate-500">
                    Cancelled /
                    Inactive
                    Subscriptions
                  </h3>

                  <div className="grid gap-4.5 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
                    {cancelledSubs.map(
                      (sub) => (
                        <article
                          key={sub._id}
                          onClick={() =>
                            handleCardClick(
                              sub
                            )
                          }
                          className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:opacity-100"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-700 line-through">
                                {sub.name}
                              </h4>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {sub.planName ||
                                  "PRO TIER"}
                              </p>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                              Inactive
                            </span>
                          </div>

                          <div className="mt-4 text-xs font-semibold text-slate-500">
                            Amount:{" "}
                            {formatItemCurrency(
                              sub.amount,
                              sub.currency
                            )}
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* =========================
              ADD / EDIT DRAWER
              ========================= */}
          <AddSubscriptionDrawer
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setSubToEdit(null);
            }}
            onSuccess={
              fetchSubscriptions
            }
            subscriptionToEdit={
              subToEdit
            }
            userCurrency={
              baseCurrency
            }
          />

          {/* =========================
              SUBSCRIPTION DETAIL MODAL
              ========================= */}
          <SubscriptionDetailModal
            subscription={
              selectedSub
            }
            isOpen={isDetailOpen}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedSub(null);
            }}
            onSuccess={
              fetchSubscriptions
            }
            onEdit={
              handleEditClick
            }
          />
        </main>

        {/* =========================
            MOBILE NAVIGATION
            ========================= */}
        <CashFlowMobileNav />
      </div>
    </div>
  );
}