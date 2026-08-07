import {
  LogOut,
  Sparkles,
  WalletCards,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
  Briefcase,
  Repeat,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import api from "../api/axios";
import AddIncomeDrawer from "../components/AddIncomeDrawer";
import IncomeDetailModal from "../components/IncomeDetailModal";
import TemplateDetailModal from "../components/TemplateDetailModal";
import "../subscriptions.css"; // Reuse the css for cards

export default function IncomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTemplateDetailOpen, setIsTemplateDetailOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [incomeToEdit, setIncomeToEdit] = useState(null);
  const [drawerMode, setDrawerMode] = useState("income"); // "income" or "template"

  // Conversion rate: 1 USD = 120 BDT
  const USD_TO_BDT = 120;
  const baseCurrency = user?.baseCurrency || "BDT";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomeRes, templateRes] = await Promise.all([
        api.get("/incomes"),
        api.get("/income-templates"),
      ]);
      setIncomes(incomeRes.data.incomes || []);
      setTemplates(templateRes.data.templates || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch income data. Please try reloading.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (item, mode = "income") => {
    setIncomeToEdit(item);
    setDrawerMode(mode);
    if (mode === "income") {
      setIsDetailOpen(false);
    } else {
      setIsTemplateDetailOpen(false);
    }
    setIsDrawerOpen(true);
  };

  const handleAddClick = (mode = "income") => {
    setIncomeToEdit(null);
    setDrawerMode(mode);
    setIsDrawerOpen(true);
  };

  const handleCardClick = (income) => {
    setSelectedIncome(income);
    setIsDetailOpen(true);
  };

  const handleTemplateCardClick = (tpl) => {
    setSelectedTemplate(tpl);
    setIsTemplateDetailOpen(true);
  };

  const convertToUserBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) return amount;
    if (fromCurrency === "USD" && baseCurrency === "BDT") return amount * USD_TO_BDT;
    if (fromCurrency === "BDT" && baseCurrency === "USD") return amount / USD_TO_BDT;
    return amount; 
  };

  const formatCurrency = (val) => {
    if (baseCurrency === "USD") return `$${val.toFixed(2)}`;
    return `৳${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const formatItemCurrency = (val, curr) => {
    if (curr === "USD") return `$${Number(val).toFixed(2)}`;
    if (curr === "BDT") return `৳${Number(val).toFixed(0)}`;
    return `${curr} ${Number(val).toFixed(2)}`;
  };

  // Calculate totals from the last 30 days and 365 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const totalMonthlyIncome = incomes
    .filter((inc) => new Date(inc.date) >= thirtyDaysAgo)
    .reduce((sum, inc) => sum + convertToUserBase(inc.amount, inc.currency), 0);

  const totalAnnualIncome = incomes
    .filter((inc) => new Date(inc.date) >= oneYearAgo)
    .reduce((sum, inc) => sum + convertToUserBase(inc.amount, inc.currency), 0);

  const handleLogFromTemplate = async (e, templateId) => {
    e.stopPropagation();
    try {
      await api.post(`/income-templates/${templateId}/log`);
      fetchData();
    } catch (err) {
      alert("Failed to log income from template.");
    }
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
              onClick={() => navigate("/subscription")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
            >
              Subscriptions
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600">
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

        {/* Spend Metrics Summary Panel */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Monthly Income Card */}
          <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Last 30 Days
                </span>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-500">
                  <DollarSign size={18} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-extrabold text-slate-900">
                {formatCurrency(totalMonthlyIncome)}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Income received in the last 30 days.
            </p>
          </article>

          {/* Annual Income Card */}
          <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Last 365 Days
                </span>
                <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <TrendingUp size={18} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-extrabold text-slate-900">
                {formatCurrency(totalAnnualIncome)}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Income received in the last year.
            </p>
          </article>

          {/* Actions Quick Card */}
          <article className="rounded-3xl bg-indigo-600 p-6 shadow-xs flex flex-col justify-between text-white sm:col-span-2 lg:col-span-1">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={11} />
                Income Tracking
              </div>
              <h3 className="text-lg font-bold">Track your cashflow</h3>
              <p className="text-xs text-indigo-100">
                Log one-off payments or set up recurring client templates.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => handleAddClick("income")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 cursor-pointer"
              >
                <Plus size={18} />
                Log Income
              </button>
            </div>
          </article>

        </section>

        {/* Templates Section */}
        {templates.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Repeat className="text-indigo-600" size={20} />
              <h2 className="text-lg font-bold text-slate-800">
                Recurring Templates
              </h2>
            </div>
            <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((tpl) => (
                <article
                  key={tpl._id}
                  onClick={() => handleTemplateCardClick(tpl)}
                  className="bg-white rounded-3xl border border-indigo-100 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{tpl.templateName}</h3>
                      <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                        {tpl.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{tpl.clientName || tpl.source}</p>
                    <div className="mt-3 text-lg font-extrabold text-slate-900">
                      {formatItemCurrency(tpl.amount, tpl.currency)}
                    </div>
                    {tpl.expectedDate && (
                      <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                        <Calendar size={11} /> 
                        Exp: {new Date(tpl.expectedDate).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  {(!tpl.loggingMethod || tpl.loggingMethod === "manual") && (
                    <button
                      onClick={(e) => handleLogFromTemplate(e, tpl._id)}
                      className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <Zap size={14} />
                      Log Payment
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Income Lists */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Income History
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-700 font-semibold">
                {incomes.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-indigo-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            </div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-indigo-200">
              <Briefcase className="mx-auto text-indigo-300 mb-4" size={40} />
              <h3 className="font-bold text-slate-700 text-sm">No Income Logged</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Get started by clicking the "Log Income" button to track your cashflow.
              </p>
            </div>
          ) : (
            <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
              {incomes.map((inc) => (
                <article
                  key={inc._id}
                  onClick={() => handleCardClick(inc)}
                  className="sub-item-card bg-white rounded-3xl border border-indigo-100 p-5 shadow-xs cursor-pointer hover:border-indigo-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base capitalize">{inc.source}</h3>
                        {inc.linkedTemplate && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-100">
                            Template
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{inc.clientName || "General"}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-emerald-600">
                      +{formatItemCurrency(inc.amount, inc.currency)}
                    </span>
                  </div>

                  {inc.notes && (
                    <p className="mt-3 text-xs text-slate-500 truncate bg-slate-50 p-2 rounded-xl">
                      {inc.notes}
                    </p>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-indigo-400" />
                      <span>
                        {new Date(inc.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-slate-300" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>

      <AddIncomeDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setIncomeToEdit(null);
        }}
        onSuccess={fetchData}
        incomeToEdit={incomeToEdit}
        userCurrency={baseCurrency}
        initialMode={drawerMode}
      />

      <IncomeDetailModal
        income={selectedIncome}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedIncome(null);
        }}
        onSuccess={fetchData}
        onEdit={(inc) => handleEditClick(inc, "income")}
      />

      <TemplateDetailModal
        template={selectedTemplate}
        isOpen={isTemplateDetailOpen}
        onClose={() => {
          setIsTemplateDetailOpen(false);
          setSelectedTemplate(null);
        }}
        onSuccess={fetchData}
        onEdit={(tpl) => handleEditClick(tpl, "template")}
      />
    </main>
  );
}
