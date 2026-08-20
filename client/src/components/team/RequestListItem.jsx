import { Repeat2, ReceiptText, ChevronRight } from "lucide-react";

import { formatCurrency } from "../../utils/formatCurrency";
import { STATUS_LABELS, statusBadgeClass } from "../../utils/teamRequestLabels";

export default function RequestListItem({ request, onClick }) {
  const Icon = request.requestType === "subscription" ? Repeat2 : ReceiptText;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-indigo-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900">
            {request.title}
          </p>
          <span className={statusBadgeClass(request.status)}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>

        <p className="mt-0.5 truncate text-sm text-slate-400">
          {request.requestedByName ? `${request.requestedByName} · ` : ""}
          {request.category}
          {request.requestType === "subscription" && request.billingCycle
            ? ` · ${request.billingCycle}`
            : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold text-slate-900">
          {formatCurrency(request.amount, request.currency)}
        </p>
        <p className="text-xs text-slate-400">
          {new Date(request.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </button>
  );
}
