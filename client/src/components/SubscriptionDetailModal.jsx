import { X, Share2, Shield, Trash2, CheckCircle2, AlertTriangle, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios";
import "../sub_show.css";

export default function SubscriptionDetailModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
  onEdit,
}) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, expired: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!subscription || !subscription.renewalDate) return;

    const updateCountdown = () => {
      const diff = new Date(subscription.renewalDate) - new Date();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, expired: true });
        return;
      }
      const totalHours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      setCountdown({ days, hours, expired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // update every minute

    return () => clearInterval(interval);
  }, [subscription]);

  if (!isOpen || !subscription) return null;

  const handleConfirmSubscription = async () => {
    setLoading(true);
    setError("");
    try {
      // Confirm subscription = convert trial to regular paid subscription
      await api.put(`/subscriptions/${subscription._id}`, { isTrial: false });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrialOrSub = async () => {
    setLoading(true);
    setError("");
    try {
      // Cancel trial/sub = update status to 'cancelled'
      await api.put(`/subscriptions/${subscription._id}`, { status: "cancelled" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this subscription?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.delete(`/subscriptions/${subscription._id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const text = `Subscription Details: ${subscription.name} - ${subscription.planName} (${subscription.currency} ${subscription.amount}/${subscription.billingCycle})`;
    navigator.clipboard.writeText(text);
    alert("Subscription details copied to clipboard!");
  };

  const formatCurrency = (val, curr) => {
    if (curr === "USD") return `$${Number(val).toFixed(2)}`;
    if (curr === "BDT") return `৳${Number(val).toFixed(2)}`;
    return `${curr} ${Number(val).toFixed(2)}`;
  };

  const formattedDate = new Date(subscription.renewalDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs px-4">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="sub-show-bg relative z-10 w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-3xl p-6 shadow-2xl space-y-6 md:p-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-indigo-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-full bg-white p-2 text-slate-400 hover:text-indigo-600 shadow-sm transition"
            >
              <X size={18} />
            </button>
            <span className="text-lg font-bold text-indigo-900">Subscription Details</span>
          </div>

          <button
            onClick={() => onEdit(subscription)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
          >
            <Edit size={14} />
            Edit
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Title Section */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="sub-show-badge-ai px-3 py-1 font-semibold uppercase tracking-wider">
              {subscription.category || "AI"}
            </span>
            {subscription.isTrial && (
              <span className="sub-show-badge-trial px-3 py-1 font-semibold flex items-center gap-1">
                <Shield size={12} className="text-amber-600" />
                Free Trial Active
              </span>
            )}
            {subscription.status === "cancelled" && (
              <span className="bg-red-100 border border-red-200 text-red-600 rounded-full px-3 py-1 text-xs font-bold uppercase">
                Cancelled
              </span>
            )}
          </div>
          <h1 className="sub-show-title font-semibold tracking-tight">{subscription.name}</h1>
          <p className="sub-show-desc text-slate-500">
            Manage your premium access and renewal settings.
          </p>
        </div>

        {/* Share Access Action */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2.5 rounded-xl border border-slate-900 bg-white px-4 py-3 shadow-xs hover:bg-slate-50 transition w-full justify-center md:w-auto"
        >
          <Share2 size={16} className="text-slate-900" />
          <span className="text-sm font-semibold text-slate-900">Share Access Details</span>
        </button>

        {/* Trial Specific Modules */}
        {subscription.isTrial && subscription.status === "active" && (
          <div className="space-y-4">
            
            {/* Trial Countdown Card */}
            <div className="sub-show-card-white p-5 border border-indigo-50">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                TRIAL ENDS IN
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-indigo-600">
                  {String(countdown.days).padStart(2, "0")}
                </span>
                <span className="text-sm font-bold text-slate-400 mr-4">days</span>
                <span className="text-5xl font-extrabold text-indigo-600">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="text-sm font-bold text-slate-400">hours</span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                <AlertTriangle size={15} className="text-amber-500" />
                <span>First payment scheduled for {formattedDate}</span>
              </div>
            </div>

            {/* Renewal Price Card */}
            <div className="sub-show-card-primary p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Renewal Price
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </span>
                  <span className="text-sm text-indigo-200">
                    /{subscription.billingCycle === "annual" ? "yr" : subscription.billingCycle === "weekly" ? "wk" : "mo"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-indigo-100">
                  After your trial ends, your preferred payment method will be charged.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 bg-[#280d94]/30 rounded-lg p-3 text-xs font-semibold">
                <div>
                  <p className="text-indigo-200 font-medium">Current Plan</p>
                  <p className="text-white text-sm mt-0.5">{subscription.planName || "PRO TIER"}</p>
                </div>
                <div className="text-right">
                  <p className="text-indigo-200 font-medium">Billing Cycle</p>
                  <p className="text-white text-sm mt-0.5 capitalize">{subscription.billingCycle}</p>
                </div>
              </div>
            </div>

            {/* Action Card: Keep Sub */}
            <div className="sub-show-card-white p-5 border border-indigo-50 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Keep Subscription</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Secure your access and prevent service interruption. You won't be charged until the trial period ends.
                </p>
              </div>
              <button
                onClick={handleConfirmSubscription}
                disabled={loading}
                className="sub-show-btn-primary flex items-center justify-center gap-2 w-full py-3 font-semibold transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                Confirm Subscription
              </button>
            </div>

            {/* Action Card: Cancel Trial */}
            <div className="sub-show-card-white p-5 border border-indigo-50 space-y-4">
              <div>
                <h3 className="font-semibold text-red-500 text-sm">Cancel Trial</h3>
                <p className="text-xs text-slate-500 mt-1">
                  End your subscription now. You may lose access to premium features immediately or at expiration.
                </p>
              </div>
              <button
                onClick={handleCancelTrialOrSub}
                disabled={loading}
                className="sub-show-btn-cancel flex items-center justify-center gap-2 w-full py-3 font-semibold transition hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                <X size={16} />
                Cancel Trial
              </button>
            </div>

          </div>
        )}

        {/* Regular Paid / Standard Subscription View */}
        {(!subscription.isTrial || subscription.status === "cancelled") && (
          <div className="sub-show-card-primary p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                {subscription.status === "cancelled" ? "Final Price" : "Renewal Price"}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </span>
                <span className="text-sm text-indigo-200">
                  /{subscription.billingCycle === "annual" ? "yr" : subscription.billingCycle === "weekly" ? "wk" : "mo"}
                </span>
              </div>
              <p className="mt-2 text-xs text-indigo-100">
                {subscription.status === "cancelled"
                  ? `Subscription is cancelled. Access remains valid until ${formattedDate}.`
                  : `Next billing scheduled for ${formattedDate}.`}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 bg-[#280d94]/30 rounded-lg p-3 text-xs font-semibold">
              <div>
                <p className="text-indigo-200 font-medium">Plan Tier</p>
                <p className="text-white text-sm mt-0.5">{subscription.planName || "PRO TIER"}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-200 font-medium">Billing Cycle</p>
                <p className="text-white text-sm mt-0.5 capitalize">{subscription.billingCycle}</p>
              </div>
            </div>
          </div>
        )}

        {/* Capability Tags */}
        {subscription.capabilities && subscription.capabilities.length > 0 && (
          <div className="sub-show-card-white p-5 border border-indigo-50 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm border-b border-indigo-50 pb-2">
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {subscription.capabilities.map((cap, index) => (
                <span key={`${cap}-${index}`} className="sub-show-tag-chip">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Information Fields */}
        <div className="sub-show-card-white p-5 border border-indigo-50 space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm border-b border-indigo-50 pb-2">
            Subscription Information
          </h3>
          <div className="grid grid-cols-2 gap-y-3.5 text-sm">
            <div>
              <p className="sub-show-label text-xs">Registered Name</p>
              <p className="sub-show-value mt-0.5">Jawad Chowdhury</p>
            </div>
            <div>
              <p className="sub-show-label text-xs">Payment Method</p>
              <p className="sub-show-value mt-0.5 capitalize">{subscription.paymentMethod || "Visa | **** 2466"}</p>
            </div>
            <div className="col-span-2">
              <p className="sub-show-label text-xs">Registered Email</p>
              <p className="sub-show-value mt-0.5 break-all">
                {subscription.registeredEmail || "amimachkhai27@gmail.com"}
              </p>
            </div>
            {subscription.paymentPortalUrl && (
              <div className="col-span-2">
                <p className="sub-show-label text-xs">Manage/Cancel URL</p>
                <a
                  href={subscription.paymentPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 underline mt-0.5 block break-all hover:text-indigo-800"
                >
                  {subscription.paymentPortalUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Subscription (for Active Paid Subscriptions) */}
        {subscription.status === "active" && !subscription.isTrial && (
          <button
            onClick={handleCancelTrialOrSub}
            disabled={loading}
            className="sub-show-btn-cancel flex items-center justify-center gap-2 w-full py-3.5 font-semibold transition hover:bg-red-50 disabled:opacity-50 cursor-pointer"
          >
            <X size={16} />
            Cancel Subscription
          </button>
        )}

        {/* Delete Subscription (Always available at the bottom) */}
        <button
          onClick={handleDeleteSubscription}
          disabled={loading}
          className="sub-show-btn-delete flex items-center justify-center gap-2 w-full py-3.5 font-semibold transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          <Trash2 size={16} />
          Delete Subscription
        </button>

      </div>
    </div>
  );
}
