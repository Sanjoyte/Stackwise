import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Pencil,
  Wallet,
  TrendingUp,
  CreditCard,
} from "lucide-react";

import { formatCurrency } from "../../utils/formatCurrency";
import {
  HISTORY_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
} from "../../utils/teamRequestLabels";
import { getBudgetImpact } from "../../api/teamRequestApi";

function BudgetImpactPreview({ requestId }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    getBudgetImpact(requestId)
      .then((data) => {
        if (!cancelled) setImpact(data.budgetImpact);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              "Could not load the budget-impact preview"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 py-6 text-sm text-indigo-500">
        <Loader2 size={16} className="animate-spin" />
        Calculating budget impact...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (!impact) return null;

  const rows = [
    ["Current budget", formatCurrency(impact.currentBudget, impact.currency)],
    [
      "Current spending",
      formatCurrency(impact.currentSpending, impact.currency),
    ],
    [
      "Remaining budget",
      formatCurrency(impact.remainingBudget, impact.currency),
    ],
    [
      "Requested amount",
      formatCurrency(impact.requestedAmount, impact.requestCurrency),
    ],
    [
      "Projected spending",
      formatCurrency(impact.projectedSpending, impact.currency),
    ],
    [
      "Remaining after approval",
      formatCurrency(impact.remainingBudgetAfterApproval, impact.currency),
    ],
    [
      "Budget utilization",
      impact.budgetUtilization === null
        ? "N/A (no budget set)"
        : `${impact.budgetUtilization}%`,
    ],
  ];

  if (impact.annualCost !== null) {
    rows.push([
      "Annual cost (recurring)",
      formatCurrency(impact.annualCost, impact.currency),
    ]);
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
        <TrendingUp size={16} />
        Budget-impact preview
      </div>

      {impact.currencyMismatch && (
        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
          Note: request currency ({impact.requestCurrency}) differs from the
          team currency ({impact.currency}); no conversion has been applied.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-semibold text-slate-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {impact.isOverBudget && (
        <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
          Approving this request will put the team over its monthly budget.
        </p>
      )}
    </div>
  );
}

export default function RequestDetailModal({
  open,
  onClose,
  request,
  isAdmin,
  isOwner,
  onApprove,
  onReject,
  onRequestModification,
  onEditResubmit,
  onPay,
}) {
  const [actionMode, setActionMode] = useState(null); // "reject" | "modify" | null
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (open) {
      setActionMode(null);
      setMessage("");
      setActionError("");
    }
  }, [open, request?.id]);

  if (!open || !request) return null;

  const canReview = isAdmin && request.status === "pending";
  const canEdit = isOwner && request.status === "modification_requested";

  const runAction = async (fn) => {
    setBusy(true);
    setActionError("");

    try {
      await fn();
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-indigo-100 bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={statusBadgeClass(request.status)}>
              {STATUS_LABELS[request.status]}
            </span>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {request.title}
            </h2>

            <p className="mt-0.5 text-sm text-slate-400">
              Submitted by {request.requestedByName || "a team member"}
              {request.requestedByEmail
                ? ` (${request.requestedByEmail})`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Core fields */}
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <div>
            <p className="text-slate-400">Type</p>
            <p className="font-semibold capitalize text-slate-900">
              {request.requestType}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Amount</p>
            <p className="font-semibold text-slate-900">
              {formatCurrency(request.amount, request.currency)}
              {request.requestType === "subscription" &&
                request.billingCycle && (
                  <span className="text-slate-400"> / {request.billingCycle}</span>
                )}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Category</p>
            <p className="font-semibold text-slate-900">{request.category}</p>
          </div>
          <div>
            <p className="text-slate-400">Submitted</p>
            <p className="font-semibold text-slate-900">
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-400">Reason</p>
            <p className="font-medium text-slate-900">{request.reason}</p>
          </div>
          {request.description && (
            <div className="col-span-2">
              <p className="text-slate-400">Description</p>
              <p className="font-medium text-slate-900">
                {request.description}
              </p>
            </div>
          )}
        </div>

        {/* Payment status, once approved */}
        {request.status === "approved" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CreditCard size={16} />
            <span className="font-semibold">
              Payment {request.payment?.status || "unpaid"}
            </span>
            {request.payment?.transactionId && (
              <span className="text-emerald-500">
                &middot; Ref: {request.payment.transactionId}
              </span>
            )}
          </div>
        )}

        {request.adminMessage &&
          (request.status === "rejected" ||
            request.status === "modification_requested") && (
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              <span className="font-semibold">Admin message: </span>
              {request.adminMessage}
            </div>
          )}

        {/* Budget impact preview - admin only, while pending */}
        {isAdmin && (
          <div className="mt-5">
            <BudgetImpactPreview requestId={request.id} />
          </div>
        )}

        {/* History timeline */}
        {request.history?.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Wallet size={15} />
              History
            </p>

            <div className="team-timeline">
              {request.history.map((entry, index) => (
                <div key={index} className="team-timeline-item">
                  <span className="team-timeline-dot" />
                  <p className="text-sm font-semibold text-slate-800">
                    {HISTORY_LABELS[entry.action] || entry.action}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(entry.at).toLocaleString()}
                  </p>
                  {entry.message && (
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {actionError && (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {actionError}
          </p>
        )}

        {/* Admin review actions */}
        {canReview && (
          <div className="mt-6 space-y-3">
            {actionMode === null && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(() => onApprove(request.id))
                  }
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Approve
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActionMode("modify")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  <MessageSquareWarning size={16} />
                  Modify
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActionMode("reject")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            )}

            {actionMode === "reject" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Rejection message{" "}
                  <span className="normal-case text-slate-300">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={2}
                  placeholder="Let the team member know why (optional)"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActionMode(null)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(() => onReject(request.id, message))
                    }
                    className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Confirm rejection
                  </button>
                </div>
              </div>
            )}

            {actionMode === "modify" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  What should change?{" "}
                  <span className="normal-case text-red-400">(required)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={2}
                  placeholder="e.g. Please provide a cheaper plan tier and re-confirm the annual cost"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActionMode(null)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy || !message.trim()}
                    onClick={() =>
                      runAction(() =>
                        onRequestModification(request.id, message)
                      )
                    }
                    className="flex-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Send back to member
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {isAdmin && request.status === "approved" && request.payment?.status !== "paid" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => onPay(request.id))}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Pay now with SSLCOMMERZ
          </button>
        )}

        {/* Member: edit + resubmit */}
        {canEdit && (
          <button
            type="button"
            onClick={() => onEditResubmit(request)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Pencil size={16} />
            Edit & resubmit
          </button>
        )}
      </div>
    </div>
  );
}
