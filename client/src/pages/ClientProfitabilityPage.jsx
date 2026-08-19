import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Briefcase,
  CircleDollarSign,
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { fetchClientProfitability } from "../api/profitabilityApi";
import { formatMoney, formatPercent } from "../pages/ProfitabilityPage";
import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import "../styles/cashFlow.css";

const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#84cc16", // lime
];

const ClientProfitabilityPage = () => {
  const { user } = useAuth();
  const baseCurrency = user?.baseCurrency || "BDT";

  // Get client ID from route params
  const pathParts = window.location.pathname.split("/");
  const clientId = pathParts[pathParts.length - 1] || "";

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchClientProfitability(clientId);
      setReport(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Client profitability data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  // If no clientId, redirect to dashboard
  if (!clientId) {
    window.location.href = "/profitability";
    return null;
  }

  return (
    <div className="cf-page">
      <CashFlowSidebar />
      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-500">
                  <CircleDollarSign size={15} />
                  Project / Client Analysis
                </div>
                <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {report?.clients?.[0]?.name || "Client Profitability"}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Compare revenue vs. costs for {report?.clients?.[0]?.name || "this client"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (window.location.href = "/profitability")}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
              >
                <ChevronLeft size={14} /> Back to Dashboard
              </button>
            </header>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center rounded-3xl border border-indigo-100 bg-white py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
              </div>
            ) : (
              <>
                <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard
                    icon={Banknote}
                    label="Total Revenue"
                    value={formatMoney(report?.summary?.totalRevenue, baseCurrency)}
                    tone="emerald"
                    iconTone="bg-emerald-50 text-emerald-600"
                  />
                  <SummaryCard
                    icon={TrendingDown}
                    label="Total Costs"
                    value={formatMoney(report?.summary?.totalCosts, baseCurrency)}
                    tone="rose"
                    iconTone="bg-rose-50 text-rose-500"
                  />
                  <SummaryCard
                    icon={TrendingUp}
                    label="Net Profit"
                    value={formatMoney(report?.summary?.netProfit, baseCurrency)}
                    tone={report?.summary?.netProfit >= 0 ? "indigo" : "rose"}
                    iconTone={report?.summary?.netProfit >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-500"}
                  />
                  <SummaryCard
                    icon={Users}
                    label="Clients / Projects"
                    value={String(report?.summary?.clientCount || 0)}
                    tone="violet"
                    iconTone="bg-violet-50 text-violet-600"
                  />
                </section>

                <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                  <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-indigo-500" size={19} />
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-800">
                          Revenue vs. Costs
                        </h2>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          All amounts converted to {baseCurrency}.
                        </p>
                      </div>
                    </div>

                    <div className="w-full max-w-2xl">
                      {report?.clients.length > 0 && (
                        <div className="space-y-3">
                          {report.clients.map((client) => (
                            <div
                              key={client._id}
                              className="p-4 rounded-lg border border-slate-100 bg-white"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">
                                  {client.name}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-bold ${client.profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                                  {client.profit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                  {formatPercent(client.margin)} margin
                                </span>
                              </div>

                              {/* Revenue Section */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <ArrowUpRight size={11} className="text-emerald-500" /> Revenue
                                  </span>
                                  <span className="font-extrabold text-emerald-600">
                                    {formatMoney(client.revenue, baseCurrency)}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${Math.max(4, Math.min(100, (client.revenue / Math.max(client.costs || 1, 1)) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              {/* Costs Section */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <ArrowDownRight size={11} className="text-rose-500" /> Costs
                                  </span>
                                  <span className="font-extrabold text-rose-500">
                                    {formatMoney(client.costs, baseCurrency)}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-rose-400"
                                    style={{ width: `${Math.max(4, Math.min(100, (client.costs / Math.max(client.revenue || 1, 1)) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {report?.clients.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                          <Briefcase className="mx-auto mb-4 text-indigo-300" size={42} />
                          <h3 className="text-sm font-bold text-slate-700">No data yet</h3>
                          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-400">
                            No incomes or expenses tagged to this client yet.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                {/* ── Expense Category Breakdown ── */}
                {report?.categoryBreakdown?.length > 0 && (
                  <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-5">
                      <BarChart3 className="text-indigo-500" size={19} />
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-800">Expense Breakdown by Category</h2>
                        <p className="mt-0.5 text-[10px] text-slate-400">All amounts converted to {baseCurrency}.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-8 px-6 py-6 lg:flex-row lg:items-start">
                      {/* Pie chart */}
                      <div className="flex-shrink-0 lg:w-72">
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={report.categoryBreakdown}
                              dataKey="total"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={100}
                              paddingAngle={3}
                            >
                              {report.categoryBreakdown.map((entry, idx) => (
                                <Cell
                                  key={entry.slug}
                                  fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val) => [formatMoney(val, baseCurrency), "Total"]}
                              contentStyle={{ fontSize: 12, borderRadius: 10 }}
                            />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: 11 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar list */}
                      <div className="flex-1 space-y-3">
                        {report.categoryBreakdown.map((cat, idx) => {
                          const totalCosts = report.summary.totalCosts || 1;
                          const pct = Math.max(2, Math.min(100, (cat.total / totalCosts) * 100));
                          return (
                            <div key={cat.slug}>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                    style={{ background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                                  />
                                  {cat.category}
                                  <span className="ml-1 text-slate-400">({cat.count} expense{cat.count !== 1 ? "s" : ""})</span>
                                </span>
                                <span className="font-extrabold text-slate-800">
                                  {formatMoney(cat.total, baseCurrency)}
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
        <CashFlowMobileNav />
      </div>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, tone, iconTone }) {
  const valueTone =
    tone === "emerald" ? "text-emerald-600"
    : tone === "rose" ? "text-rose-500"
    : tone === "violet" ? "text-violet-600"
    : "text-indigo-600";

  return (
    <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconTone || "bg-indigo-50 text-indigo-600"}`}>
          <Icon size={17} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      </div>
      <strong className={`mt-4 block truncate text-2xl font-extrabold tracking-tight ${valueTone}`} title={value}>
        {value}
      </strong>
    </article>
  );
}

export default ClientProfitabilityPage;