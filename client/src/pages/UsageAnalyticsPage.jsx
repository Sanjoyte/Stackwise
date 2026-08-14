import { useEffect, useState } from "react";
import { Activity, BarChart3, CheckCircle2, CircleDollarSign, Gauge, Trash2 } from "lucide-react";
import { CashFlowMobileNav, CashFlowSidebar } from "../components/cashflow/CashFlowNav";
import UsageLogForm from "../components/usage/UsageLogForm";
import { deleteUsageLog, fetchUsageAnalytics } from "../api/usageAnalyticsApi";
import "../styles/cashFlow.css";

const decisionStyle = { Keep: "bg-emerald-100 text-emerald-700", Downgrade: "bg-amber-100 text-amber-700", Cancel: "bg-rose-100 text-rose-700" };

const formatTrendMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

export default function UsageAnalyticsPage() {
  const [data, setData] = useState({ analytics: [], summary: {}, recentLogs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => { try { setLoading(true); setData(await fetchUsageAnalytics()); setError(""); } catch (err) { setError(err.response?.data?.message || "Could not load usage analytics."); } finally { setLoading(false); } };
  useEffect(() => { let active = true; fetchUsageAnalytics().then((result) => { if (active) setData(result); }).catch((err) => { if (active) setError(err.response?.data?.message || "Could not load usage analytics."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const removeLog = async (id) => { await deleteUsageLog(id); await load(); };
  const money = (value, currency) => new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD" }).format(value || 0);

  return <div className="cf-page"><CashFlowSidebar/><div className="cf-workspace"><main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs"><div className="flex items-center gap-3"><Activity className="text-indigo-600"/><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Value intelligence</p><h1 className="text-2xl font-bold text-slate-900">Subscription Usage Analytics</h1></div></div><p className="mt-3 text-sm text-slate-500">Track actual usage, cost per use, historical trends, and Keep, Downgrade, or Cancel decisions.</p></header>
    {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}
    {!loading && <UsageLogForm subscriptions={data.analytics} onSaved={load} />}
    {loading ? <div className="rounded-3xl bg-white p-16 text-center text-slate-500">Calculating subscription value…</div> : <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Analyzed",data.summary.subscriptionsAnalyzed,BarChart3],["Keep",data.summary.keep,CheckCircle2],["Downgrade",data.summary.downgrade,Gauge],["Cancel",data.summary.cancel,CircleDollarSign]].map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-indigo-100 bg-white p-5"><Icon className="text-indigo-500" size={20}/><p className="mt-3 text-xs font-semibold uppercase text-slate-400">{label}</p><p className="text-2xl font-bold text-slate-900">{value || 0}</p></div>)}</section>
      <section className="grid gap-5 lg:grid-cols-2">{data.analytics.map((item) => <article key={item.subscription._id} className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs"><div className="flex justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{item.subscription.name}</h2><p className="text-xs text-slate-500">{item.subscription.planName} · {item.subscription.billingCycle}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${decisionStyle[item.decision.action]}`}>{item.decision.action}</span></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Last 30 days</p><p className="font-bold">{item.usageLast30Days} uses</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Monthly cost</p><p className="font-bold">{money(item.normalizedMonthlyCost,item.subscription.currency)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Cost per use</p><p className="font-bold">{item.costPerUse === null ? "No usage" : money(item.costPerUse,item.subscription.currency)}</p></div></div><div className="ua-trend-scroll mt-4 overflow-x-auto pb-2"><div className="flex h-20 min-w-[40rem] items-end gap-2">{item.trend.map((point) => <div key={point.month} className="flex min-w-16 flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-indigo-400" style={{height:`${Math.max(4,Math.min(56,point.usageCount*6))}px`}} title={`${point.usageCount} uses`}/><span className="text-[9px] text-slate-400">{formatTrendMonth(point.month)}</span></div>)}</div></div><p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800"><strong>{item.decision.action}:</strong> {item.decision.reason}</p></article>)}</section>
      {data.recentLogs.length > 0 && <section className="rounded-3xl border border-indigo-100 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">Recent usage history</h2><div className="mt-4 divide-y divide-slate-100">{data.recentLogs.map((log) => { const item=data.analytics.find((entry)=>entry.subscription._id===log.subscription); return <div key={log._id} className="flex items-center justify-between py-3"><div><p className="text-sm font-bold text-slate-800">{item?.subscription.name || "Subscription"} · {log.usageCount} uses</p><p className="text-xs text-slate-400">{new Date(log.usedAt).toLocaleDateString()} · {log.source}</p></div><button onClick={()=>removeLog(log._id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete usage log"><Trash2 size={16}/></button></div>; })}</div></section>}
    </>}
  </div></main><CashFlowMobileNav/></div></div>;
}
