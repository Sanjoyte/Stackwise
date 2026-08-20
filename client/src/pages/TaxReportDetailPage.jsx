import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Download,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Coins,
  TrendingDown,
  Calculator,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import { CashFlowSidebar, CashFlowMobileNav } from "../components/cashflow/CashFlowNav";
import { getTaxReportById, getDownloadUrl } from "../api/taxReportApi";

import "../subscriptions.css";
import "../styles/cashFlow.css";

export default function TaxReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getTaxReportById(id);
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to load tax report detail");
    } finally {
      setLoading(false);
    }
  };

  const formatBDT = (val) => {
    return `৳${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="cf-page">
        <CashFlowSidebar />
        <div className="cf-workspace">
          <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Calculator className="w-10 h-10 animate-bounce mx-auto mb-3 text-indigo-600" />
              <p className="text-xs font-bold text-slate-600">Loading tax report snapshot...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="cf-page">
        <CashFlowSidebar />
        <div className="cf-workspace">
          <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
            <div className="mx-auto max-w-4xl space-y-6">
              <Link to="/tax-reports" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to Tax Reports
              </Link>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg || "Tax report not found"}</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const incomeItems = (report.lineItems || []).filter((i) => i.sourceType === "income");
  const expenseItems = (report.lineItems || []).filter((i) => i.sourceType === "expense");
  const subItems = (report.lineItems || []).filter((i) => i.sourceType === "subscription");

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="min-h-screen bg-[#f5f3ff] px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            {/* Top Navigation Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white px-6 py-4.5 shadow-xs">
              <BrandMark darkText />

              <Link
                to="/tax-reports"
                className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Link>
            </header>

            {/* Hero Header Banner */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[24px] border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-indigo-200 border border-white/20">
                    {report.jurisdictionCode} ({report.taxYear})
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    report.status === "generated"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/10 text-slate-300"
                  }`}>
                    {report.status === "generated" ? "Active Snapshot" : "Superseded"}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Tax Report #{report._id.slice(-6).toUpperCase()}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-indigo-200/90">
                  Assessment Period: {new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}
                </p>
              </div>

              <a
                href={getDownloadUrl(report._id)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                Download PDF Report
              </a>
            </section>

            {/* Financial Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-[24px] border border-indigo-100 bg-white p-5 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" /> Gross Income
                </div>
                <div className="text-lg font-extrabold text-emerald-600">
                  {formatBDT(report.summary?.grossIncome)}
                </div>
              </div>

              <div className="rounded-[24px] border border-indigo-100 bg-white p-5 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Total Deductions
                </div>
                <div className="text-lg font-extrabold text-rose-600">
                  {formatBDT(report.summary?.totalDeductions)}
                </div>
              </div>

              <div className="rounded-[24px] border border-indigo-100 bg-white p-5 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1">Taxable Income</div>
                <div className="text-lg font-extrabold text-slate-800">
                  {formatBDT(report.summary?.estimatedTaxableIncome)}
                </div>
              </div>

              <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase text-indigo-600 mb-1">Estimated Tax</div>
                <div className="text-lg font-extrabold text-indigo-700">
                  {formatBDT(report.summary?.estimatedTax)}
                </div>
              </div>
            </div>

            {/* Itemized Line Tables */}
            <div className="space-y-6">
              {/* Business Income */}
              <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-sm font-extrabold text-slate-800">Business Income Line Items ({incomeItems.length})</h3>
                </div>
                {incomeItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">No income items recorded in this snapshot.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        <tr>
                          <th className="px-6 py-3.5">Description</th>
                          <th className="px-5 py-3.5">Category</th>
                          <th className="px-5 py-3.5 text-right">Original Amount</th>
                          <th className="px-6 py-3.5 text-right">Converted (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {incomeItems.map((item) => (
                          <tr key={item._id} className="hover:bg-indigo-50/20">
                            <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                            <td className="px-5 py-4">{item.category}</td>
                            <td className="px-5 py-4 text-right">{item.originalCurrency} {item.originalAmount}</td>
                            <td className="px-6 py-4 text-right font-extrabold text-emerald-600">{formatBDT(item.convertedAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Deductible Expenses */}
              <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-sm font-extrabold text-slate-800">Deductible Expenses ({expenseItems.length})</h3>
                </div>
                {expenseItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">No expense items recorded in this snapshot.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        <tr>
                          <th className="px-6 py-3.5">Description</th>
                          <th className="px-5 py-3.5">Category</th>
                          <th className="px-5 py-3.5">Confidence</th>
                          <th className="px-5 py-3.5 text-right">Original</th>
                          <th className="px-6 py-3.5 text-right">Deductible (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expenseItems.map((item) => (
                          <tr key={item._id} className="hover:bg-indigo-50/20">
                            <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                            <td className="px-5 py-4">{item.category}</td>
                            <td className="px-5 py-4 uppercase text-[10px] font-extrabold text-emerald-600">{item.confidence || "high"}</td>
                            <td className="px-5 py-4 text-right">{item.originalCurrency} {item.originalAmount}</td>
                            <td className="px-6 py-4 text-right font-extrabold text-rose-600">{formatBDT(item.convertedAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Work Subscriptions */}
              {subItems.length > 0 && (
                <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h3 className="text-sm font-extrabold text-slate-800">Work Subscriptions ({subItems.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        <tr>
                          <th className="px-6 py-3.5">Subscription</th>
                          <th className="px-5 py-3.5">Confidence</th>
                          <th className="px-5 py-3.5 text-right">Original</th>
                          <th className="px-6 py-3.5 text-right">Deductible (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subItems.map((item) => (
                          <tr key={item._id} className="hover:bg-indigo-50/20">
                            <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                            <td className="px-5 py-4 uppercase text-[10px] font-extrabold text-indigo-600">{item.confidence || "high"}</td>
                            <td className="px-5 py-4 text-right">{item.originalCurrency} {item.originalAmount}</td>
                            <td className="px-6 py-4 text-right font-extrabold text-rose-600">{formatBDT(item.convertedAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Uncategorized Items */}
              {report.uncategorizedItems && report.uncategorizedItems.length > 0 && (
                <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50/30 p-6 shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Uncategorized Items ({report.uncategorizedItems.length})
                  </h3>
                  <div className="overflow-x-auto bg-white rounded-2xl border border-amber-200/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-amber-100/50 text-[9px] font-extrabold uppercase text-amber-900 tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Source Type</th>
                          <th className="px-4 py-3 text-right">Amount (BDT)</th>
                          <th className="px-4 py-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 font-semibold text-slate-700">
                        {report.uncategorizedItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-bold text-slate-800">{item.description}</td>
                            <td className="px-4 py-3 uppercase text-[10px]">{item.sourceType}</td>
                            <td className="px-4 py-3 text-right font-extrabold">{formatBDT(item.amount)}</td>
                            <td className="px-4 py-3 text-amber-800">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}
