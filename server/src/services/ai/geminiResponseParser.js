import DeductibleCategoryRule from "../../models/tax/DeductibleCategoryRule.js";
import DeductionFlag from "../../models/tax/DeductionFlag.js";
import MissedDeductionSuggestion from "../../models/tax/MissedDeductionSuggestion.js";
import Expense from "../../models/Expense.js";
import Subscription from "../../models/Subscription.js";

/**
 * Safely parse JSON from raw text output (handling markdown block wrappers).
 */
export const parseRawAiJson = (rawText) => {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // continue
      }
    }
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }
  }
  return null;
};

/**
 * Parse structured AI output and populate DeductionFlag & MissedDeductionSuggestion collections.
 */
export const processAiScanResponse = async ({
  context,
  parsedResponse,
  scanId,
}) => {
  if (!parsedResponse) {
    return { newDeductionFlags: 0, newMissedSuggestions: 0, errors: ["Invalid AI JSON response"] };
  }

  const userId = context.user.id;
  const jurisdictionCode = context.user.jurisdictionCode;
  const taxYear = context.taxYear;

  const validRules = await DeductibleCategoryRule.find({
    jurisdictionCode,
    isActive: true,
  }).lean();

  const ruleMap = new Map();
  validRules.forEach((r) => ruleMap.set(r.categoryTag.toLowerCase(), r));

  let createdFlagsCount = 0;
  let createdSuggestionsCount = 0;
  const errors = [];

  // 1. Process Expense Flags
  const expenseFlags = Array.isArray(parsedResponse.expenseFlags) ? parsedResponse.expenseFlags : [];
  for (const item of expenseFlags) {
    try {
      if (!item.sourceId || !item.suggestedCategory) continue;

      const tag = item.suggestedCategory.toLowerCase().trim();
      const matchedRule = ruleMap.get(tag);
      if (!matchedRule) continue; // Reject invalid categories strictly

      const expense = await Expense.findOne({ _id: item.sourceId, user: userId });
      if (!expense) continue;

      // Check duplicate
      const existing = await DeductionFlag.findOne({
        userId,
        sourceId: item.sourceId,
        status: { $in: ["suggested", "accepted"] },
      });
      if (existing) continue;

      await DeductionFlag.create({
        userId,
        sourceType: "expense",
        sourceId: expense._id,
        description: expense.description || "Expense Item",
        categoryTag: tag,
        deductionRuleApplied: matchedRule._id,
        detectionMethod: "ai",
        confidence: item.confidence || "medium",
        rationale: item.rationale || "AI identified potential business deduction opportunity.",
        aiRationale: item.rationale || "",
        scanId,
        status: "suggested",
      });
      createdFlagsCount++;
    } catch (err) {
      errors.push(`Expense flag error: ${err.message}`);
    }
  }

  // 2. Process Subscription Flags
  const subFlags = Array.isArray(parsedResponse.subscriptionFlags) ? parsedResponse.subscriptionFlags : [];
  for (const item of subFlags) {
    try {
      if (!item.sourceId || !item.suggestedCategory) continue;

      const tag = item.suggestedCategory.toLowerCase().trim();
      const matchedRule = ruleMap.get(tag) || ruleMap.get("subscription");
      if (!matchedRule) continue;

      const sub = await Subscription.findOne({ _id: item.sourceId, user: userId });
      if (!sub) continue;

      const existing = await DeductionFlag.findOne({
        userId,
        sourceId: item.sourceId,
        status: { $in: ["suggested", "accepted"] },
      });
      if (existing) continue;

      await DeductionFlag.create({
        userId,
        sourceType: "subscription",
        sourceId: sub._id,
        description: `${sub.name} Subscription`,
        categoryTag: tag,
        deductionRuleApplied: matchedRule._id,
        detectionMethod: "ai",
        confidence: item.confidence || "medium",
        rationale: item.rationale || "Work subscription eligible for business tax deduction.",
        aiRationale: item.rationale || "",
        scanId,
        status: "suggested",
      });
      createdFlagsCount++;
    } catch (err) {
      errors.push(`Subscription flag error: ${err.message}`);
    }
  }

  // 3. Process Missed Deduction Suggestions
  const missedDeductions = Array.isArray(parsedResponse.missedDeductions) ? parsedResponse.missedDeductions : [];
  for (const item of missedDeductions) {
    try {
      const tag = (item.categoryTag || item.suggestedCategory || "").toLowerCase().trim();
      const matchedRule = ruleMap.get(tag);
      if (!matchedRule) continue;

      // Check duplicate pending suggestion for user + category
      const existing = await MissedDeductionSuggestion.findOne({
        userId,
        categoryTag: tag,
        status: { $in: ["suggested", "accepted"] },
      });
      if (existing) continue;

      const supportingEntries = [];
      if (Array.isArray(item.supportingEntryIds)) {
        for (const id of item.supportingEntryIds) {
          const exp = context.expenses.find((e) => e._id.toString() === id.toString());
          if (exp) {
            supportingEntries.push({
              sourceType: "expense",
              sourceId: exp._id,
              description: exp.description,
              amount: exp.amount,
              date: exp.date,
            });
          }
          const inc = context.income.find((i) => i._id.toString() === id.toString());
          if (inc) {
            supportingEntries.push({
              sourceType: "income",
              sourceId: inc._id,
              description: inc.notes || `Income from ${inc.clientName || inc.source}`,
              amount: inc.amount,
              date: inc.date,
            });
          }
        }
      }

      await MissedDeductionSuggestion.create({
        userId,
        jurisdictionCode,
        taxYear,
        suggestedCategory: matchedRule.description || tag,
        categoryTag: tag,
        rationale: item.rationale || "AI detected missing deduction based on income pattern.",
        aiReasoning: item.rationale || "",
        estimatedAmount: item.estimatedAmount || matchedRule.capValue || 25000,
        estimatedAmountCurrency: "BDT",
        supportingEntries,
        confidence: item.confidence || "medium",
        scanId,
        status: "suggested",
      });
      createdSuggestionsCount++;
    } catch (err) {
      errors.push(`Missed deduction error: ${err.message}`);
    }
  }

  return {
    newDeductionFlags: createdFlagsCount,
    newMissedSuggestions: createdSuggestionsCount,
    errors,
  };
};
