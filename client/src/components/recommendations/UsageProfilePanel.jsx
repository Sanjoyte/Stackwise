import { useState } from "react";
import { Activity, Check, LoaderCircle } from "lucide-react";
import { updateSubscriptionUsage } from "../../api/recommendationApi";

export default function UsageProfilePanel({ subscriptions, onUpdated }) {
  const [usage, setUsage] = useState(() => Object.fromEntries(
    subscriptions.map((subscription) => [subscription._id, subscription.usagePercentage ?? 100])
  ));
  const [savingId, setSavingId] = useState("");
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");

  const saveUsage = async (subscription) => {
    const value = Number(usage[subscription._id]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("Usage must be between 0% and 100%.");
      return;
    }

    try {
      setSavingId(subscription._id);
      setError("");
      await updateSubscriptionUsage(subscription._id, value);
      setSavedId(subscription._id);
      await onUpdated();
      window.setTimeout(() => setSavedId(""), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save usage.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Activity size={21} /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Recommendation input</p>
          <h2 className="text-xl font-bold text-slate-900">Actual monthly usage</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update how much you use each tool. Usage below 40% is automatically marked underutilized and recalculates your recommendations.
          </p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {subscriptions.map((subscription) => {
          const value = Number(usage[subscription._id] ?? 100);
          const underutilized = value < 40;
          return (
            <div key={subscription._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{subscription.name}</h3>
                  <p className={`mt-1 text-xs font-semibold ${underutilized ? "text-amber-600" : "text-emerald-600"}`}>
                    {underutilized ? "Underutilized" : "Healthy usage"}
                  </p>
                </div>
                <span className="text-lg font-bold text-indigo-600">{value}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={value}
                onChange={(event) => setUsage((current) => ({ ...current, [subscription._id]: event.target.value }))}
                className="mt-4 w-full accent-indigo-600"
                aria-label={`${subscription.name} monthly usage`}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">0% rarely used · 100% used daily</span>
                <button
                  type="button"
                  onClick={() => saveUsage(subscription)}
                  disabled={savingId === subscription._id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {savingId === subscription._id ? <LoaderCircle className="animate-spin" size={13} /> : savedId === subscription._id ? <Check size={13} /> : null}
                  {savedId === subscription._id ? "Saved" : "Save usage"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
