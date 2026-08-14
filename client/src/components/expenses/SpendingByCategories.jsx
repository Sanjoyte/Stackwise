import {
  Car, ChevronRight, CircleEllipsis, GraduationCap, HeartPulse, House,
  Laptop, Lightbulb, Music, Plane, Plus, ShoppingBag, ShoppingBasket,
  Sparkles, Wallet, Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchCategorySpending,
  updateCategoryBudget,
} from "../../api/expenseCategoryApi";

import AddCategoryModal from "./AddCategoryModal";

const ICONS = {
  "shopping-basket": ShoppingBasket,
  car: Car,
  house: House,
  zap: Zap,
  music: Music,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  plane: Plane,
  laptop: Laptop,
  sparkles: Sparkles,
  wallet: Wallet,
  "circle-ellipsis": CircleEllipsis,
};

const CATEGORY_THEMES = {
  red: {
    icon: "bg-red-50 text-red-500",
    bar: "bg-red-500",
    amount: "text-red-500",
    border: "hover:border-red-200",
  },
  rose: {
    icon: "bg-rose-50 text-rose-500",
    bar: "bg-rose-500",
    amount: "text-rose-500",
    border: "hover:border-rose-200",
  },
  pink: {
    icon: "bg-pink-50 text-pink-500",
    bar: "bg-pink-500",
    amount: "text-pink-500",
    border: "hover:border-pink-200",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    amount: "text-emerald-600",
    border: "hover:border-emerald-200",
  },
  blue: {
    icon: "bg-blue-50 text-blue-500",
    bar: "bg-blue-500",
    amount: "text-blue-500",
    border: "hover:border-blue-200",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600",
    bar: "bg-cyan-500",
    amount: "text-cyan-600",
    border: "hover:border-cyan-200",
  },
  purple: {
    icon: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    amount: "text-violet-600",
    border: "hover:border-violet-200",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    amount: "text-violet-600",
    border: "hover:border-violet-200",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-500",
    amount: "text-indigo-600",
    border: "hover:border-indigo-200",
  },
  yellow: {
    icon: "bg-amber-50 text-amber-500",
    bar: "bg-amber-400",
    amount: "text-amber-600",
    border: "hover:border-amber-200",
  },
  orange: {
    icon: "bg-orange-50 text-orange-500",
    bar: "bg-orange-500",
    amount: "text-orange-500",
    border: "hover:border-orange-200",
  },
  slate: {
    icon: "bg-slate-100 text-slate-500",
    bar: "bg-slate-500",
    amount: "text-slate-600",
    border: "hover:border-slate-300",
  },
};

const formatMoney = (value) =>
  `BDT ${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;

const getBudgetStatus = (category) => {
  const budget = Number(category.budget || 0);
  const spent = Number(category.amount || 0);

  if (budget <= 0) return null;

  const percentage = (spent / budget) * 100;

  if (percentage > 100) {
    return {
      label: "Over Budget",
      percentage,
      className: "bg-red-50 text-red-600 border-red-100",
    };
  }

  if (percentage >= 80) {
    return {
      label: "Near Limit",
      percentage,
      className: "bg-orange-50 text-orange-600 border-orange-100",
    };
  }

  if (percentage >= 60) {
    return {
      label: "Watch",
      percentage,
      className: "bg-amber-50 text-amber-600 border-amber-100",
    };
  }

  return {
    label: "Safe",
    percentage,
    className: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
};

export default function SpendingByCategories({ period = "monthly" }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const result = await fetchCategorySpending(period);
      setData(result);
      setError("");
    } catch (err) {
      console.error("Category spending error:", err);
      setError("Could not load expense categories.");
    } finally {
      setLoading(false);
    }
  };
  const handleBudget = async (event, category) => {
  event.stopPropagation();

  const input = window.prompt(
    `Enter monthly budget for ${category.name}:`,
    category.monthlyBudget ?? ""
  );

  if (input === null) return;

  const budget = Number(input);

  if (!Number.isFinite(budget) || budget <= 0) {
    window.alert("Please enter a valid budget greater than 0.");
    return;
  }

  try {
    await updateCategoryBudget(category.slug, budget);
    await loadCategories();
  } catch (error) {
    console.error("Budget update error:", error);
    window.alert("Could not update budget.");
  }
};

  useEffect(() => {
    loadCategories();
  }, [period]);

  const categories = data?.categories || [];

  const visibleCategories = categories.filter(
    (category) => Number(category.amount) > 0 || category.isCustom
  );

  const spendingCategories = categories
    .filter((category) => Number(category.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  const topCategory = spendingCategories[0] || null;

  const topCategoryShare =
    topCategory && Number(data?.totalSpent) > 0
      ? (Number(topCategory.amount) / Number(data.totalSpent)) * 100
      : 0;

  const getProgress = (category) => {
    const amount = Number(category.amount || 0);
    const budget = Number(category.budget || 0);

    if (budget > 0) return Math.min(100, (amount / budget) * 100);

    if (Number(data?.totalSpent) > 0) {
      return Math.min(100, (amount / Number(data.totalSpent)) * 100);
    }

    return 0;
  };

  return (
    <>
      <section className="mt-6 overflow-hidden rounded-[26px] border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(68,55,130,0.04)]">

        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-7">
          <div>
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-indigo-500">
              Expense Analysis
            </p>
            <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">
              Spending By Categories
            </h2>
            <p className="mt-1.5 text-[11px] text-slate-400">
              See where your money is going this {period === "monthly" ? "month" : "year"}.
            </p>
          </div>

          {/*<button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[11px] font-bold text-white shadow-sm transition duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={15} />
            Add Category
          </button>*/}
        </div>

        <div className="p-5 sm:p-6 lg:px-7">

          {/* Spending Insight */}
          {!loading && !error && topCategory && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 px-4 py-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Lightbulb size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-indigo-500">
                    Spending Insight
                  </p>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-bold text-indigo-600">
                    TOP CATEGORY
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                  <strong className="text-slate-800">{topCategory.name}</strong>{" "}
                  is your highest spending category this {period === "monthly" ? "month" : "year"} at{" "}
                  <strong className="text-indigo-600">
                    {formatMoney(topCategory.amount)}
                  </strong>
                  , representing{" "}
                  <strong className="text-indigo-600">
                    {Math.round(topCategoryShare)}%
                  </strong>{" "}
                  of your total category spending.
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[92px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-8 text-center text-xs font-medium text-red-500">
              {error}
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                <Wallet size={21} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-700">
                No category spending yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-slate-400">
                Expenses will automatically appear here after they are assigned to a category.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCategories.map((category, index) => {
                const Icon = ICONS[category.icon] || Wallet;
                const theme =
                  CATEGORY_THEMES[category.theme] || CATEGORY_THEMES.indigo;

                const progress = getProgress(category);
                const hasBudget = Number(category.budget) > 0;
                const budgetStatus = getBudgetStatus(category);

                return (
                  <button
                    type="button"
                    key={category.slug}
                    onClick={() =>
                      navigate(
                        `/expense-categories/${category.slug}?period=${period}`
                      )
                    }
                    className={`group w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-50/40 hover:shadow-[0_8px_25px_rgba(39,32,76,0.06)] ${theme.border}`}
                  >
                    <div className="flex items-center gap-3.5">

                      {/* Icon */}
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${theme.icon}`}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1">

                        {/* Category Title + Amount */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-[12px] font-bold text-slate-800">
                                {category.name}
                              </h3>

                              {/* Optional ranking */}
                              {Number(category.amount) > 0 && index < 3 && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-500">
                                  #{index + 1}
                                </span>
                              )}

                              {/* Budget Status Badge */}
                              {budgetStatus && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${budgetStatus.className}`}
                                >
                                  {budgetStatus.label}
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {category.transactionCount} transaction
                              {category.transactionCount === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-[11px] font-extrabold ${theme.amount}`}>
                                  {formatMoney(category.amount)}
                                </span>

                                {hasBudget && (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    / {formatMoney(category.budget)}
                                  </span>
                                )}
                              </div>

                              {hasBudget && (
                                <p className="mt-0.5 text-[8px] text-slate-400">
                                  {Math.round(budgetStatus.percentage)}% of budget
                                </p>
                              )}

                              
                            </div>

                            <ChevronRight
                              size={17}
                              className="text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 h-[7px] w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                            style={{
                              width: `${Math.max(progress > 0 ? 3 : 0, progress)}%`,
                            }}
                          />
                        </div>

                        {/* Bottom Details */}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[8px] font-medium text-slate-400">
                            {hasBudget
                              ? `${Math.round(budgetStatus.percentage)}% used`
                              : `${Math.round(progress)}% of total spending`}
                          </span>

                          {hasBudget && (
                            <span
                              className={`text-[8px] font-semibold ${
                                Number(category.amount) > Number(category.budget)
                                  ? "text-red-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {Number(category.amount) > Number(category.budget)
                                ? `${formatMoney(
                                    Number(category.amount) -
                                      Number(category.budget)
                                  )} over budget`
                                : `${formatMoney(
                                    Number(category.budget) -
                                      Number(category.amount)
                                  )} remaining`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && !error && visibleCategories.length > 0 && (
            <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] text-slate-400">
                Click a category to view its detailed spending summary and recent transactions.
              </p>

              <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-[9px] font-bold text-indigo-600">
                Total Spent: {formatMoney(data?.totalSpent)}
              </div>
            </div>
          )}
        </div>
      </section>

      <AddCategoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadCategories}
      />
    </>
  );
}