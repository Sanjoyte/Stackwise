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
import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import AddSubscriptionDrawer from "../components/AddSubscriptionDrawer";
import SubscriptionDetailModal from "../components/SubscriptionDetailModal";
import { useNavigate } from "react-router";
import "../subscriptions.css";

export default function SubscriptionPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subToEdit, setSubToEdit] = useState(null);

  // Conversion rate: 1 USD = 120 BDT
  const USD_TO_BDT = 120;

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/subscriptions");
      setSubscriptions(res.data.subscriptions || []);
      setError("");
    } catch (err) {
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

  // Calculations for total spends (converted to user's base currency)
  const baseCurrency = user?.baseCurrency || "BDT";

  const convertToUserBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) return amount;
    if (fromCurrency === "USD" && baseCurrency === "BDT") return amount * USD_TO_BDT;
    if (fromCurrency === "BDT" && baseCurrency === "USD") return amount / USD_TO_BDT;
    return amount; // Fallback
  };

  const activeSubs = subscriptions.filter((sub) => sub.status === "active");
  const cancelledSubs = subscriptions.filter((sub) => sub.status === "cancelled");

  // Sum total monthly spend
  const totalMonthlySpend = activeSubs.reduce((sum, sub) => {
    const amountInBase = convertToUserBase(sub.amount, sub.currency);
    let monthlyAmount = amountInBase;
    if (sub.billingCycle === "annual") {
      monthlyAmount = amountInBase / 12;
    } else if (sub.billingCycle === "weekly") {
      monthlyAmount = amountInBase * 4.33; // 52 / 12
    }
    return sum + monthlyAmount;
  }, 0);

  // Sum total annual spend
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

  // Trial Alerts: Active trials expiring within 48 hours
  const impendingTrials = activeSubs.filter((sub) => {
    if (!sub.isTrial) return false;
    const diffMs = new Date(sub.renewalDate) - new Date();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 48;
  });

  const formatCurrency = (val) => {
    if (baseCurrency === "USD") return `$${val.toFixed(2)}`;
    return `৳${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const formatItemCurrency = (val, curr) => {
    if (curr === "USD") return `$${Number(val).toFixed(2)}`;
    if (curr === "BDT") return `৳${Number(val).toFixed(0)}`;
    return `${curr} ${Number(val).toFixed(2)}`;
  };

  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        
        {/* Navigation Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
          <BrandMark darkText />
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/income")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
            >
              Income Tracking
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600">
              <Layers size={13} />
              Base: {baseCurrency}
            </span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-100 cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>

        {/* Warning Alerts / Trial Countdown Panel */}
        {impendingTrials.length > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm tracking-wide">
              <AlertTriangle size={18} className="text-amber-600 animate-pulse" />
              IMPENDING TRIAL CONVERSIONS ({'<'} 48 HOURS)
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
                    className="flex items-center justify-between gap-3.5 rounded-2xl bg-white border border-amber-100 p-4 shadow-xs cursor-pointer hover:border-amber-300 transition"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">{sub.name}</p>
                      <p className="text-xs text-slate-400">Renewal price: {formatItemCurrency(sub.amount, sub.currency)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl">
                      <Clock size={13} />
                      <span>
                        {days > 0 ? `${days}d ` : ""}{hours}h left
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Spend Metrics Summary Panel */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Monthly Spend Card */}
          <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs flex flex-col justify-between">
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

          {/* Annual Spend Card */}
          <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs flex flex-col justify-between">
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

          {/* Actions Quick Card */}
          <article className="rounded-3xl bg-indigo-600 p-6 shadow-xs flex flex-col justify-between text-white sm:col-span-2 lg:col-span-1">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={11} />
                Control center
              </div>
              <h3 className="text-lg font-bold">Manage your stack</h3>
              <p className="text-xs text-indigo-100">
                Track promotional dates, free trial end times and cancel services instantly.
              </p>
            </div>
            <button
              onClick={handleAddClick}
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 cursor-pointer"
            >
              <Plus size={18} />
              Add Subscription
            </button>
          </article>

        </section>

        {/* Subscriptions Lists */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Active Subscriptions
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-700 font-semibold">
                {activeSubs.length}
              </span>
            </h2>

            
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-indigo-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            </div>
          ) : activeSubs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-indigo-200">
              <WalletCards className="mx-auto text-indigo-300 mb-4" size={40} />
              <h3 className="font-bold text-slate-700 text-sm">No Active Subscriptions</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Get started by clicking the "Add Subscription" button to track trials or recurring tools.
              </p>
            </div>
          ) : (
            <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeSubs.map((sub) => {
                const isimpending = impendingTrials.some((t) => t._id === sub._id);
                return (
                  <article
                    key={sub._id}
                    onClick={() => handleCardClick(sub)}
                    className={`sub-item-card bg-white rounded-3xl border p-5 shadow-xs cursor-pointer ${
                      isimpending ? "border-amber-300 ring-2 ring-amber-100" : "border-indigo-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-base">{sub.name}</h3>
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 border border-indigo-100 capitalize">
                            {sub.category || "AI"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{sub.planName || "PRO TIER"}</p>
                      </div>

                      {sub.isTrial && (
                        <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
                          Trial
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {formatItemCurrency(sub.amount, sub.currency)}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">
                        /{sub.billingCycle}
                      </span>
                    </div>

                    {sub.capabilities && sub.capabilities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sub.capabilities.slice(0, 3).map((cap, index) => (
                          <span
                            key={`${cap}-${index}`}
                            className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600"
                          >
                            {cap}
                          </span>
                        ))}
                        {sub.capabilities.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            +{sub.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-400" />
                        <span>
                          {sub.isTrial ? "Trial ends" : "Renews"}:{" "}
                          {new Date(sub.renewalDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-slate-300" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Cancelled Subscriptions Section */}
          {cancelledSubs.length > 0 && (
            <div className="space-y-4 pt-5">
              <h3 className="text-md font-bold text-slate-500">
                Cancelled / Inactive Subscriptions
              </h3>
              <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {cancelledSubs.map((sub) => (
                  <article
                    key={sub._id}
                    onClick={() => handleCardClick(sub)}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs cursor-pointer hover:opacity-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm line-through">{sub.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{sub.planName || "PRO TIER"}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
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

      {/* Slide-out Add/Edit Drawer */}
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

      {/* Subscription Show Detail Modal */}
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
  );
}