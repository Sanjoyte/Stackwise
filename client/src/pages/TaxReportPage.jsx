import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FileText,
  Calculator,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Globe,
  UserCheck,
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  TrendingDown,
  Coins,
  Plus,
  XCircle,
  Check,
  ArrowRight,
  Bot,
  Zap,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import { CashFlowSidebar, CashFlowMobileNav } from "../components/cashflow/CashFlowNav";
import {
  previewTaxReport,
  generateTaxReport,
  getTaxReports,
  getTaxJurisdictions,
  getDownloadUrl,
  runAiDeductionScan,
  getAiScanStatus,
  getAiDeductionFlags,
  getMissedDeductionSuggestions,
  acceptAiFlag,
  dismissAiFlag,
  acceptMissedSuggestion,
  dismissMissedSuggestion,
} from "../api/taxReportApi";

import "../subscriptions.css";
import "../styles/cashFlow.css";

const CATEGORY_OPTIONS = [
  { value: "office-rent", label: "Office Rent (Cap: ৳300k)" },
  { value: "internet", label: "Internet & Telecom (Cap: 5% Income)" },
  { value: "software", label: "Software & SaaS (Fully Deductible)" },
  { value: "equipment", label: "Equipment & Hardware (Cap: ৳500k)" },
  { value: "professional-development", label: "Training & Courses (Cap: ৳100k)" },
  { value: "subscription", label: "Work Subscriptions (Fully Deductible)" },
  { value: "utilities", label: "Office Utilities (Cap: ৳150k)" },
  { value: "uncategorized", label: "Uncategorized (Not Deductible)" },
];

export default function TaxReportPage() {
  const [activeTab, setActiveTab] = useState("builder"); // 'builder' | 'history'
  const [jurisdictions, setJurisdictions] = useState([]);
  const [jurisdictionCode, setJurisdictionCode] = useState("BD");
  const [taxpayerCategory, setTaxpayerCategory] = useState("general");

  const [periodStart, setPeriodStart] = useState("2026-01-01");
  const [periodEnd, setPeriodEnd] = useState("2026-03-31");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Server-fetched raw preview data
  const [serverPreview, setServerPreview] = useState(null);

  // Interactive local editable state
  const [lineItems, setLineItems] = useState([]);
  const [uncategorizedItems, setUncategorizedItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isModified, setIsModified] = useState(false);

  // AI Scan State (Phase 4)
  const [aiScanning, setAiScanning] = useState(false);
  const [aiFlags, setAiFlags] = useState([]);
  const [missedSuggestions, setMissedSuggestions] = useState([]);
  const [lastScanInfo, setLastScanInfo] = useState(null);

  // New Custom Expense modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("software");
  const [newAmount, setNewAmount] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [pastReports, setPastReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchJurisdictions();
    fetchHistory();
    fetchAiScanData();
  }, []);

  const fetchJurisdictions = async () => {
    try {
      const res = await getTaxJurisdictions();
      if (res.success && res.jurisdictions) {
        setJurisdictions(res.jurisdictions);
      }
    } catch {
      // Fallback default
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getTaxReports({ limit: 20 });
      if (res.success) {
        setPastReports(res.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAiScanData = async () => {
    try {
      const [statusRes, flagsRes, suggestionsRes] = await Promise.all([
        getAiScanStatus(),
        getAiDeductionFlags(),
        getMissedDeductionSuggestions(),
      ]);

      if (statusRes.success) setLastScanInfo(statusRes.lastScan);
      if (flagsRes.success) setAiFlags(flagsRes.flags || []);
      if (suggestionsRes.success) setMissedSuggestions(suggestionsRes.suggestions || []);
    } catch {
      // ignore
    }
  };

  const handleRunAiScan = async () => {
    setAiScanning(true);
    setErrorMsg("");
    try {
      const res = await runAiDeductionScan({
        periodStart,
        periodEnd,
        force: true,
      });
      setSuccessMsg(`AI Scan complete! Found ${res.newFlags || 0} AI deduction flags and ${res.newMissedSuggestions || 0} missed deduction suggestions.`);
      fetchAiScanData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "AI Scan failed");
    } finally {
      setAiScanning(false);
    }
  };

  const handleAcceptAiFlag = async (flagId) => {
    try {
      await acceptAiFlag(flagId);
      const acceptedFlag = aiFlags.find((f) => f._id === flagId);
      if (acceptedFlag) {
        const newItem = {
          sourceType: acceptedFlag.sourceType || "expense",
          sourceId: acceptedFlag.sourceId,
          description: acceptedFlag.description,
          category: acceptedFlag.categoryTag,
          deductible: true,
          confidence: acceptedFlag.confidence,
          originalAmount: 5000,
          originalCurrency: "BDT",
          convertedAmount: 5000,
          exchangeRate: 1,
          localId: `ai-flag-${flagId}`,
          excluded: false,
        };
        const updated = [...lineItems, newItem];
        setLineItems(updated);
        recalculateTax(updated);
      }
      fetchAiScanData();
    } catch {
      // ignore
    }
  };

  const handleDismissAiFlag = async (flagId) => {
    try {
      await dismissAiFlag(flagId);
      fetchAiScanData();
    } catch {
      // ignore
    }
  };

  const handleAcceptMissedSuggestion = async (suggestionId) => {
    try {
      const sugg = missedSuggestions.find((s) => s._id === suggestionId);
      await acceptMissedSuggestion(suggestionId);
      if (sugg) {
        const newItem = {
          sourceType: "expense",
          sourceId: null,
          description: `Claimed: ${sugg.suggestedCategory}`,
          category: sugg.categoryTag || "software",
          deductible: true,
          confidence: "high",
          originalAmount: sugg.estimatedAmount || 15000,
          originalCurrency: "BDT",
          convertedAmount: sugg.estimatedAmount || 15000,
          exchangeRate: 1,
          localId: `sugg-${suggestionId}`,
          excluded: false,
        };
        const updated = [...lineItems, newItem];
        setLineItems(updated);
        recalculateTax(updated);
      }
      fetchAiScanData();
    } catch {
      // ignore
    }
  };

  const handleDismissMissedSuggestion = async (suggestionId) => {
    try {
      await dismissMissedSuggestion(suggestionId);
      fetchAiScanData();
    } catch {
      // ignore
    }
  };

  const applyPreset = (preset) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (preset === "Q1") {
      setPeriodStart("2026-01-01");
      setPeriodEnd("2026-03-31");
    } else if (preset === "Q2") {
      setPeriodStart("2026-04-01");
      setPeriodEnd("2026-06-30");
    } else if (preset === "Q3") {
      setPeriodStart("2026-07-01");
      setPeriodEnd("2026-09-30");
    } else if (preset === "Q4") {
      setPeriodStart("2026-10-01");
      setPeriodEnd("2026-12-31");
    } else if (preset === "FY2526") {
      setPeriodStart("2025-07-01");
      setPeriodEnd("2026-06-30");
    }
  };

  const handlePreview = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setPreviewLoading(true);
    try {
      const data = await previewTaxReport({
        periodStart,
        periodEnd,
        jurisdictionCode,
        taxpayerCategory,
      });
      setServerPreview(data);
      const items = (data.lineItems || []).map((item, idx) => ({
        ...item,
        localId: item._id || `item-${idx}`,
        excluded: false,
      }));
      setLineItems(items);
      setUncategorizedItems(data.uncategorizedItems || []);
      setSummary(data.summary);
      setIsModified(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to calculate preview");
      setServerPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const recalculateTax = (currentItems = lineItems, category = taxpayerCategory) => {
    let grossIncome = 0;
    const categoryTotals = {};

    currentItems.forEach((item) => {
      if (item.sourceType === "income" && !item.excluded) {
        grossIncome += Number(item.convertedAmount || 0);
      }
    });

    currentItems.forEach((item) => {
      if ((item.sourceType === "expense" || item.sourceType === "subscription") && !item.excluded) {
        const cat = (item.category || "uncategorized").toLowerCase().trim();
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(item.convertedAmount || 0);
      }
    });

    let totalDeductions = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (cat === "office-rent") {
        totalDeductions += Math.min(amount, 300000);
      } else if (cat === "internet") {
        const cap = grossIncome * 0.05;
        totalDeductions += Math.min(amount, cap);
      } else if (cat === "equipment") {
        totalDeductions += Math.min(amount, 500000);
      } else if (cat === "professional-development") {
        totalDeductions += Math.min(amount, 100000);
      } else if (cat === "utilities") {
        totalDeductions += Math.min(amount, 150000);
      } else if (cat === "software" || cat === "subscription") {
        totalDeductions += amount;
      } else if (cat !== "uncategorized") {
        totalDeductions += amount;
      }
    });

    grossIncome = Math.round(grossIncome * 100) / 100;
    totalDeductions = Math.round(totalDeductions * 100) / 100;

    const estimatedTaxableIncome = Math.max(0, grossIncome - totalDeductions);

    let threshold = 375000;
    if (category === "woman-senior") threshold = 400000;
    if (category === "disabled") threshold = 475000;

    let taxablePortion = Math.max(0, estimatedTaxableIncome - threshold);
    let estimatedTax = 0;

    if (taxablePortion > 0) {
      const s2 = Math.min(taxablePortion, 100000);
      estimatedTax += s2 * 0.10;
      taxablePortion -= s2;
    }
    if (taxablePortion > 0) {
      const s3 = Math.min(taxablePortion, 100000);
      estimatedTax += s3 * 0.15;
      taxablePortion -= s3;
    }
    if (taxablePortion > 0) {
      const s4 = Math.min(taxablePortion, 300000);
      estimatedTax += s4 * 0.20;
      taxablePortion -= s4;
    }
    if (taxablePortion > 0) {
      const s5 = Math.min(taxablePortion, 200000);
      estimatedTax += s5 * 0.25;
      taxablePortion -= s5;
    }
    if (taxablePortion > 0) {
      estimatedTax += taxablePortion * 0.30;
    }

    estimatedTax = Math.round(estimatedTax * 100) / 100;
    if (estimatedTax > 0 && estimatedTax < 5000) {
      estimatedTax = 5000;
    }

    const newSummary = {
      grossIncome,
      totalDeductions,
      estimatedTaxableIncome,
      estimatedTax,
      exchangeRateCount: summary?.exchangeRateCount || 0,
    };

    setSummary(newSummary);
    setIsModified(true);
  };

  const toggleExcludeItem = (localId) => {
    const updated = lineItems.map((item) =>
      item.localId === localId ? { ...item, excluded: !item.excluded } : item
    );
    setLineItems(updated);
    recalculateTax(updated);
  };

  const changeItemCategory = (localId, newCat) => {
    const updated = lineItems.map((item) => {
      if (item.localId === localId) {
        const isDeduct = newCat !== "uncategorized";
        return {
          ...item,
          category: newCat,
          deductible: isDeduct,
        };
      }
      return item;
    });
    setLineItems(updated);
    recalculateTax(updated);
  };

  const promoteUncategorizedItem = (uncatIndex, targetCategory) => {
    const targetItem = uncategorizedItems[uncatIndex];
    if (!targetItem) return;

    const newItem = {
      sourceType: targetItem.sourceType || "expense",
      sourceId: targetItem.sourceId || null,
      description: targetItem.description,
      category: targetCategory,
      deductible: targetCategory !== "uncategorized",
      confidence: "high",
      originalAmount: targetItem.amount,
      originalCurrency: "BDT",
      convertedAmount: targetItem.amount,
      exchangeRate: 1,
      localId: `promoted-${Date.now()}-${uncatIndex}`,
      excluded: false,
    };

    const updatedLineItems = [...lineItems, newItem];
    const updatedUncat = uncategorizedItems.filter((_, idx) => idx !== uncatIndex);

    setLineItems(updatedLineItems);
    setUncategorizedItems(updatedUncat);
    recalculateTax(updatedLineItems);
  };

  const getAiCategoryForItem = (item) => {
    const desc = (item.description || "").toLowerCase();
    const matchingFlag = aiFlags.find((f) => (f.description || "").toLowerCase().includes(desc) || desc.includes((f.description || "").toLowerCase()));
    if (matchingFlag) return matchingFlag.categoryTag;
    const matchingSugg = missedSuggestions.find((s) => s.supportingEntries?.some((e) => (e.description || "").toLowerCase().includes(desc)));
    if (matchingSugg) return matchingSugg.categoryTag || matchingSugg.suggestedCategory;

    // Pattern fallback keywords
    if (/figma|claude|cladue|aws|tableau|software|saas|cloud|github/i.test(desc)) return "software";
    if (/laptop|printer|cartridge|equipment|hardware|workstation/i.test(desc)) return "equipment";
    if (/broadband|fiber|internet|telecom/i.test(desc)) return "internet";
    if (/office|co-working|coworking|rent/i.test(desc)) return "office-rent";
    if (/course|certification|analyst|training|development/i.test(desc)) return "professional-development";
    return null;
  };

  const handleAddCustomExpense = (e) => {
    e.preventDefault();
    if (!newDesc || !newAmount || isNaN(Number(newAmount))) {
      return;
    }

    const amt = Number(newAmount);
    const newItem = {
      sourceType: "expense",
      sourceId: null,
      description: newDesc,
      category: newCategory,
      deductible: newCategory !== "uncategorized",
      confidence: "high",
      originalAmount: amt,
      originalCurrency: "BDT",
      convertedAmount: amt,
      exchangeRate: 1,
      localId: `custom-${Date.now()}`,
      excluded: false,
    };

    const updated = [...lineItems, newItem];
    setLineItems(updated);
    recalculateTax(updated);

    setNewDesc("");
    setNewAmount("");
    setShowAddModal(false);
  };

  const handleGenerate = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setGenerateLoading(true);
    try {
      const activeLineItems = lineItems.filter((i) => !i.excluded);

      const res = await generateTaxReport({
        periodStart,
        periodEnd,
        jurisdictionCode,
        taxpayerCategory,
        customLineItems: activeLineItems,
        customUncategorizedItems: uncategorizedItems,
        customSummary: summary,
      });
      setSuccessMsg("Tax report snapshot generated successfully!");
      fetchHistory();
      if (res.downloadUrl) {
        window.open(getDownloadUrl(res.reportId), "_blank");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Report generation failed");
    } finally {
      setGenerateLoading(false);
    }
  };

  const formatBDT = (val) => {
    return `৳${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const incomeItems = lineItems.filter((i) => i.sourceType === "income");
  const deductibleItems = lineItems.filter((i) => i.sourceType === "expense" || i.sourceType === "subscription");

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            {/* Top Navigation Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark darkText />

              <div className="flex items-center gap-2 rounded-2xl bg-indigo-50/70 p-1 border border-indigo-100">
                <button
                  onClick={() => setActiveTab("builder")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeTab === "builder"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Interactive Builder & AI Scan
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history");
                    fetchHistory();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeTab === "history"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Previously Generated Reports ({pastReports.length})
                </button>
              </div>
            </header>

            {/* Hero Header Banner */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[24px] border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-indigo-200 border border-white/20">
                    NBR FY 2025–26 & FY 2026–27
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                    Tax Rules & Gemini AI Layer
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tax Report Generator</h1>
                <p className="mt-1 text-xs sm:text-sm text-indigo-200/90 max-w-xl">
                  Inspect taxable income sources, modify business expense deductibles, run Gemini AI deduction scans, and stream certified PDF reports.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-2xl border border-white/10">
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="text-[11px] text-indigo-100">
                  <div className="font-bold text-white">Updated for this year</div>
                  <div>Snapshots frozen with legal disclaimers</div>
                </div>
              </div>
            </section>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === "builder" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                {/* Left Controls Column */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Date Controls */}
                  <div className="rounded-[24px] border border-indigo-100 bg-white p-6 shadow-[0_10px_35px_rgba(68,55,130,0.04)] space-y-5">
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Select Assessment Period
                    </h2>

                    {/* Presets */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Quick Quarter Presets
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {["Q1", "Q2", "Q3", "Q4", "FY2526"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 transition-all cursor-pointer"
                          >
                            {preset === "FY2526" ? "FY 2025–26" : preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handlePreview} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Start Date</label>
                          <input
                            type="date"
                            value={periodStart}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">End Date</label>
                          <input
                            type="date"
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-indigo-600" /> Jurisdiction
                        </label>
                        <select
                          value={jurisdictionCode}
                          onChange={(e) => setJurisdictionCode(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        >
                          {jurisdictions.length > 0 ? (
                            jurisdictions.map((j) => (
                              <option key={j.code} value={j.code}>
                                {j.name} ({j.code}) — {j.currency}
                              </option>
                            ))
                          ) : (
                            <option value="BD">Bangladesh (BD) — BDT</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Taxpayer Category
                        </label>
                        <select
                          value={taxpayerCategory}
                          onChange={(e) => {
                            setTaxpayerCategory(e.target.value);
                            if (summary) recalculateTax(lineItems, e.target.value);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        >
                          <option value="general">General (0% up to ৳3.75 Lakh)</option>
                          <option value="woman-senior">Women / Senior 65+ (0% up to ৳4 Lakh)</option>
                          <option value="disabled">Disabled Persons (0% up to ৳4.75 Lakh)</option>
                          <option value="freelancer">IT / Digital Freelancer</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={previewLoading}
                        className="w-full mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {previewLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Fetching Financial Records...
                          </>
                        ) : (
                          <>
                            <Calculator className="w-4 h-4" />
                            Run Calculations & Preview
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* AI Scan Trigger Card (Phase 4) */}
                  <div className="rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-[0_10px_35px_rgba(68,55,130,0.04)] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-indigo-600 text-white">
                          <Bot className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800">Gemini AI Deduction Scan</h3>
                          <p className="text-[10px] text-slate-500">Scan logs for hidden & missed deductions</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleRunAiScan}
                      disabled={aiScanning}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:opacity-90 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {aiScanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Scanning with Gemini AI...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Run AI Deduction Scan
                        </>
                      )}
                    </button>

                    {lastScanInfo && (
                      <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-indigo-100/60 pt-2">
                        <span>Last Scan: {new Date(lastScanInfo.createdAt).toLocaleTimeString()}</span>
                        <span className="text-emerald-600 font-bold uppercase">{lastScanInfo.status}</span>
                      </div>
                    )}
                  </div>

                  {summary && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="w-full rounded-2xl bg-white border border-indigo-100 p-4 text-xs font-extrabold text-indigo-600 shadow-xs hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Custom Expense / Deductible
                    </button>
                  )}
                </div>

                {/* Right Interactive Workspace Column */}
                <div className="lg:col-span-8 space-y-6">
                  {summary ? (
                    <div className="space-y-6">
                      {/* 1. Recalculated Summary Metric Grid */}
                      <div className="rounded-[24px] border border-indigo-100 bg-white p-6 shadow-[0_10px_35px_rgba(68,55,130,0.04)] relative">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <h3 className="text-sm font-extrabold text-slate-800">Estimated Tax Liability Summary</h3>
                          {isModified && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-extrabold text-amber-700 border border-amber-200">
                              Modified • Live Recalculated
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                            <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-emerald-600" /> Gross Income
                            </div>
                            <div className="text-base font-extrabold text-emerald-600">
                              {formatBDT(summary.grossIncome)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                            <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Deductions
                            </div>
                            <div className="text-base font-extrabold text-rose-600">
                              {formatBDT(summary.totalDeductions)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                            <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1">Taxable Income</div>
                            <div className="text-base font-extrabold text-slate-800">
                              {formatBDT(summary.estimatedTaxableIncome)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
                            <div className="text-[10px] font-extrabold uppercase text-indigo-600 mb-1">Est. Tax</div>
                            <div className="text-base font-extrabold text-indigo-700">
                              {formatBDT(summary.estimatedTax)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Generate Certified PDF Snapshot Card (Positioned DIRECTLY BELOW Estimated Tax Liability Summary) */}
                      <div className="rounded-[24px] border border-indigo-100 bg-white p-6 shadow-[0_10px_35px_rgba(68,55,130,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">Generate Certified PDF Snapshot</h3>
                          <p className="text-xs text-slate-400">Stores customized deductibles & summary into document vault with legal disclaimers.</p>
                        </div>

                        <button
                          onClick={handleGenerate}
                          disabled={generateLoading}
                          className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                        >
                          {generateLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Generating PDF Snapshot...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Generate & Stream PDF
                            </>
                          )}
                        </button>
                      </div>

                      {/* 3. Taxable Income Sources Table */}
                      <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <Coins className="w-4 h-4 text-emerald-600" /> Taxable Income Sources ({incomeItems.length})
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400">Include / Exclude sources</span>
                        </div>

                        {incomeItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 italic">No income entries logged for this period.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                                <tr>
                                  <th className="px-5 py-3 text-center">Include</th>
                                  <th className="px-5 py-3">Description / Source</th>
                                  <th className="px-5 py-3">Original</th>
                                  <th className="px-5 py-3 text-right">Converted (BDT)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                {incomeItems.map((item) => (
                                  <tr key={item.localId} className={item.excluded ? "bg-slate-50/50 opacity-40 line-through" : "hover:bg-indigo-50/20"}>
                                    <td className="px-5 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={!item.excluded}
                                        onChange={() => toggleExcludeItem(item.localId)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-5 py-3 font-bold text-slate-800">{item.description}</td>
                                    <td className="px-5 py-3">{item.originalCurrency} {item.originalAmount}</td>
                                    <td className="px-5 py-3 text-right font-extrabold text-emerald-600">{formatBDT(item.convertedAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      {/* 4. Deductibles Table */}
                      <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-rose-600" /> Deductible Expenses ({deductibleItems.length})
                            </h3>
                            <p className="text-[10px] text-slate-400">Uncheck to cross-out deductibles or select category to re-evaluate NBR caps.</p>
                          </div>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Item
                          </button>
                        </div>

                        {deductibleItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 italic">No deductible expenses recorded.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                                <tr>
                                  <th className="px-4 py-3 text-center">Claim</th>
                                  <th className="px-5 py-3">Description</th>
                                  <th className="px-5 py-3">Category Tag</th>
                                  <th className="px-5 py-3 text-right">Amount (BDT)</th>
                                  <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                {deductibleItems.map((item) => (
                                  <tr key={item.localId} className={item.excluded ? "bg-slate-50/50 opacity-40 line-through" : "hover:bg-indigo-50/20"}>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={!item.excluded}
                                        onChange={() => toggleExcludeItem(item.localId)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-5 py-3 font-bold text-slate-800">
                                      {item.description}
                                      {item.sourceType === "subscription" && (
                                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-600 border border-indigo-100">
                                          Subscription
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3">
                                      <select
                                        value={item.category || "software"}
                                        onChange={(e) => changeItemCategory(item.localId, e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                                      >
                                        {CATEGORY_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-5 py-3 text-right font-extrabold text-rose-600">
                                      {formatBDT(item.convertedAmount)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => toggleExcludeItem(item.localId)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                        title={item.excluded ? "Uncross" : "Cross out"}
                                      >
                                        {item.excluded ? <Check className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4" />}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      {/* 5. Uncategorized Items Section (With Small AI Charm Beside Promote Button) */}
                      {uncategorizedItems.length > 0 && (
                        <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50/30 p-6 shadow-xs space-y-3">
                          <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" /> Uncategorized Items ({uncategorizedItems.length})
                          </h3>
                          <p className="text-xs text-amber-700">Assign a category tag to promote these items into active deductible expenses.</p>

                          <div className="overflow-x-auto bg-white rounded-2xl border border-amber-200/60">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-amber-100/50 text-[9px] font-extrabold uppercase text-amber-900 tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">Description</th>
                                  <th className="px-4 py-3 text-right">Amount (BDT)</th>
                                  <th className="px-4 py-3">Assign Category</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100 font-semibold text-slate-700">
                                {uncategorizedItems.map((item, idx) => {
                                  const aiSuggestedCat = getAiCategoryForItem(item);

                                  return (
                                    <tr key={idx} className="hover:bg-amber-50/20">
                                      <td className="px-4 py-3 font-bold text-slate-800">{item.description}</td>
                                      <td className="px-4 py-3 text-right font-extrabold">{formatBDT(item.amount)}</td>
                                      <td className="px-4 py-3">
                                        <select
                                          id={`uncat-select-${idx}`}
                                          defaultValue={aiSuggestedCat || "software"}
                                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                                        >
                                          {CATEGORY_OPTIONS.filter((o) => o.value !== "uncategorized").map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {aiSuggestedCat && (
                                            <span
                                              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200"
                                              title={`Gemini AI recommends: ${aiSuggestedCat}`}
                                            >
                                              <Sparkles className="w-3 h-3 text-purple-600 fill-purple-300" /> AI
                                            </span>
                                          )}
                                          <button
                                            onClick={() => {
                                              const selectElem = document.getElementById(`uncat-select-${idx}`);
                                              promoteUncategorizedItem(idx, selectElem ? selectElem.value : (aiSuggestedCat || "software"));
                                            }}
                                            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-amber-700 cursor-pointer inline-flex items-center gap-1"
                                          >
                                            Promote <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}

                      {/* 6. Phase 4: AI Suggested Deduction Flags Panel */}
                      {aiFlags.length > 0 && (
                        <section className="overflow-hidden rounded-[24px] border border-purple-200 bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/30 p-6 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                            <div>
                              <h3 className="text-sm font-extrabold text-purple-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600" /> AI-Suggested Deductions ({aiFlags.length})
                              </h3>
                              <p className="text-[10px] text-purple-700">Flagged by Gemini AI as eligible business expense deductions.</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {aiFlags.map((flag) => (
                              <div key={flag._id} className="rounded-2xl border border-purple-100 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-extrabold text-xs text-slate-800">{flag.description}</span>
                                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-extrabold text-purple-700 border border-purple-100 uppercase">
                                      {flag.categoryTag}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600">{flag.rationale}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleDismissAiFlag(flag._id)}
                                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    onClick={() => handleAcceptAiFlag(flag._id)}
                                    className="rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Claim Deduction
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* 7. Phase 4: Missed Deductions Suggestions Panel */}
                      {missedSuggestions.length > 0 && (
                        <section className="overflow-hidden rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 p-6 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                            <div>
                              <h3 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-600" /> Deductions You May Have Missed ({missedSuggestions.length})
                              </h3>
                              <p className="text-[10px] text-emerald-700">Inferred by AI based on your income patterns and active work requirements.</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {missedSuggestions.map((sugg) => (
                              <div key={sugg._id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-extrabold text-xs text-slate-800">{sugg.suggestedCategory}</span>
                                    {sugg.estimatedAmount && (
                                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                                        Est. Deductible: {formatBDT(sugg.estimatedAmount)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600">{sugg.rationale}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleDismissMissedSuggestion(sugg._id)}
                                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    onClick={() => handleAcceptMissedSuggestion(sugg._id)}
                                    className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Log & Claim
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                      <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <h3 className="text-sm font-extrabold text-slate-700 mb-1">No Calculations Run Yet</h3>
                      <p className="text-xs max-w-sm mx-auto text-slate-400">
                        Select date range & click "Run Calculations & Preview" to load income sources and deductible expenses.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800">Tax Report Snapshots</h2>
                    <p className="text-xs text-slate-400">Generated tax snapshots frozen with rules versioning and legal disclaimers.</p>
                  </div>
                  <button
                    onClick={fetchHistory}
                    className="rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                    title="Refresh history"
                  >
                    <RefreshCw className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {pastReports.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p>No tax report snapshots generated yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        <tr>
                          <th className="px-6 py-3.5">Assessment Period</th>
                          <th className="px-5 py-3.5">Jurisdiction</th>
                          <th className="px-5 py-3.5">Gross Income</th>
                          <th className="px-5 py-3.5">Deductions</th>
                          <th className="px-5 py-3.5">Est. Tax</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {pastReports.map((report) => (
                          <tr key={report._id} className="hover:bg-indigo-50/20">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {new Date(report.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                              {new Date(report.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-extrabold text-indigo-600 border border-indigo-100">
                                {report.jurisdictionCode} ({report.taxYear})
                              </span>
                            </td>
                            <td className="px-5 py-4 text-emerald-600 font-extrabold">
                              {formatBDT(report.summary?.grossIncome)}
                            </td>
                            <td className="px-5 py-4 text-rose-600 font-extrabold">
                              {formatBDT(report.summary?.totalDeductions)}
                            </td>
                            <td className="px-5 py-4 text-indigo-700 font-extrabold">
                              {formatBDT(report.summary?.estimatedTax)}
                            </td>
                            <td className="px-5 py-4">
                              {report.status === "generated" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                  Superseded
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/tax-reports/${report._id}`}
                                  className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors"
                                  title="Inspect Detail"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <a
                                  href={getDownloadUrl(report._id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Custom Expense Modal */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                <div className="rounded-[28px] border border-indigo-100 bg-white p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-800">Add Custom Deductible Expense</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddCustomExpense} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Expense Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Specialized Dev Course / Office Rent"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Deduction Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Amount (BDT)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white transition hover:bg-indigo-700 cursor-pointer"
                      >
                        Add & Recalculate
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}
