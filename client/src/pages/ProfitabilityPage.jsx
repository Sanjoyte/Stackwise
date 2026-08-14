import { useEffect, useState } from "react";
import { Link } from "react-router"; // or 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  Crown,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { fetchProfitability } from "../api/profitabilityApi";
import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";

import "../styles/cashFlow.css";

export const formatMoney = (value, currency) => {
  const num = Number(value || 0);
  if (currency === "USD") return `$${num.toFixed(2)}`;
  if (currency === "EUR") return `€${num.toFixed(2)}`;
  if (currency === "GBP") return `£${num.toFixed(2)}`;
  return `৳${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const formatPercent = (value) => {
  const num = Number(value || 0);
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
};

export default function ProfitabilityPage() {
  const { user } = useAuth();
  const baseCurrency = user?.baseCurrency || "BDT";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchProfitability();
      setReport(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Profitability data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summary = report?.summary;
  const clients = report?.clients || [];

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
                  Profitability Dashboard
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Compare revenue vs. costs for every client and project to see which
                  relationships are most profitable — and which are costing more than they earn.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
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
                    value={formatMoney(summary?.totalRevenue, baseCurrency)}
                    tone="emerald"
                    iconTone="bg-emerald-50 text-emerald-600"
                  />
                  <SummaryCard
                    icon={TrendingDown}
                    label="Total Costs"
                    value={formatMoney(summary?.totalCosts, baseCurrency)}
                    tone="rose"
                    iconTone="bg-rose-50 text-rose-500"
                  />
                  <SummaryCard
                    icon={TrendingUp}
                    label="Net Profit"
                    value={formatMoney(summary?.netProfit, baseCurrency)}
                    tone={summary?.netProfit >= 0 ? "indigo" : "rose"}
                    iconTone={summary?.netProfit >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-500"}
                  />
                  <SummaryCard
                    icon={Users}
                    label="Clients / Projects"
                    value={String(summary?.clientCount || 0)}
                    tone="violet"
                    iconTone="bg-violet-50 text-violet-600"
                  />
                </section>

                <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-indigo-500" size={19} />
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-800">Revenue vs. Costs per Client</h2>
                        <p className="mt-0.5 text-[10px] text-slate-400">All amounts converted to {baseCurrency}.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600">
                      {clients.length} client{clients.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {clients.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <Briefcase className="mx-auto mb-4 text-indigo-300" size={42} />
                      <h3 className="text-sm font-bold text-slate-700">No client data yet</h3>
                      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-400">
                        Tag incomes and expenses to clients/projects from the Income and
                        Expenses pages, then come back here to see the analysis.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {clients.map((client) => (
                        <ClientRow key={client.name} client={client} currency={baseCurrency} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
        <CashFlowMobileNav />
      </div>
    </div>
  );
}

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

function ClientRow({ client, currency }) {
  const profit = Number(client.profit || 0);
  const margin = Number(client.margin || 0);
  const isProfitable = profit >= 0;
  const total = Math.max(client.revenue, client.costs) || 1;
  const revenueWidth = Math.max(4, Math.min(100, (client.revenue / total) * 100));
  const costWidth = Math.max(4, Math.min(100, (client.costs / total) * 100));

  // Use client._id or client.id depending on your backend payload
  const clientId = client._id || client.id || client.name;

  return (
    <div className="px-6 py-5 transition hover:bg-slate-50/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/profitability/${clientId}`}
            className="group inline-flex items-center gap-1.5 hover:text-indigo-600"
          >
            <h3 className="truncate text-sm font-extrabold capitalize text-slate-800 group-hover:text-indigo-600">
              {client.name}
            </h3>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
          </Link>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {client.incomeCount || 0} income · {client.expenseCount || 0} expense
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${
              isProfitable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            }`}
          >
            {isProfitable ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatPercent(margin)} margin
          </span>

          <Link
            to={`/profitability/${clientId}`}
            className="rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600 shadow-xs hover:bg-indigo-50"
          >
            View Analysis
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <ArrowUpRight size={11} className="text-emerald-500" /> Revenue
            </span>
            <span className="font-extrabold text-emerald-600">
              {formatMoney(client.revenue, currency)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${revenueWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <ArrowDownRight size={11} className="text-rose-500" /> Costs
            </span>
            <span className="font-extrabold text-rose-500">
              {formatMoney(client.costs, currency)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-rose-400"
              style={{ width: `${costWidth}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-3.5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
            isProfitable ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {isProfitable ? <Crown size={14} /> : <TrendingDown size={14} />}
          {isProfitable ? "Profitable" : "Losing money"}
        </span>
        <span className="text-xs font-extrabold text-slate-800">
          {isProfitable ? "Net " : "Net loss "}
          <span className={isProfitable ? "text-emerald-600" : "text-rose-500"}>
            {formatMoney(profit, currency)}
          </span>
        </span>
      </div>
    </div>
  );
}