import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";

import { deleteExpense } from "../../api/expenseApi";

export default function DeleteExpenseModal({ expense, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!expense) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteExpense(expense._id);
      await onDeleted?.("Expense deleted successfully.");
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The expense could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close delete modal" />
      <section className="relative z-10 w-full max-w-md rounded-[22px] border border-red-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={21} />
          </span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-slate-900">Delete expense?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          “{expense.description}” and its receipt will be permanently removed. This action cannot be undone.
        </p>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
