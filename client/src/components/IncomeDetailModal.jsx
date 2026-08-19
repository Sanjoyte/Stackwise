import { X, Calendar, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";
import api from "../api/axios";

export default function IncomeDetailModal({
  income,
  isOpen,
  onClose,
  onSuccess,
  onEdit,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !income) return null;

  const formatItemCurrency = (val, curr) => {
    if (curr === "USD") return `$${Number(val).toFixed(2)}`;
    if (curr === "BDT") return `৳${Number(val).toFixed(0)}`;
    return `${curr} ${Number(val).toFixed(2)}`;
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this income entry?")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/incomes/${income._id}`);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-start gap-4 pr-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <span className="text-2xl font-bold uppercase">{income.source.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 capitalize">{income.source}</h2>
            <p className="text-sm text-slate-500 mt-1">{income.clientName || "General"}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Amount</p>
          <p className="text-3xl font-extrabold text-slate-900">
            {formatItemCurrency(income.amount, income.currency)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Date Received</p>
              <p className="font-bold text-slate-800">
                {new Date(income.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {income.notes && (
            <div className="flex items-start gap-3 pt-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <span className="font-bold text-xs">TXT</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Notes / Tags</p>
                <p className="font-medium text-slate-700 mt-0.5">{income.notes}</p>
              </div>
            </div>
          )}

          {income.linkedTemplate && (
            <div className="mt-4 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
              Logged from template
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => onEdit(income)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition"
          >
            <Edit3 size={16} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
