import {
  Calendar,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchClients, createClient, deleteClient } from "../../api/profitabilityApi";

import {
  createExpense,
  removeExpenseReceipt,
  scanReceipt,
  updateExpense,
  uploadExpenseReceipt,
} from "../../api/expenseApi";
import { EXPENSE_CURRENCIES } from "../../utils/expenseCsv";
import { mergeOcrFields, OCR_FIELDS, sanitizeOcrFields } from "../../utils/receiptAutofill";
import "../../plus_button_drawer.css";

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png"];

// file.type can be "" on some Android/Windows pickers even with `accept` set on the input.
const guessMimeFromName = (name = "") => {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  return "";
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (currency) => ({
  description: "",
  amount: "",
  currency,
  date: today(),
  category: "",
  expenseType: "business",
  clientName: "",
  merchant: "",
  paymentMethod: "",
  notes: "",
});

const formFromExpense = (expense, currency) =>
  expense
    ? {
        description: expense.description || "",
        amount: expense.amount ?? "",
        currency: expense.currency || currency,
        date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : today(),
        category: expense.category?.slug || "",
        expenseType: expense.expenseType || "business",
        clientName: expense.clientName || "",
        merchant: expense.merchant || "",
        paymentMethod: expense.paymentMethod || "",
        notes: expense.notes || "",
      }
    : emptyForm(currency);

export default function ExpenseDrawer({
  expense,
  categories,
  userCurrency,
  onClose,
  onChanged,
}) {
  const [savedExpense, setSavedExpense] = useState(null);
  const effectiveExpense = savedExpense || expense;
  const [form, setForm] = useState(() => formFromExpense(expense, userCurrency));
  const [receiptFile, setReceiptFile] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState(null); // { tone: "info"|"success"|"warning", message }
  const [ocrValues, setOcrValues] = useState({}); // field -> value OCR wrote
  const [ocrPrevious, setOcrPrevious] = useState({}); // field -> value that was there before the FIRST scan

  // Editing an existing expense: every OCR-eligible field was authored by the user at some
  // point, so a scan there should fill nothing. The drawer remounts per expense (see
  // ExpensesPage.jsx's `key={editingExpense?._id || "new-expense"}`), so this ref never goes stale.
  const touchedRef = useRef(new Set(expense ? OCR_FIELDS : []));
  const formRef = useRef(form);
  const scanIdRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(
    () => () => {
      scanIdRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    let active = true;
    fetchClients()
      .then((result) => {
        if (active) setClients(result);
      })
      .catch(() => {
        if (active) setClients([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const markTouched = (...fields) => fields.forEach((field) => touchedRef.current.add(field));

  // The badge is derived from value equality, not from a Set that must be remembered to clear —
  // any keystroke changes form[field], equality breaks, and the badge vanishes for free.
  const ocrFilled = useMemo(
    () => new Set(Object.keys(ocrValues).filter((field) => form[field] === ocrValues[field])),
    [form, ocrValues]
  );

  const revertField = (field) => {
    setForm((current) => ({ ...current, [field]: ocrPrevious[field] ?? "" }));
    setOcrValues((prior) => {
      const next = { ...prior };
      delete next[field];
      return next;
    });
    // Deliberately NOT marking touched: reverting restores the pre-scan default, it doesn't
    // author a value, so a rescan of a better photo may still fill it.
  };

  const selectedFileLabel = useMemo(
    () => receiptFile?.name || "JPG or PNG, up to 5 MB",
    [receiptFile]
  );

  const selectedClient = clients.find(
    (client) => String(client.name).toLowerCase() === String(form.clientName || "").toLowerCase()
  ) || null;

  const handleClientSelect = (clientId) => {
    markTouched("clientName");
    if (!clientId) {
      setForm((current) => ({ ...current, clientName: "" }));
    } else {
      const selected = clients.find((client) => String(client._id) === String(clientId));
      setForm((current) => ({ ...current, clientName: selected ? selected.name : "" }));
    }
    setDropdownOpen(false);
    setShowNewClientInput(false);
    setNewClientName("");
  };

  const handleDeleteClient = async (event, client) => {
    event.stopPropagation();
    if (!window.confirm(`Delete "${client.name}"? This only removes it from the dropdown — historical records keep their name.`)) return;
    try {
      await deleteClient(client._id);
      setClients((prev) => prev.filter((item) => String(item._id) !== String(client._id)));
      if (String(form.expenseType) !== "personal" && String(form.clientName).toLowerCase() === String(client.name).toLowerCase()) {
        markTouched("clientName");
        setForm((current) => ({ ...current, clientName: "" }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete client/project.");
    }
    setDropdownOpen(false);
  };

  const handleAddNewClient = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    const name = newClientName.trim();
    if (!name) {
      setError("Please enter a client/project name.");
      return;
    }
    try {
      const created = await createClient(name);
      setClients((prev) => {
        if (prev.some((item) => String(item._id) === String(created._id))) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (form.expenseType !== "personal") {
        markTouched("clientName");
        setForm((current) => ({ ...current, clientName: created.name }));
      }
      setShowNewClientInput(false);
      setNewClientName("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not add client/project.");
    }
  };

  const handleFile = async (event) => {
    const input = event.target;
    const file = input.files?.[0] || null;
    input.value = ""; // always reset: re-picking the same file must re-fire onChange
    if (!file) return;

    setScanNotice(null);

    const mime = file.type || guessMimeFromName(file.name);
    if (!RECEIPT_MIME_TYPES.includes(mime)) {
      setScanNotice({ tone: "warning", message: "Receipts must be JPG, JPEG, or PNG images." });
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setScanNotice({ tone: "warning", message: "Receipt images must be 5 MB or smaller." });
      return;
    }

    // Existing behavior, preserved exactly: the permanent upload still only happens on save.
    setReceiptFile(file);
    setRemoveReceipt(false);

    const runId = ++scanIdRef.current; // bumped BEFORE abort, so a cancel reads as stale, not failed
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScanning(true);

    try {
      const result = await scanReceipt(file, { signal: controller.signal });
      if (runId !== scanIdRef.current) return; // stale — a later file selection already won

      if (!result.scanned) {
        setScanNotice({
          tone: "info",
          message: "We couldn't find any text on this image. Fill in the details manually — the receipt will still be attached when you save.",
        });
        return;
      }

      const { next, applied, previous } = mergeOcrFields({
        current: formRef.current,
        incoming: sanitizeOcrFields(result.fields, categories),
        touched: touchedRef.current,
      });
      const count = Object.keys(applied).length;

      if (!count) {
        setScanNotice({ tone: "info", message: "Nothing new to fill — your existing entries were kept." });
        return;
      }

      setForm(next);
      setOcrValues((prior) => ({ ...prior, ...applied }));
      // `previous` spread first so an existing entry is never overwritten — if the user scans
      // receipt A then B without editing, revert must restore the true pre-scan value, not A's guess.
      setOcrPrevious((prior) => ({ ...previous, ...prior }));
      setScanNotice({
        tone: "success",
        message: `Filled ${count} field${count === 1 ? "" : "s"} from the receipt. Check them before saving.`,
      });
    } catch (scanError) {
      if (runId !== scanIdRef.current) return;
      if (scanError.code === "ERR_CANCELED" || scanError.name === "CanceledError") return;
      setScanNotice({
        tone: "warning",
        message:
          scanError.response?.data?.message ||
          "We couldn't read this receipt. Enter the details manually — the image will still be saved.",
      });
    } finally {
      if (runId === scanIdRef.current) setScanning(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    markTouched(name);
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    if (!form.description.trim()) return "Description is required.";
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      return "Amount must be greater than zero.";
    }
    if (!form.date) return "Date is required.";
    if (!form.category) return "Category is required.";
    if (!["business", "personal"].includes(form.expenseType)) {
      return "Choose business or personal.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = { ...form, amount: Number(form.amount) };
      const persisted = effectiveExpense
        ? await updateExpense(effectiveExpense._id, payload)
        : await createExpense(payload);

      setSavedExpense(persisted);

      if (removeReceipt && !receiptFile && persisted.receipt) {
        await removeExpenseReceipt(persisted._id);
      }

      if (receiptFile) {
        try {
          await uploadExpenseReceipt(persisted._id, receiptFile);
        } catch (receiptError) {
          await onChanged?.(
            "Expense saved, but the receipt upload failed. You can retry from this drawer.",
            "warning",
            persisted
          );
          setError(
            receiptError.response?.data?.message || "Expense saved, but the receipt upload failed. Choose the image and save again."
          );
          return;
        }
      }

      await onChanged?.(
        effectiveExpense ? "Expense updated successfully." : "Expense added successfully.",
        "success",
        persisted
      );
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The expense could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close expense drawer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="drawer-bg relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto px-5 py-6 shadow-2xl sm:px-7 md:rounded-l-3xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-500">
              Expense tracking
            </p>
            <h2 className="drawer-title flex items-center gap-2 text-2xl font-bold">
              <ReceiptText size={23} />
              {effectiveExpense ? "Edit Expense" : "Add Expense"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition hover:text-indigo-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          <ExpenseField
            label="Description *"
            fromReceipt={ocrFilled.has("description")}
            onRevert={() => revertField("description")}
          >
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={120}
              placeholder="e.g. Laptop Stand"
              required
            />
          </ExpenseField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ExpenseField label="Amount *" fromReceipt={ocrFilled.has("amount")} onRevert={() => revertField("amount")}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="3000"
                required
              />
            </ExpenseField>
            <ExpenseField label="Currency *" fromReceipt={ocrFilled.has("currency")} onRevert={() => revertField("currency")}>
              <select name="currency" value={form.currency} onChange={handleChange}>
                {EXPENSE_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </ExpenseField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ExpenseField
              label="Date *"
              icon={<Calendar size={15} />}
              fromReceipt={ocrFilled.has("date")}
              onRevert={() => revertField("date")}
            >
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </ExpenseField>
            <ExpenseField label="Category *" fromReceipt={ocrFilled.has("category")} onRevert={() => revertField("category")}>
              <select name="category" value={form.category} onChange={handleChange} required>
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </ExpenseField>
          </div>

          <div>
            <span className="drawer-label mb-1.5 block font-semibold text-slate-700">
              Expense Type *
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-indigo-50 p-1.5">
              {["business", "personal"].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    markTouched("expenseType");
                    setForm((current) => ({ ...current, expenseType: type }));
                    // When switching to personal, clear client/project selection
                    if (type === "personal") {
                      markTouched("clientName");
                      setForm((c) => ({ ...c, clientName: "" }));
                    }
                  }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold capitalize transition ${form.expenseType === type ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {type}
                  </button>
                ))}
            </div>
          </div>

          {/* Client / Project section - only shown for business expenses */}
          {form.expenseType !== "personal" && (
            <div>
              <span className="drawer-label mb-1.5 block font-semibold text-slate-700">
                Client / Project (Optional)
              </span>
              <div className="space-y-2">
                {/* Custom dropdown trigger button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="drawer-input-container flex w-full items-center justify-between gap-2 bg-white px-3 py-2.5 text-left"
                  >
                    <span className={`text-base ${selectedClient ? "text-slate-900 capitalize" : "text-slate-400"}`}>
                      {selectedClient ? selectedClient.name : "No client/project"}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        <button
                          type="button"
                          onClick={() => handleClientSelect("")}
                          className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-indigo-50 ${!selectedClient ? "bg-indigo-50 font-bold text-indigo-600" : "text-slate-600"}`}
                        >
                          No client/project
                        </button>
                        {clients.map((client) => {
                          const isSelected = selectedClient && String(selectedClient._id) === String(client._id);
                          return (
                            <div
                              key={client._id}
                              className={`flex items-center justify-between px-3 py-2 transition hover:bg-indigo-50 ${isSelected ? "bg-indigo-50" : ""}`}
                            >
                              <button
                                type="button"
                                onClick={() => handleClientSelect(client._id)}
                                className="flex-1 text-left text-sm capitalize text-slate-800"
                              >
                                {client.name}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClient(e, client)}
                                className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                title={`Delete ${client.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <button type="button" onClick={() => setShowNewClientInput(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-700">
                  <Plus size={13} /> Add new client/project
                </button>
              </div>
            </div>
          )}

          <ExpenseField label="Merchant" fromReceipt={ocrFilled.has("merchant")} onRevert={() => revertField("merchant")}>
            <input name="merchant" value={form.merchant} onChange={handleChange} placeholder="e.g. Star Tech" />
          </ExpenseField>
          <ExpenseField
            label="Payment Method"
            fromReceipt={ocrFilled.has("paymentMethod")}
            onRevert={() => revertField("paymentMethod")}
          >
            <input name="paymentMethod" value={form.paymentMethod} onChange={handleChange} placeholder="e.g. Card" />
          </ExpenseField>

          <ExpenseField label="Notes">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              maxLength={500}
              rows={3}
              placeholder="Optional context for this expense"
            />
          </ExpenseField>

          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="drawer-label font-semibold text-slate-700">Receipt Image</label>
            {effectiveExpense?.receipt?.url && !removeReceipt && (
              <a
                href={effectiveExpense.receipt.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                View receipt <ExternalLink size={13} />
              </a>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-4 transition hover:border-indigo-400 hover:bg-indigo-50/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              {scanning ? <Loader2 size={19} className="animate-spin" /> : <ImagePlus size={19} />}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-slate-700">
                {scanning
                  ? "Scanning receipt…"
                  : receiptFile
                  ? "Receipt selected"
                  : effectiveExpense?.receipt && !removeReceipt
                  ? "Replace receipt"
                  : "Choose image"}
              </strong>
              <small className="block truncate text-xs text-slate-400">
                {scanning ? "Reading the text on your receipt" : selectedFileLabel}
              </small>
            </span>
            <input type="file" accept="image/jpeg,image/png" onChange={handleFile} className="sr-only" />
          </label>

          {scanNotice && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                scanNotice.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : scanNotice.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {scanNotice.tone === "success" ? (
                <Sparkles size={14} className="mt-0.5 shrink-0" />
              ) : (
                <Info size={14} className="mt-0.5 shrink-0" />
              )}
              <span className="flex-1">{scanNotice.message}</span>
              <button
                type="button"
                onClick={() => setScanNotice(null)}
                className="mt-0.5 shrink-0 opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {effectiveExpense?.receipt && !removeReceipt && !receiptFile && (
            <button
              type="button"
              onClick={() => setRemoveReceipt(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
            >
              <Trash2 size={13} /> Remove existing receipt
            </button>
          )}
          {removeReceipt && (
            <button
              type="button"
              onClick={() => setRemoveReceipt(false)}
              className="mt-2 text-xs font-semibold text-indigo-600"
            >
              Keep existing receipt
            </button>
          )}

          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-indigo-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="drawer-button-primary rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? "Saving..." : effectiveExpense ? "Save Changes" : "Save Expense"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function ExpenseField({ label, icon, children, fromReceipt = false, onRevert }) {
  return (
    <label className="block">
      <span className="drawer-label mb-1.5 flex items-center gap-1.5 font-semibold text-slate-700">
        {icon}{label}
        {fromReceipt && (
          <span className="drawer-tag-chip ml-auto !px-2 !py-0.5 !text-[10px]" title="Autofilled from your receipt">
            <Sparkles size={11} /> From receipt
            {onRevert && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRevert();
                }}
                className="ml-0.5 rounded-full opacity-70 transition hover:opacity-100"
                aria-label={`Undo the receipt value for ${label}`}
              >
                <Undo2 size={11} />
              </button>
            )}
          </span>
        )}
      </span>
      <span className="drawer-input-container block bg-white px-3 py-2.5 [&_input]:w-full [&_input]:bg-transparent [&_input]:text-slate-900 [&_input]:outline-none [&_select]:w-full [&_select]:bg-transparent [&_select]:text-slate-900 [&_select]:outline-none [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:bg-transparent [&_textarea]:text-slate-900 [&_textarea]:outline-none">
        {children}
      </span>
    </label>
  );
}