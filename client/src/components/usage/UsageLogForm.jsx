import { useState } from "react";
import { Plus } from "lucide-react";
import { createUsageLog } from "../../api/usageAnalyticsApi";

export default function UsageLogForm({ subscriptions, onSaved }) {
  const [form, setForm] = useState({ subscriptionId: subscriptions[0]?.subscription?._id || "", usageCount: 1, usedAt: new Date().toISOString().slice(0, 10), note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try { setSaving(true); setError(""); await createUsageLog(form); setForm((current) => ({ ...current, usageCount: 1, note: "" })); await onSaved(); }
    catch (err) { setError(err.response?.data?.message || "Could not save usage log."); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
    <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Manual usage log</p><h2 className="text-xl font-bold text-slate-900">Record subscription usage</h2></div>
    {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-4">
      <select value={form.subscriptionId} onChange={(e) => setForm({ ...form, subscriptionId: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" required>
        <option value="">Select subscription</option>{subscriptions.map((item) => <option key={item.subscription._id} value={item.subscription._id}>{item.subscription.name}</option>)}
      </select>
      <input type="number" min="1" step="1" value={form.usageCount} onChange={(e) => setForm({ ...form, usageCount: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" aria-label="Number of uses" required />
      <input type="date" max={new Date().toISOString().slice(0, 10)} value={form.usedAt} onChange={(e) => setForm({ ...form, usedAt: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" required />
      <button disabled={saving || !form.subscriptionId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus size={16}/>{saving ? "Saving…" : "Log usage"}</button>
    </div>
    <input value={form.note} maxLength="200" onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" />
  </form>;
}
