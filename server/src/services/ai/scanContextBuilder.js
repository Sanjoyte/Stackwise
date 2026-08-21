import User from "../../models/User.js";
import Income from "../../models/Income.js";
import Expense from "../../models/Expense.js";
import Subscription from "../../models/Subscription.js";
import TaxBracketSet from "../../models/tax/TaxBracketSet.js";
import DeductibleCategoryRule from "../../models/tax/DeductibleCategoryRule.js";
import DeductionFlag from "../../models/tax/DeductionFlag.js";
import MissedDeductionSuggestion from "../../models/tax/MissedDeductionSuggestion.js";
import { getTaxYearFromPeriod } from "../../utils/taxUtils.js";

/**
 * Builds full context payload for Gemini AI Deduction Scan.
 */
export const buildScanContext = async (userId, periodStart, periodEnd) => {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const taxYear = getTaxYearFromPeriod(pEnd);

  const user = await User.findById(userId).select("-password").lean();
  if (!user) throw new Error("User profile not found.");

  const jurisdictionCode = (user.jurisdictionCode || "BD").toUpperCase();
  const taxpayerCategory = user.taxpayerCategory || "general";

  const [taxRules, incomes, expenses, subscriptions, existingFlags, existingSuggestions] = await Promise.all([
    DeductibleCategoryRule.find({
      jurisdictionCode,
      isActive: true,
    }).lean(),
    Income.find({
      user: userId,
      date: { $gte: pStart, $lte: pEnd },
    }).lean(),
    Expense.find({
      user: userId,
      date: { $gte: pStart, $lte: pEnd },
    }).lean(),
    Subscription.find({
      user: userId,
      status: "active",
      isWorkRelated: { $ne: false },
      category: { $nin: ["Entertainment", "Streaming", "Gaming", "Personal"] },
      name: { $not: /netflix|spotify|hulu|disney|hbo|apple tv|playstation|xbox|nintendo/i },
    }).lean(),
    DeductionFlag.find({
      userId,
      createdAt: { $gte: pStart },
    }).lean(),
    MissedDeductionSuggestion.find({
      userId,
      status: { $in: ["suggested", "accepted"] },
    }).lean(),
  ]);

  return {
    user: {
      id: user._id,
      workType: user.workType || "freelancer",
      taxpayerCategory,
      jurisdictionCode,
      baseCurrency: user.baseCurrency || "BDT",
    },
    taxYear,
    periodStart: pStart,
    periodEnd: pEnd,
    taxRules: taxRules.map((r) => ({
      categoryTag: r.categoryTag,
      description: r.description,
      capType: r.capType,
      capValue: r.capValue,
    })),
    income: incomes.slice(0, 100).map((i) => ({
      _id: i._id,
      source: i.source,
      clientName: i.clientName,
      amount: i.amount,
      currency: i.currency || "USD",
      date: i.date,
      notes: i.notes,
    })),
    expenses: expenses.slice(0, 100).map((e) => ({
      _id: e._id,
      description: e.description,
      amount: e.amount,
      currency: e.currency || "BDT",
      category: e.category?.name || e.category,
      expenseType: e.expenseType,
      date: e.date,
    })),
    subscriptions: subscriptions.map((s) => ({
      _id: s._id,
      name: s.name,
      amount: s.amount,
      currency: s.currency || "USD",
      category: s.category,
      usagePercentage: s.usagePercentage,
    })),
    existingFlags: existingFlags.map((f) => ({
      sourceId: f.sourceId,
      categoryTag: f.categoryTag,
      status: f.status,
    })),
    existingSuggestions: existingSuggestions.map((s) => ({
      categoryTag: s.categoryTag,
      status: s.status,
    })),
  };
};
