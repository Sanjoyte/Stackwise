import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { importExpenses } from "../../api/expenseApi";
import { parseExpenseCsv } from "../../utils/expenseCsv";

export default function CsvImportModal({ categories, onClose, onImported }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => row.valid), [rows]);
  const invalidRows = rows.length - validRows.length;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    setRows([]);
    setError("");

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file created from the Stackwise template.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("CSV files must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFileName(file.name);
    setParsing(true);

    try {
      const result = await parseExpenseCsv(file, categories);

      if (result.headerError) {
        setError(result.headerError);
        return;
      }
      if (result.parseErrors?.length) {
        setError("Some CSV syntax could not be parsed. Fix the quoted fields and try again.");
      }
      setRows(result.rows);
    } catch (parseError) {
      setError(parseError.message || "The CSV file could not be read.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setError("");

    try {
      const result = await importExpenses(validRows.map((row) => row.normalized));
      await onImported?.(
        `${result.imported} expense${result.imported === 1 ? "" : "s"} imported successfully.`
      );
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The expenses could not be imported.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close import modal" />

      <section className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-indigo-100 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-500">
              Stackwise template
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">Import Expenses</h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">
              Use the official template. Stackwise validates every row and lets you review it before anything is saved.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <FileSpreadsheet size={19} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Start with the exact columns</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Dates use YYYY-MM-DD. Category names must match your available Stackwise categories. Duplicate rows are allowed.
                  </p>
                </div>
              </div>
              <a
                href="/templates/stackwise-expenses-template.csv"
                download="stackwise-expenses-template.csv"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-xs font-bold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Download size={15} /> Download CSV Template
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Example row</p>
              <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-xl bg-slate-900 px-3 py-3 text-[10px] text-indigo-100">
                2026-08-14,Laptop Stand,3000,BDT,Hardware,business,Star Tech,Card,Desk accessory
              </code>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                “Hardware” is illustrative; use a category shown in your Stackwise category selector.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white px-5 py-7 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Upload size={20} />
            </span>
            <strong className="mt-3 text-sm text-slate-700">
              {parsing ? "Parsing file..." : fileName || "Choose Stackwise CSV file"}
            </strong>
            <span className="mt-1 text-[11px] text-slate-400">.csv only, up to 2 MB</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" disabled={parsing || importing} />
          </label>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600">
              {error}
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Import Preview</h3>
                  <p className="mt-0.5 text-[10px] text-slate-400">Review validation before confirming.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{rows.length} found</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">{validRows.length} valid</span>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">{invalidRows} invalid</span>
                </div>
              </div>

              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="sticky top-0 bg-white text-[9px] uppercase tracking-[0.1em] text-slate-400 shadow-[0_1px_0_#f1f5f9]">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                    {rows.map((row) => (
                      <tr key={row.rowNumber} className={row.valid ? "bg-white" : "bg-red-50/40"}>
                        <td className="px-4 py-3 font-bold text-slate-400">{row.rowNumber}</td>
                        <td className="px-4 py-3">{row.original.date}</td>
                        <td className="max-w-48 truncate px-4 py-3 font-semibold text-slate-700">{row.original.description}</td>
                        <td className="px-4 py-3">{row.original.category}</td>
                        <td className="px-4 py-3 capitalize">{row.original.expenseType}</td>
                        <td className="px-4 py-3">{row.original.currency} {row.original.amount}</td>
                        <td className="px-4 py-3">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={13} /> Valid</span>
                          ) : (
                            <span className="inline-flex max-w-56 items-start gap-1 font-semibold text-red-600" title={row.errors.join(", ")}>
                              <XCircle size={13} className="mt-0.5 shrink-0" /> {row.errors.join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!validRows.length || importing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={15} />
            {importing ? "Importing..." : `Import ${validRows.length || ""} Valid Row${validRows.length === 1 ? "" : "s"}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
