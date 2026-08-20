/**
 * Tax Utilities - Pure helper functions for tax computation and deduction classification.
 */

/**
 * Determine the tax year string (e.g. "2025-26") for a given end date.
 * In Bangladesh, Fiscal Year runs July 1 to June 30.
 * @param {Date|string} date
 * @returns {string} e.g. "2025-26"
 */
export function getTaxYearFromPeriod(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();

  if (month >= 7) {
    const nextYr = (year + 1).toString().slice(-2);
    return `${year}-${nextYr}`;
  } else {
    const prevYr = year - 1;
    const currYr = year.toString().slice(-2);
    return `${prevYr}-${currYr}`;
  }
}

/**
 * Apply deduction cap rule to an expense amount.
 * @param {number} amount 
 * @param {Object|null} rule 
 * @param {number} grossIncome 
 * @returns {number} Capped deductible amount
 */
export function applyDeductionCap(amount, rule, grossIncome = 0) {
  if (!rule || rule.capType === "none" || !rule.capType) {
    return Math.max(0, amount);
  }

  if (rule.capType === "flat") {
    return Math.min(Math.max(0, amount), rule.capValue);
  }

  if (rule.capType === "percent-of-income") {
    const cap = Math.max(0, grossIncome) * rule.capValue;
    return Math.min(Math.max(0, amount), cap);
  }

  if (rule.capType === "percent-of-expense") {
    return Math.max(0, amount) * rule.capValue;
  }

  return Math.max(0, amount);
}

/**
 * Categorize expense or subscription against active deduction rules.
 * @param {Object} item (Expense or Subscription)
 * @param {Array} deductibleRules Array of DeductibleCategoryRule documents
 * @param {Array} usageLogs Optional usage logs for subscriptions
 * @returns {Object} { deductible: boolean, rule: Object|null, confidence: "high"|"medium"|"low", reason?: string }
 */
export function categorizeForDeductions(item, deductibleRules = [], usageLogs = []) {
  const rawCategory = (item.category || item.name || "").toString().toLowerCase().trim();

  // Find matching rule by category tag or substring match
  const matchingRule = deductibleRules.find((r) => {
    const tag = r.categoryTag.toLowerCase();
    return rawCategory === tag || rawCategory.includes(tag) || tag.includes(rawCategory);
  });

  if (!matchingRule) {
    return {
      deductible: false,
      rule: null,
      confidence: "low",
      reason: `No matching tax deduction rule found for category '${item.category || "uncategorized"}'`,
    };
  }

  let confidence = "high";

  // If item is a subscription, check usage log confidence
  if (item.billingCycle || item.isWorkRelated !== undefined) {
    const relatedLogs = usageLogs.filter(
      (log) => log.subscriptionId?.toString() === item._id?.toString()
    );

    if (relatedLogs.length > 0) {
      const totalUsage = relatedLogs.reduce((acc, l) => acc + (l.usageCount || 0), 0);
      if (totalUsage < 5) {
        confidence = "low";
      } else if (totalUsage < 20) {
        confidence = "medium";
      }
    } else {
      confidence = item.isWorkRelated ? "medium" : "low";
    }
  }

  return {
    deductible: true,
    rule: matchingRule,
    confidence,
  };
}

/**
 * Calculate progressive income tax based on TaxBracketSet.
 * @param {number} taxableIncome 
 * @param {Object} bracketSet TaxBracketSet document
 * @returns {Object} { estimatedTax, taxableIncome, slabsApplied }
 */
export function computeTaxLiability(taxableIncome = 0, bracketSet) {
  const income = Math.max(0, Number(taxableIncome) || 0);

  if (!bracketSet || !Array.isArray(bracketSet.slabs) || bracketSet.slabs.length === 0) {
    return {
      estimatedTax: 0,
      taxableIncome: income,
      slabsApplied: [],
    };
  }

  let adjustedIncome = income;

  // Apply basic exemption if specified
  if (bracketSet.basicExemption > 0) {
    adjustedIncome = Math.max(0, adjustedIncome - bracketSet.basicExemption);
  }

  if (adjustedIncome <= 0) {
    return {
      estimatedTax: 0,
      taxableIncome: income,
      slabsApplied: [],
    };
  }

  // Sort slabs by min ascending
  const sortedSlabs = [...bracketSet.slabs].sort((a, b) => a.min - b.min);

  let totalTax = 0;
  const slabsApplied = [];

  for (const slab of sortedSlabs) {
    if (adjustedIncome < slab.min) {
      continue;
    }

    const slabMin = slab.min;
    const slabMax = slab.max !== null && slab.max !== undefined ? slab.max : Infinity;

    // Determine amount of income falling in this slab range
    const taxableInSlab = Math.min(adjustedIncome, slabMax) - (slabMin > 0 ? slabMin - 1 : 0);

    if (taxableInSlab > 0) {
      const taxForSlab = Math.round(taxableInSlab * slab.rate * 100) / 100;
      totalTax += taxForSlab;

      slabsApplied.push({
        min: slabMin,
        max: slab.max,
        rate: slab.rate,
        taxableAmount: taxableInSlab,
        taxAmount: taxForSlab,
      });
    }

    if (adjustedIncome <= slabMax) {
      break;
    }
  }

  totalTax = Math.round(totalTax * 100) / 100;

  // Apply minimum tax if taxable income produces tax below minimum threshold
  if (totalTax > 0 && bracketSet.minimumTax > 0 && totalTax < bracketSet.minimumTax) {
    totalTax = bracketSet.minimumTax;
  }

  return {
    estimatedTax: totalTax,
    taxableIncome: income,
    slabsApplied,
  };
}
