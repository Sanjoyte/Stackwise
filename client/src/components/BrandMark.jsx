import { Layers3 } from "lucide-react";

export default function BrandMark({
  darkText = false,
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
        <Layers3
          size={24}
          className="text-white"
          strokeWidth={2.4}
        />
      </div>

      <div>
        <p
          className={`text-lg font-bold tracking-tight ${
            darkText
              ? "text-slate-900"
              : "text-white"
          }`}
        >
          Stackwise
        </p>

        <p
          className={`text-[10px] uppercase tracking-[0.2em] ${
            darkText
              ? "text-indigo-500"
              : "text-indigo-200"
          }`}
        >
          Financial clarity
        </p>
      </div>
    </div>
  );
}