// Converts a request's amount into its "monthly-equivalent" contribution
// against the team's monthly budget.
//
// - One-time business expenses count for their full amount.
// - Recurring subscriptions count for their monthly-equivalent amount
//   (weekly * ~4.33, annual / 12, monthly as-is).
export const toMonthlyEquivalent = (request) => {
  const amount = Number(request.amount) || 0;

  if (request.requestType !== "subscription") {
    return amount;
  }

  switch (request.billingCycle) {
    case "weekly":
      return amount * (52 / 12);
    case "annual":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
};

// Builds the budget-impact preview an admin sees before approving/rejecting
// a request: current budget, current spending, remaining budget, the
// requested amount, projected spending + remaining budget after approval,
// budget utilization, and (for subscriptions) the annualized cost.
export const computeBudgetImpact = (team, request) => {
  const currentBudget = Number(team.monthlyBudget) || 0;
  const currentSpending = Number(team.currentSpending) || 0;
  const remainingBudget = currentBudget - currentSpending;

  const monthlyEquivalent = toMonthlyEquivalent(request);
  const projectedSpending = currentSpending + monthlyEquivalent;
  const remainingBudgetAfterApproval = currentBudget - projectedSpending;

  const budgetUtilization =
    currentBudget > 0
      ? Math.round((projectedSpending / currentBudget) * 1000) / 10
      : null;

  const annualCost =
    request.requestType === "subscription"
      ? Math.round(monthlyEquivalent * 12 * 100) / 100
      : null;

  return {
    currency: team.currency,
    requestCurrency: request.currency,
    currentBudget,
    currentSpending,
    remainingBudget,
    requestedAmount: Number(request.amount) || 0,
    requestedAmountMonthlyEquivalent:
      Math.round(monthlyEquivalent * 100) / 100,
    projectedSpending: Math.round(projectedSpending * 100) / 100,
    remainingBudgetAfterApproval:
      Math.round(remainingBudgetAfterApproval * 100) / 100,
    budgetUtilization,
    annualCost,
    isOverBudget: remainingBudgetAfterApproval < 0,
    currencyMismatch:
      Boolean(request.currency) &&
      Boolean(team.currency) &&
      request.currency !== team.currency,
  };
};
