import {
  Calendar,
  ExternalLink,
  ImagePlus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  createExpense,
  removeExpenseReceipt,
  updateExpense,
  uploadExpenseReceipt,
} from "../../api/expenseApi";
import { EXPENSE_CURRENCIES } from "../../utils/expenseCsv";
import "../../plus_button_drawer.css";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (currency) => ({
  description: "",
  amount: "",
  currency,
  date: today(),
  category: "",
  expenseType: "business",
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

  const selectedFileLabel = useMemo(
    () => receiptFile?.name || "JPG or PNG, up to 5 MB",
    [receiptFile]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0] || null;
    setError("");

    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Receipts must be JPG, JPEG, or PNG images.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setReceiptFile(file);
    setRemoveReceipt(false);
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
            "warning"
          );
          setError(
            receiptError.response?.data?.message ||
              "Expense saved, but the receipt upload failed. Choose the image and save again."
          );
          return;
        }
      }

      await onChanged?.(
        effectiveExpense ? "Expense updated successfully." : "Expense added successfully.",
        "success"
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
          <ExpenseField label="Description *">
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
            <ExpenseField label="Amount *">
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
            <ExpenseField label="Currency *">
              <select name="currency" value={form.currency} onChange={handleChange}>
                {EXPENSE_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </ExpenseField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ExpenseField label="Date *" icon={<Calendar size={15} />}>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </ExpenseField>
            <ExpenseField label="Category *">
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
                  onClick={() => setForm((current) => ({ ...current, expenseType: type }))}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold capitalize transition ${
                    form.expenseType === type
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ExpenseField label="Merchant">
              <input name="merchant" value={form.merchant} onChange={handleChange} placeholder="e.g. Star Tech" />
            </ExpenseField>
            <ExpenseField label="Payment Method">
              <input name="paymentMethod" value={form.paymentMethod} onChange={handleChange} placeholder="e.g. Card" />
            </ExpenseField>
          </div>

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

          <div>
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
                <ImagePlus size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-slate-700">
                  {receiptFile ? "Receipt selected" : effectiveExpense?.receipt && !removeReceipt ? "Replace receipt" : "Choose image"}
                </strong>
                <small className="block truncate text-xs text-slate-400">{selectedFileLabel}</small>
              </span>
              <input type="file" accept="image/jpeg,image/png" onChange={handleFile} className="sr-only" />
            </label>

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
          </div>

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

function ExpenseField({ label, icon, children }) {
  return (
    <label className="block">
      <span className="drawer-label mb-1.5 flex items-center gap-1.5 font-semibold text-slate-700">
        {icon}{label}
      </span>
      <span className="drawer-input-container block bg-white px-3 py-2.5 [&_input]:w-full [&_input]:bg-transparent [&_input]:text-slate-900 [&_input]:outline-none [&_select]:w-full [&_select]:bg-transparent [&_select]:text-slate-900 [&_select]:outline-none [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:bg-transparent [&_textarea]:text-slate-900 [&_textarea]:outline-none">
        {children}
      </span>
    </label>
  );
}
