import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileUp,
  ListChecks,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchExpenseCategories } from "../api/expenseCategoryApi";
import { fetchExpenses } from "../api/expenseApi";
import {
  CashFlowMobileNav,
  CashFlowSidebar,
} from "../components/cashflow/CashFlowNav";
import CsvImportModal from "../components/expenses/CsvImportModal";
import DeleteExpenseModal from "../components/expenses/DeleteExpenseModal";
import ExpenseDrawer from "../components/expenses/ExpenseDrawer";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/formatCurrency";
import "../styles/cashFlow.css";

const pad = (value) => String(value).padStart(2, "0");
const toDateInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getPeriodRange = (period) => {
  const now = new Date();

  if (period === "all") return { startDate: "", endDate: "" };
  if (period === "lastMonth") {
    return {
      startDate: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      endDate: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (period === "thisYear") {
    return {
      startDate: toDateInput(new Date(now.getFullYear(), 0, 1)),
      endDate: toDateInput(new Date(now.getFullYear(), 11, 31)),
    };
  }

  return {
    startDate: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const initialSummary = {
  totalExpenses: 0,
  business: 0,
  personal: 0,
  transactions: 0,
  currency: "BDT",
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("newest");
  const [period, setPeriod] = useState("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [toast, setToast] = useState(null);

  const dateRange = useMemo(
    () =>
      period === "custom"
        ? { startDate: customStart, endDate: customEnd }
        : getPeriodRange(period),
    [period, customStart, customEnd]
  );

  useEffect(() => {
    let active = true;
    fetchExpenseCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch(() => {
        if (active) setError("Expense categories could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRefreshing(true);

      try {
        const data = await fetchExpenses({
          search: search.trim() || undefined,
          type: type === "all" ? undefined : type,
          category: category === "all" ? undefined : category,
          source: source === "all" ? undefined : source,
          sort,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        });
        if (!active) return;
        setExpenses(data.expenses || []);
        setSummary(data.summary || initialSummary);
        setError("");
      } catch (requestError) {
        if (!active || controller.signal.aborted) return;
        setError(requestError.response?.data?.message || "Your expenses could not be loaded.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, search ? 300 : 0);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, type, category, source, sort, dateRange.startDate, dateRange.endDate, refreshKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notifyAndRefresh = async (message, tone = "success") => {
    setToast({ message, tone });
    setRefreshKey((value) => value + 1);
  };

  const openAdd = () => {
    setEditingExpense(null);
    setDrawerOpen(true);
  };

  const openEdit = (expense) => {
    setEditingExpense(expense);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setType("all");
    setCategory("all");
    setSource("all");
    setSort("newest");
    setPeriod("thisMonth");
    setCustomStart("");
    setCustomEnd("");
  };

  const hasFilters =
    search || type !== "all" || category !== "all" || source !== "all" || sort !== "newest" || period !== "thisMonth";

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <header className="cf-topbar">
          <div className="cf-mobile-brand">
            <div className="cf-mobile-brand-mark">S</div>
            <span>Stackwise</span>
          </div>
          <div className="cf-topbar-spacer" />
          <button type="button" className="cf-icon-button" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <div className="cf-user-summary">
            <div className="cf-avatar">{getInitials(user?.name)}</div>
            <div className="cf-user-copy">
              <strong>{user?.name || "Stackwise User"}</strong>
              <span>{user?.email || ""}</span>
            </div>
          </div>
        </header>

        <main className="cf-main">
          <div className="cf-page-heading !items-start">
            <div>
              <div className="cf-heading-kicker">
                <ReceiptText size={15} /> Expense management
              </div>
              <h1>Expenses</h1>
              <p>
                Track business and personal spending, import structured CSV records, and see subscription costs in one place.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
              >
                <FileUp size={16} /> Import CSV
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                <Plus size={17} /> Add Expense
              </button>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Expense summary">
            <SummaryCard icon={Wallet} label="Total Expenses" value={formatCurrency(summary.totalExpenses, summary.currency)} tone="indigo" />
            <SummaryCard icon={Briefcase} label="Business" value={formatCurrency(summary.business, summary.currency)} tone="emerald" />
            <SummaryCard icon={UserRound} label="Personal" value={formatCurrency(summary.personal, summary.currency)} tone="rose" />
            <SummaryCard icon={ListChecks} label="Transactions" value={String(summary.transactions)} tone="violet" />
          </section>

          <section className="mt-5 rounded-[24px] border border-indigo-100 bg-white p-4 shadow-[0_10px_35px_rgba(68,55,130,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                <SlidersHorizontal size={16} className="text-indigo-500" /> Find expenses
                {refreshing && <RefreshCw size={13} className="animate-spin text-indigo-500" />}
              </div>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
                  <X size={13} /> Reset
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(5,minmax(120px,1fr))]">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search description, merchant, notes"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </label>
              <FilterSelect value={type} onChange={setType} label="Expense type">
                <option value="all">All Types</option>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </FilterSelect>
              <FilterSelect value={category} onChange={setCategory} label="Category">
                <option value="all">All Categories</option>
                {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </FilterSelect>
              <FilterSelect value={source} onChange={setSource} label="Source">
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="csv">CSV</option>
                <option value="subscription">Subscription</option>
              </FilterSelect>
              <FilterSelect value={period} onChange={setPeriod} label="Period">
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom</option>
              </FilterSelect>
              <FilterSelect value={sort} onChange={setSort} label="Sort">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </FilterSelect>
            </div>

            {period === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:justify-end xl:ml-auto xl:max-w-md">
                <DateFilter label="From" value={customStart} onChange={setCustomStart} />
                <DateFilter label="To" value={customEnd} onChange={setCustomEnd} />
              </div>
            )}
          </section>

          <section className="mt-5 overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">Expense History</h2>
                <p className="mt-1 text-[10px] text-slate-400">Amounts are shown in their original currencies; summaries use {summary.currency}.</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600">
                {expenses.length} record{expenses.length === 1 ? "" : "s"}
              </span>
            </div>

            {loading ? (
              <ExpenseLoading />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setRefreshKey((value) => value + 1)} />
            ) : expenses.length === 0 ? (
              <EmptyState filtered={hasFilters} onAdd={openAdd} onImport={() => setImportOpen(true)} onReset={clearFilters} />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] border-collapse text-left">
                    <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                      <tr>
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5">Type</th>
                        <th className="px-5 py-3.5">Source</th>
                        <th className="px-5 py-3.5 text-right">Amount</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((expense) => (
                        <ExpenseRow key={expense._id} expense={expense} onEdit={openEdit} onDelete={setDeletingExpense} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {expenses.map((expense) => (
                    <ExpenseCard key={expense._id} expense={expense} onEdit={openEdit} onDelete={setDeletingExpense} />
                  ))}
                </div>
              </>
            )}
          </section>
        </main>

        <CashFlowMobileNav />
      </div>

      {drawerOpen && (
        <ExpenseDrawer
          key={editingExpense?._id || "new-expense"}
          expense={editingExpense}
          categories={categories}
          userCurrency={user?.baseCurrency || "BDT"}
          onClose={() => {
            setDrawerOpen(false);
            setEditingExpense(null);
          }}
          onChanged={notifyAndRefresh}
        />
      )}
      {importOpen && (
        <CsvImportModal
          categories={categories}
          onClose={() => setImportOpen(false)}
          onImported={notifyAndRefresh}
        />
      )}
      <DeleteExpenseModal
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onDeleted={notifyAndRefresh}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

function getInitials(name) {
  if (!name?.trim()) return "SW";
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-500",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <article className="rounded-[22px] border border-indigo-100 bg-white p-5 shadow-[0_8px_28px_rgba(68,55,130,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      </div>
      <strong className="mt-4 block truncate text-xl font-extrabold tracking-tight text-slate-900" title={value}>{value}</strong>
    </article>
  );
}

function FilterSelect({ value, onChange, label, children }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 pr-8 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-600 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
      />
    </label>
  );
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  return (
    <tr className="text-[11px] text-slate-500 transition hover:bg-indigo-50/25">
      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-600">{formatDate(expense.date)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <strong className="block max-w-52 truncate text-xs text-slate-800">{expense.description}</strong>
            <span className="mt-0.5 block max-w-52 truncate text-[9px] text-slate-400">{expense.merchant || expense.notes || "—"}</span>
          </div>
          {expense.receipt?.url && <ReceiptLink url={expense.receipt.url} />}
        </div>
      </td>
      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{expense.category?.name || "Other"}</span></td>
      <td className="px-5 py-4"><TypeBadge type={expense.expenseType} /></td>
      <td className="px-5 py-4"><SourceBadge source={expense.source} /></td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-extrabold text-slate-800">{formatCurrency(expense.amount, expense.currency)}</td>
      <td className="px-6 py-4">
        {expense.readOnly ? (
          <span className="block text-right text-[9px] font-bold uppercase tracking-wide text-slate-300">Read only</span>
        ) : (
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => onEdit(expense)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label={`Edit ${expense.description}`}><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(expense)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`Delete ${expense.description}`}><Trash2 size={14} /></button>
          </div>
        )}
      </td>
    </tr>
  );
}

function ExpenseCard({ expense, onEdit, onDelete }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm text-slate-800">{expense.description}</strong>
          <span className="mt-1 block text-[10px] text-slate-400">{formatDate(expense.date)} · {expense.category?.name || "Other"}</span>
        </div>
        <strong className="shrink-0 text-sm font-extrabold text-slate-900">{formatCurrency(expense.amount, expense.currency)}</strong>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TypeBadge type={expense.expenseType} />
        <SourceBadge source={expense.source} />
        {expense.receipt?.url && <ReceiptLink url={expense.receipt.url} />}
        {!expense.readOnly && (
          <span className="ml-auto flex gap-1">
            <button type="button" onClick={() => onEdit(expense)} className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600" aria-label="Edit expense"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(expense)} className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-500" aria-label="Delete expense"><Trash2 size={14} /></button>
          </span>
        )}
      </div>
    </article>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${type === "business" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
      {type}
    </span>
  );
}

function SourceBadge({ source }) {
  const styles = {
    manual: "bg-indigo-50 text-indigo-600",
    csv: "bg-amber-50 text-amber-600",
    subscription: "bg-violet-50 text-violet-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${styles[source] || styles.manual}`}>{source}</span>;
}

function ReceiptLink({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[9px] font-bold text-sky-600" title="View receipt">
      Receipt <ExternalLink size={10} />
    </a>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function ExpenseLoading() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-50" />)}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500"><ReceiptText size={21} /></div>
      <h3 className="mt-4 text-sm font-bold text-slate-700">Couldn’t load expenses</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-400">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><RefreshCw size={14} /> Try again</button>
    </div>
  );
}

function EmptyState({ filtered, onAdd, onImport, onReset }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500"><ReceiptText size={24} /></div>
      <h3 className="mt-4 text-base font-extrabold text-slate-800">{filtered ? "No matching expenses" : "No expenses yet"}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
        {filtered ? "Adjust or clear the current filters to see other records." : "Add your first expense or import expenses using the Stackwise CSV template."}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {filtered ? (
          <button type="button" onClick={onReset} className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600">Clear Filters</button>
        ) : (
          <>
            <button type="button" onClick={onImport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600"><FileUp size={14} /> Import CSV</button>
            <button type="button" onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Plus size={15} /> Add Expense</button>
          </>
        )}
      </div>
    </div>
  );
}

function Toast({ message, tone, onClose }) {
  const warning = tone === "warning";
  return (
    <div className={`fixed bottom-24 right-4 z-[1200] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl md:bottom-5 ${warning ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      <span className="leading-5">{message}</span>
      <button type="button" onClick={onClose} className="mt-0.5 shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}
