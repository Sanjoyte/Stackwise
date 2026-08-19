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
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import BrandMark from "../components/BrandMark";
import AddSubscriptionDrawer from "../components/AddSubscriptionDrawer";
import SubscriptionDetailModal from "../components/SubscriptionDetailModal";
import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

import "../subscriptions.css";
import "../styles/cashFlow.css";

const USD_TO_BDT = 120;

const MASTER_CAPABILITY_CATALOG = [
  {
    key: "writing",
    label: "Writing Assistance",
    patterns: ["write", "content", "copy", "draft", "blog", "story"],
  },
  {
    key: "chat",
    label: "Chat Assistance",
    patterns: ["chat", "assistant", "conversational", "dialogue"],
  },
  {
    key: "image generation",
    label: "Image Generation",
    patterns: ["image", "visual", "picture", "illustration", "design", "art"],
  },
  {
    key: "api access",
    label: "API Access",
    patterns: ["api", "integration", "endpoint", "developer"],
  },
  {
    key: "automation",
    label: "Workflow Automation",
    patterns: ["automate", "automation", "workflow", "process"],
  },
  {
    key: "analytics",
    label: "Analytics",
    patterns: ["analytics", "report", "data", "insight", "tracking"],
  },
  {
    key: "collaboration",
    label: "Collaboration",
    patterns: ["team", "collaborate", "shared", "workspace"],
  },
  {
    key: "translation",
    label: "Translation",
    patterns: ["translate", "translation", "language", "localize"],
  },
  {
    key: "code assistance",
    label: "Code Assistance",
    patterns: ["code", "developer", "programming", "debug", "syntax"],
  },
  {
    key: "security",
    label: "Security",
    patterns: ["security", "privacy", "encrypt", "auth", "compliance"],
  },
];

const CAPABILITY_LABELS = MASTER_CAPABILITY_CATALOG.reduce((map, entry) => {
  map[entry.key] = entry.label;
  return map;
}, {});

function normalizeCapabilities(caps = []) {
  const normalized = Array.from(
    new Set(
      (caps || [])
        .map((cap) => cap?.toString().trim())
        .filter(Boolean)
        .map((cap) => cap.toLowerCase())
    )
  );

  return normalized.map((cap) => {
    const matched = MASTER_CAPABILITY_CATALOG.find((entry) =>
      entry.patterns.some((pattern) => cap.includes(pattern))
    );

    return matched ? matched.key : cap;
  });
}

function getCapabilityLabel(capability) {
  return CAPABILITY_LABELS[capability] || capability;
}

export default function SubscriptionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [overlapGroups, setOverlapGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subToEdit, setSubToEdit] = useState(null);

  const baseCurrency = user?.baseCurrency || "BDT";

  const convertToUserBase = (amount, fromCurrency) => {
    const numericAmount = Number(amount) || 0;

    if (fromCurrency === baseCurrency) return numericAmount;
    if (fromCurrency === "USD" && baseCurrency === "BDT") {
      return numericAmount * USD_TO_BDT;
    }
    if (fromCurrency === "BDT" && baseCurrency === "USD") {
      return numericAmount / USD_TO_BDT;
    }

    return numericAmount;
  };

  const formatCurrency = (value) => {
    const numericValue = Number(value) || 0;

    if (baseCurrency === "USD") {
      return `$${numericValue.toFixed(2)}`;
    }

    return `৳${numericValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  const formatItemCurrency = (value, currency) => {
    const numericValue = Number(value) || 0;

    if (currency === "USD") return `$${numericValue.toFixed(2)}`;
    if (currency === "BDT") return `৳${numericValue.toFixed(0)}`;
    return `${currency} ${numericValue.toFixed(2)}`;
  };

  const getSubscriptionSpend = (sub) => {
    const amountInBase = convertToUserBase(sub.amount, sub.currency);
    let monthlyAmount = amountInBase;
    let annualAmount = amountInBase;

    if (sub.billingCycle === "annual") {
      monthlyAmount = amountInBase / 12;
    } else if (sub.billingCycle === "weekly") {
      monthlyAmount = amountInBase * 4.33;
    }

    if (sub.billingCycle === "monthly") {
      annualAmount = amountInBase * 12;
    } else if (sub.billingCycle === "weekly") {
      annualAmount = amountInBase * 52;
    }

    return {
      monthly: monthlyAmount,
      annual: annualAmount,
      displayAmount: formatItemCurrency(sub.amount, sub.currency),
    };
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const [subscriptionsResponse, overlapResponse] = await Promise.all([
        api.get("/subscriptions"),
        api.get("/subscriptions/overlap"),
      ]);
      setSubscriptions(subscriptionsResponse.data.subscriptions || []);
      setOverlapGroups(overlapResponse.data.overlapGroups || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError("Failed to fetch subscriptions. Please try reloading.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

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

  const activeSubs = useMemo(
    () => subscriptions.filter((sub) => sub.status === "active"),
    [subscriptions]
  );

  const cancelledSubs = useMemo(
    () => subscriptions.filter((sub) => sub.status === "cancelled"),
    [subscriptions]
  );

  const hasOverlap = overlapGroups.length > 0;

  const overlapMemberMap = useMemo(() => {
    const map = new Map();
    overlapGroups.forEach((group) => {
      group.subscriptions.forEach((sub) => map.set(sub._id, true));
    });
    return map;
  }, [overlapGroups]);

  useEffect(() => {
    if (location.hash !== "#overlap") return;

    const target = document.getElementById("overlap-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, overlapGroups.length]);

  const totalMonthlySpend = activeSubs.reduce((sum, sub) => {
    const amountInBase = convertToUserBase(sub.amount, sub.currency);
    let monthlyAmount = amountInBase;

    if (sub.billingCycle === "annual") {
      monthlyAmount = amountInBase / 12;
    } else if (sub.billingCycle === "weekly") {
      monthlyAmount = amountInBase * 4.33;
    }

    return sum + monthlyAmount;
  }, 0);

  const totalAnnualSpend = activeSubs.reduce((sum, sub) => {
    const amountInBase = convertToUserBase(sub.amount, sub.currency);
    let annualAmount = amountInBase;

    if (sub.billingCycle === "monthly") {
      annualAmount = amountInBase * 12;
    } else if (sub.billingCycle === "weekly") {
      annualAmount = amountInBase * 52;
    }

    return sum + annualAmount;
  }, 0);

  const impendingTrials = activeSubs.filter((sub) => {
    if (!sub.isTrial) return false;

    const diffMs = new Date(sub.renewalDate) - new Date();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 0 && diffHours <= 48;
  });

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            {/* Navigation Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark darkText />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/income")}
                  className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 sm:inline-flex"
                >
                  Income Tracking
                </button>

                <span className="hidden items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 sm:inline-flex">
                  <Layers size={13} />
                  Base: {baseCurrency}
                </span>

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

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {/* Trial Countdown */}
            {impendingTrials.length > 0 && (
              <section className="space-y-3.5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-amber-800">
                  <AlertTriangle
                    size={18}
                    className="animate-pulse text-amber-600"
                  />
                  IMPENDING TRIAL CONVERSIONS ({"<"} 48 HOURS)
                </div>

                <div className="grid gap-3.5 md:grid-cols-2">
                  {impendingTrials.map((sub) => {
                    const diffMs = new Date(sub.renewalDate) - new Date();
                    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const days = Math.floor(totalHours / 24);
                    const hours = totalHours % 24;

                    return (
                      <article
                        key={sub._id}
                        onClick={() => handleCardClick(sub)}
                        className="flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-amber-100 bg-white p-4 shadow-xs transition hover:border-amber-300"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">
                            {sub.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Renewal price: {formatItemCurrency(sub.amount, sub.currency)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-700">
                          <Clock size={13} />
                          <span>
                            {days > 0 ? `${days}d ` : ""}
                            {hours}h left
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Spend Metrics */}
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Monthly Spend
                    </span>
                    <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-500">
                      <DollarSign size={18} />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(totalMonthlySpend)}
                  </p>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Aggregated monthly cost in base currency.
                </p>
              </article>

              <article className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Annual Spend
                    </span>
                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold text-slate-900">
                    {formatCurrency(totalAnnualSpend)}
                  </p>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Aggregated annual cost in base currency.
                </p>
              </article>

              <article className="flex flex-col justify-between rounded-3xl bg-indigo-600 p-6 text-white shadow-xs sm:col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles size={11} />
                    Control center
                  </div>
                  <h3 className="text-lg font-bold">Manage your stack</h3>
                  <p className="text-xs text-indigo-100">
                    Track promotional dates, free trial end times and cancel
                    services instantly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddClick}
                  className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                >
                  <Plus size={18} />
                  Add Subscription
                </button>
              </article>
            </section>

            {/* Overlap Summary */}
            {hasOverlap && (
              <section
                id="overlap-section"
                className="rounded-3xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <span className="text-lg font-bold">!</span>
                  </span>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                      Overlap alert
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">
                      {overlapGroups.length} duplicate capability overlap
                      {overlapGroups.length === 1 ? "" : "s"}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  One or more subscriptions share the same capability tags and
                  amount, indicating possible redundant AI tool spend.
                </p>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  {overlapGroups.slice(0, 3).map((group, index) => (
                    <div
                      key={`badge-group-${index}`}
                      className="rounded-2xl border border-rose-100 bg-rose-50 p-3"
                    >
                      <p className="font-semibold text-slate-900">
                        Overlap group {index + 1}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.subscriptions.map((sub) => sub.name).join(" / ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Overlap Details */}
            {overlapGroups.length > 0 && (
              <section className="space-y-4">
                {overlapGroups.map((group, groupIndex) => (
                  <div
                    key={`overlap-${groupIndex}`}
                    className="rounded-3xl border border-rose-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Overlap group {groupIndex + 1}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Found subscriptions with shared capability tags.
                        </p>
                      </div>

                      <div className="space-y-2 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Shared capabilities
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          {group.sharedCapabilities.length > 0 ? (
                            group.sharedCapabilities.map((cap) => (
                              <span
                                key={cap}
                                className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700"
                              >
                                {getCapabilityLabel(cap)}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              Similar feature set
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {group.subscriptions.map((sub) => {
                        const spend = getSubscriptionSpend(sub);
                        const sharedTags = new Set(group.sharedCapabilities);

                        return (
                          <div
                            key={sub._id}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-slate-900">
                                  {sub.name}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  {sub.planName || "PRO TIER"} • {sub.category || "AI"}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-indigo-700">
                                  {sub.billingCycle}
                                </span>
                                {overlapMemberMap.get(sub._id) && (
                                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-rose-700">
                                    Overlap
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatCurrency(spend.monthly)} /mo • {formatCurrency(spend.annual)} /yr
                            </p>

                            <div className="mt-4 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {normalizeCapabilities(sub.capabilities).map((cap) => (
                                  <span
                                    key={`${sub._id}-${cap}`}
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                      sharedTags.has(cap)
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {getCapabilityLabel(cap)}
                                  </span>
                                ))}
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-800">
                                  Renewal
                                </p>
                                <p className="mt-1">
                                  {new Date(sub.renewalDate).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Active Subscriptions */}
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
                    Get started by clicking the "Add Subscription" button to
                    track trials or recurring tools.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
                  {activeSubs.map((sub) => {
                    const isImpending = impendingTrials.some(
                      (trial) => trial._id === sub._id
                    );

                    return (
                      <article
                        key={sub._id}
                        onClick={() => handleCardClick(sub)}
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
                                {sub.category || "AI"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {sub.planName || "PRO TIER"}
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
                            {formatItemCurrency(sub.amount, sub.currency)}
                          </span>
                          <span className="text-xs capitalize text-slate-400">
                            /{sub.billingCycle}
                          </span>
                        </div>

                        {sub.capabilities && sub.capabilities.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sub.capabilities.slice(0, 3).map((cap, index) => (
                              <span
                                key={`${cap}-${index}`}
                                className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600"
                              >
                                {cap}
                              </span>
                            ))}
                            {sub.capabilities.length > 3 && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                +{sub.capabilities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-indigo-400" />
                            <span>
                              {sub.isTrial ? "Trial ends" : "Renews"}: {" "}
                              {new Date(sub.renewalDate).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                          <ArrowRight size={13} className="text-slate-300" />
                        </div>

                        {overlapMemberMap.get(sub._id) && (
                          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                            Similar capability overlap detected
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Cancelled Subscriptions */}
              {cancelledSubs.length > 0 && (
                <div className="space-y-4 pt-5">
                  <h3 className="text-md font-bold text-slate-500">
                    Cancelled / Inactive Subscriptions
                  </h3>

                  <div className="grid gap-4.5 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
                    {cancelledSubs.map((sub) => (
                      <article
                        key={sub._id}
                        onClick={() => handleCardClick(sub)}
                        className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:opacity-100"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 line-through">
                              {sub.name}
                            </h4>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {sub.planName || "PRO TIER"}
                            </p>
                          </div>

                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            Inactive
                          </span>
                        </div>

                        <div className="mt-4 text-xs font-semibold text-slate-500">
                          Amount: {formatItemCurrency(sub.amount, sub.currency)}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <AddSubscriptionDrawer
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setSubToEdit(null);
            }}
            onSuccess={fetchSubscriptions}
            subscriptionToEdit={subToEdit}
            userCurrency={baseCurrency}
          />

          <SubscriptionDetailModal
            subscription={selectedSub}
            isOpen={isDetailOpen}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedSub(null);
            }}
            onSuccess={fetchSubscriptions}
            onEdit={handleEditClick}
          />
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}
