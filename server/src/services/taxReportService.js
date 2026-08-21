import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Subscription from "../models/Subscription.js";
import SubscriptionUsageLog from "../models/SubscriptionUsageLog.js";
import User from "../models/User.js";
import TaxJurisdiction from "../models/tax/TaxJurisdiction.js";
import TaxBracketSet from "../models/tax/TaxBracketSet.js";
import DeductibleCategoryRule from "../models/tax/DeductibleCategoryRule.js";
import TaxReport from "../models/tax/TaxReport.js";

import { convertCurrency } from "../utils/expenseUtils.js";
import {
  getTaxYearFromPeriod,
  computeTaxLiability,
  categorizeForDeductions,
  applyDeductionCap,
} from "../utils/taxUtils.js";
import { generateTaxReportPDF } from "./pdfRenderService.js";

/**
 * Service to aggregate financial data, run tax rules engine, compute estimated tax,
 * and persist or preview tax reports.
 */
export const buildTaxReport = async ({
  userId,
  periodStart,
  periodEnd,
  jurisdictionCode = "BD",
  taxpayerCategory = "general",
  isPreview = false,
  customLineItems = null,
  customUncategorizedItems = null,
  customSummary = null,
}) => {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime())) {
    throw new Error("Invalid date range provided for tax report generation.");
  }

  if (pEnd < pStart) {
    throw new Error("Period end date cannot be earlier than start date.");
  }

  const taxYear = getTaxYearFromPeriod(pEnd);

  // 1. Fetch Jurisdiction & Tax Rules
  let [jurisdiction, bracketSet, deductibleRules, user] = await Promise.all([
    TaxJurisdiction.findOne({ code: jurisdictionCode.toUpperCase() }),
    TaxBracketSet.findOne({
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      taxYear,
      taxpayerCategory,
      isActive: true,
    }),
    DeductibleCategoryRule.find({
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      taxYear,
      isActive: true,
    }),
    User.findById(userId).select("-password"),
  ]);

  // Fallback to latest active bracket set for this jurisdiction + category if exact taxYear set is missing
  if (!bracketSet) {
    bracketSet = await TaxBracketSet.findOne({
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      taxpayerCategory,
      isActive: true,
    }).sort({ createdAt: -1 });
  }

  // Fallback to latest active deductible rules if exact taxYear set is empty
  if (!deductibleRules || deductibleRules.length === 0) {
    deductibleRules = await DeductibleCategoryRule.find({
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      isActive: true,
    });
  }

  if (!bracketSet) {
    const err = new Error(
      `Tax rules not configured for jurisdiction '${jurisdictionCode}' and category '${taxpayerCategory}'.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch User Financial Records for Period
  const [incomes, expenses, subscriptions] = await Promise.all([
    Income.find({
      user: userId,
      date: { $gte: pStart, $lte: pEnd },
    }).lean(),
    Expense.find({
      user: userId,
      date: { $gte: pStart, $lte: pEnd },
      expenseType: "business", // Exclude personal expenses strictly
    }).lean(),
    Subscription.find({
      user: userId,
      status: "active",
      isWorkRelated: { $ne: false },
      category: { $nin: ["Entertainment", "Streaming", "Gaming", "Personal"] },
      name: { $not: /netflix|spotify|hulu|disney|hbo|apple tv|playstation|xbox|nintendo/i },
    }).lean(),
  ]);

  const subIds = subscriptions.map((s) => s._id);
  const usageLogs = await SubscriptionUsageLog.find({
    subscriptionId: { $in: subIds },
  }).lean();

  let grossIncome = 0;
  let totalDeductions = 0;
  let exchangeRateCount = 0;

  const lineItems = [];
  const uncategorizedItems = [];

  // Phase A: Aggregate Income
  for (const inc of incomes) {
    const origCurr = (inc.currency || "USD").toUpperCase();
    const converted = convertCurrency({
      amount: inc.amount,
      fromCurrency: origCurr,
      toCurrency: "BDT",
    });

    if (origCurr !== "BDT") exchangeRateCount++;
    grossIncome += converted;

    lineItems.push({
      sourceType: "income",
      sourceId: inc._id,
      description: inc.notes || `Income from ${inc.clientName || inc.source || "Client"}`,
      category: inc.source || "client",
      deductible: false,
      confidence: "high",
      originalAmount: inc.amount,
      originalCurrency: origCurr,
      convertedAmount: Math.round(converted * 100) / 100,
      exchangeRate: origCurr === "BDT" ? 1 : 120,
      clientId: inc.clientProject || null,
    });
  }

  // Phase B: Aggregate Business Expenses
  for (const exp of expenses) {
    const origCurr = (exp.currency || "BDT").toUpperCase();
    const converted = convertCurrency({
      amount: exp.amount,
      fromCurrency: origCurr,
      toCurrency: "BDT",
    });

    if (origCurr !== "BDT") exchangeRateCount++;

    const catResult = categorizeForDeductions(exp, deductibleRules);

    if (catResult.deductible) {
      const capped = applyDeductionCap(converted, catResult.rule, grossIncome);
      totalDeductions += capped;

      lineItems.push({
        sourceType: "expense",
        sourceId: exp._id,
        description: exp.description || "Business Expense",
        category: exp.category?.name || "Business",
        deductible: true,
        deductionRuleApplied: catResult.rule?._id || null,
        confidence: catResult.confidence,
        originalAmount: exp.amount,
        originalCurrency: origCurr,
        convertedAmount: Math.round(capped * 100) / 100,
        exchangeRate: origCurr === "BDT" ? 1 : 120,
        clientId: exp.clientProject || null,
      });
    } else {
      uncategorizedItems.push({
        sourceType: "expense",
        sourceId: exp._id,
        description: exp.description || "Uncategorized Expense",
        amount: Math.round(converted * 100) / 100,
        reason: catResult.reason || "No matching tax rule",
      });
    }
  }

  // Phase C: Aggregate Subscriptions
  for (const sub of subscriptions) {
    const origCurr = (sub.currency || "USD").toUpperCase();
    const converted = convertCurrency({
      amount: sub.amount,
      fromCurrency: origCurr,
      toCurrency: "BDT",
    });

    if (origCurr !== "BDT") exchangeRateCount++;

    const catResult = categorizeForDeductions(sub, deductibleRules, usageLogs);
    totalDeductions += converted;

    lineItems.push({
      sourceType: "subscription",
      sourceId: sub._id,
      description: `${sub.name} (${sub.planName || "Software"})`,
      category: "subscription",
      deductible: true,
      deductionRuleApplied: catResult.rule?._id || null,
      confidence: catResult.confidence,
      originalAmount: sub.amount,
      originalCurrency: origCurr,
      convertedAmount: Math.round(converted * 100) / 100,
      exchangeRate: origCurr === "BDT" ? 1 : 120,
    });
  }

  grossIncome = Math.round(grossIncome * 100) / 100;
  totalDeductions = Math.round(totalDeductions * 100) / 100;

  // Phase D: Compute Tax Liability
  const estimatedTaxableIncome = Math.max(0, grossIncome - totalDeductions);
  const taxCalculation = computeTaxLiability(estimatedTaxableIncome, bracketSet);

  const summary = {
    grossIncome,
    totalDeductions,
    estimatedTaxableIncome: taxCalculation.taxableIncome,
    estimatedTax: taxCalculation.estimatedTax,
    exchangeRateCount,
  };

  // If preview mode, return full line items and summary structure without database persistence
  if (isPreview) {
    return {
      success: true,
      isPreview: true,
      jurisdictionCode,
      taxYear,
      taxpayerCategory,
      summary,
      lineItems,
      uncategorizedItems,
      uncategorizedCount: uncategorizedItems.length,
      lineItemsCount: lineItems.length,
    };
  }

  // Phase E: Snapshot Persistence & PDF Generation
  // Supersede previous active reports for same period
  await TaxReport.updateMany(
    {
      userId,
      periodStart: pStart,
      periodEnd: pEnd,
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      taxpayerCategory,
      status: "generated",
    },
    { $set: { status: "superseded" } }
  );

  const finalLineItems = customLineItems && Array.isArray(customLineItems) ? customLineItems : lineItems;
  const finalUncategorizedItems = customUncategorizedItems && Array.isArray(customUncategorizedItems) ? customUncategorizedItems : uncategorizedItems;
  const finalSummary = customSummary && typeof customSummary === "object" ? customSummary : summary;

  const reportDoc = new TaxReport({
    userId,
    periodStart: pStart,
    periodEnd: pEnd,
    jurisdictionCode: jurisdictionCode.toUpperCase(),
    taxYear,
    taxpayerCategory,
    bracketSetVersion: bracketSet._id,
    currency: "BDT",
    summary: finalSummary,
    lineItems: finalLineItems,
    uncategorizedItems: finalUncategorizedItems,
    status: "generated",
  });

  // Render PDF Document Buffer
  const pdfBuffer = await generateTaxReportPDF(reportDoc, user || {});
  reportDoc.pdfData = pdfBuffer;
  reportDoc.documentVaultRef = `vault-pdf-${reportDoc._id}`;

  await reportDoc.save();

  return {
    success: true,
    reportId: reportDoc._id,
    downloadUrl: `/api/tax-reports/${reportDoc._id}/download`,
    summary: finalSummary,
    uncategorizedCount: finalUncategorizedItems.length,
  };
};
