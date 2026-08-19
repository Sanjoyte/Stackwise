const monthlyCost = (subscription) => {
  const amount = Number(subscription.amount) || 0;
  if (subscription.billingCycle === "annual") return amount / 12;
  if (subscription.billingCycle === "weekly") return amount * 52 / 12;
  return amount;
};

const monthKey = (date) => {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
};

const buildMonthRange = (months) => {
  const result = [];
  const now = new Date();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    result.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))));
  }
  return result;
};

const getDecision = ({ usageLast30Days, averageMonthlyUsage, costPerUse }) => {
  if (usageLast30Days === 0 && averageMonthlyUsage === 0) {
    return { action: "Cancel", reason: "No usage has been recorded during the analyzed period, so the subscription is currently producing no measurable value." };
  }
  if (usageLast30Days === 0 && averageMonthlyUsage > 0) {
    return { action: "Downgrade", reason: `No usage was recorded in the last 30 days, although historical usage averages ${averageMonthlyUsage.toFixed(1)} times in active months. A lower tier may now provide better value.` };
  }
  if (usageLast30Days <= 2 || averageMonthlyUsage < 3) {
    return { action: "Downgrade", reason: `Usage averages ${averageMonthlyUsage.toFixed(1)} times per month, indicating that a lower tier may provide better value.` };
  }
  return { action: "Keep", reason: `The subscription averages ${averageMonthlyUsage.toFixed(1)} uses per month${costPerUse === null ? "" : ` at ${costPerUse.toFixed(2)} per use`}, showing consistent value.` };
};

export function buildUsageAnalytics(subscriptions, logs, months = 6) {
  const monthRange = buildMonthRange(months);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const analytics = subscriptions.map((subscription) => {
    const subscriptionLogs = logs.filter((log) => log.subscription.toString() === subscription._id.toString());
    const usageByMonth = Object.fromEntries(monthRange.map((month) => [month, 0]));
    subscriptionLogs.forEach((log) => {
      const key = monthKey(log.usedAt);
      if (key in usageByMonth) usageByMonth[key] += Number(log.usageCount) || 0;
    });

    const usageLast30Days = subscriptionLogs
      .filter((log) => {
        const usedAt = new Date(log.usedAt);
        return usedAt >= thirtyDaysAgo && usedAt <= now;
      })
      .reduce((sum, log) => sum + Number(log.usageCount || 0), 0);
    const totalUsage = Object.values(usageByMonth).reduce((sum, count) => sum + count, 0);
    const activeMonths = Math.max(1, monthRange.filter((month) => usageByMonth[month] > 0).length);
    const averageMonthlyUsage = totalUsage / activeMonths;
    const normalizedMonthlyCost = monthlyCost(subscription);
    const costPerUse = usageLast30Days > 0 ? normalizedMonthlyCost / usageLast30Days : null;

    return {
      subscription,
      normalizedMonthlyCost,
      usageLast30Days,
      totalUsage,
      averageMonthlyUsage,
      costPerUse,
      decision: getDecision({ usageLast30Days, averageMonthlyUsage, costPerUse }),
      trend: monthRange.map((month) => ({ month, usageCount: usageByMonth[month] })),
    };
  });

  return {
    analytics,
    summary: {
      subscriptionsAnalyzed: analytics.length,
      keep: analytics.filter((item) => item.decision.action === "Keep").length,
      downgrade: analytics.filter((item) => item.decision.action === "Downgrade").length,
      cancel: analytics.filter((item) => item.decision.action === "Cancel").length,
    },
  };
}
