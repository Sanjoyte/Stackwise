import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import BrandMark from "../components/BrandMark";
import { CashFlowSidebar, CashFlowMobileNav } from "../components/cashflow/CashFlowNav";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  getCapabilityLabel,
  normalizeCapabilities,
} from "../utils/overlapUtils";

import "../subscriptions.css";
import "../styles/cashFlow.css";

const USD_TO_BDT = 120;

export default function OverlapPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const baseCurrency = user?.baseCurrency || "BDT";

  const [activeSubs, setActiveSubs] = useState([]);
  const [overlapGroups, setOverlapGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      displayAmount: formatCurrency(sub.amount),
    };
  };

  const fetchOverlapData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/subscriptions/overlap");
      setActiveSubs(res.data.subscriptions || []);
      setOverlapGroups(res.data.overlapGroups || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch overlap alerts:", err);
      setError("Failed to fetch overlap alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlapData();
  }, []);

  const overlapMemberMap = useMemo(() => {
    const map = new Map();
    overlapGroups.forEach((group) => {
      group.subscriptions.forEach((sub) => map.set(sub._id, true));
    });
    return map;
  }, [overlapGroups]);

  const hasOverlap = overlapGroups.length > 0;

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark darkText />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/subscription")}
                  className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 sm:inline-flex"
                >
                  Manage Subscriptions
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
                  Logout
                </button>
              </div>
            </header>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <section className="rounded-3xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                  <span className="text-lg font-bold">!</span>
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                    Overlap detection
                  </p>
                  <h3 className="text-lg font-bold text-slate-900">
                    View duplicate capability overlap across active subscriptions
                  </h3>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                This page uses the same overlap detection rules as your subscription dashboard.
                It checks active subscriptions for shared feature capability tags and matching amounts.
              </p>
            </section>

            {loading ? (
              <div className="flex items-center justify-center rounded-3xl border border-indigo-50 bg-white py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
              </div>
            ) : !hasOverlap ? (
              <section className="rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-xs">
                <WalletCards className="mx-auto mb-4 text-indigo-300" size={40} />
                <h3 className="text-lg font-bold text-slate-900">No overlap detected</h3>
                <p className="mt-2 text-sm text-slate-500">
                  We did not find any active subscriptions with duplicate capabilities and matching amounts.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/subscription")}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  View subscriptions
                  <ArrowRight size={16} />
                </button>
              </section>
            ) : (
              <>
                <section className="rounded-3xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <span className="text-lg font-bold">!</span>
                    </span>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                        Overlap alert
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {overlapGroups.length} duplicate capability overlap{overlapGroups.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    One or more active subscriptions share the same capability tags and amount.
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

                {overlapGroups.map((group, groupIndex) => (
                  <section
                    key={`overlap-${groupIndex}`}
                    className="rounded-3xl border border-rose-200 bg-white p-5 shadow-xs"
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
                                  {new Date(sub.renewalDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}
