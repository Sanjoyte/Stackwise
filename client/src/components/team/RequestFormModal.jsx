import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

const emptyForm = {
  requestType: "subscription",
  title: "",
  amount: "",
  currency: "USD",
  category: "",
  reason: "",
  description: "",
  billingCycle: "monthly",
};

// Used both to create a brand new request, and to edit + resubmit a
// request that the admin sent back for modification.
export default function RequestFormModal({
  open,
  onClose,
  onSubmit,
  initialRequest = null,
  defaultCurrency = "USD",
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(initialRequest);

  useEffect(() => {
    if (!open) return;

    if (initialRequest) {
      setForm({
        requestType: initialRequest.requestType,
        title: initialRequest.title,
        amount: String(initialRequest.amount),
        currency: initialRequest.currency,
        category: initialRequest.category,
        reason: initialRequest.reason,
        description: initialRequest.description || "",
        billingCycle: initialRequest.billingCycle || "monthly",
      });
    } else {
      setForm({ ...emptyForm, currency: defaultCurrency });
    }

    setError("");
  }, [open, initialRequest, defaultCurrency]);

  if (!open) return null;

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const amount = Number(form.amount);

    if (!form.title.trim() || form.title.trim().length < 2) {
      setError("Title must contain at least 2 characters");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be a valid number greater than zero");
      return;
    }

    if (!form.category.trim()) {
      setError("Category is required");
      return;
    }

    if (!form.reason.trim()) {
      setError("Reason is required");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        requestType: form.requestType,
        title: form.title.trim(),
        amount,
        currency: form.currency.trim().toUpperCase(),
        category: form.category.trim(),
        reason: form.reason.trim(),
        description: form.description.trim(),
        billingCycle:
          form.requestType === "subscription" ? form.billingCycle : null,
      });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-indigo-100 bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Edit & resubmit request" : "New team request"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {isEditing && initialRequest?.adminMessage && (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <span className="font-semibold">Admin feedback: </span>
            {initialRequest.adminMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Request type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Request type
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { value: "subscription", label: "Tool subscription" },
                { value: "expense", label: "Business expense" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isEditing}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      requestType: option.value,
                    }))
                  }
                  className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                    form.requestType === option.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-500 hover:border-indigo-200"
                  } ${isEditing ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={update("title")}
              placeholder={
                form.requestType === "subscription"
                  ? "e.g. Figma Team Plan"
                  : "e.g. Client dinner - Acme Corp"
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Amount + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Amount
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={update("amount")}
                placeholder="49.99"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Currency
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={update("currency")}
                maxLength={3}
                placeholder="USD"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Billing cycle (subscriptions only) */}
          {form.requestType === "subscription" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Billing cycle
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["weekly", "monthly", "annual"].map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, billingCycle: cycle }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                      form.billingCycle === cycle
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-500 hover:border-indigo-200"
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Category
            </label>
            <input
              type="text"
              value={form.category}
              onChange={update("category")}
              placeholder={
                form.requestType === "subscription"
                  ? "e.g. Design, AI, Productivity"
                  : "e.g. Travel, Client Entertainment"
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Reason
            </label>
            <textarea
              value={form.reason}
              onChange={update("reason")}
              rows={2}
              placeholder="Why does the team need this?"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description{" "}
              <span className="normal-case text-slate-300">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={update("description")}
              rows={2}
              placeholder="Any extra details for the admin"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Resubmit for review" : "Submit request"}
          </button>
        </form>
      </div>
    </div>
  );
}
