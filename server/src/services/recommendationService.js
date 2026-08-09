import { buildOverlapGroups, normalizeCapabilities } from "./overlapService.js";

// Value of one unit in USD. Override rates through environment variables when needed.
const USD_VALUE = {
  USD: 1,
  BDT: 1 / Number(process.env.BDT_PER_USD || 120),
  EUR: 1 / Number(process.env.EUR_PER_USD || 0.92),
  GBP: 1 / Number(process.env.GBP_PER_USD || 0.79),
};

const monthlyCost = (item) => {
  const amount = Number(item.amount ?? item.monthlyPrice) || 0;
  if (!item.billingCycle || item.billingCycle === "monthly") return amount;
  if (item.billingCycle === "annual") return amount / 12;
  if (item.billingCycle === "weekly") return amount * 52 / 12;
  return amount;
};

const convert = (amount, from = "USD", to = "USD") => {
  if (from === to) return amount;
  if (!USD_VALUE[from] || !USD_VALUE[to]) return null;
  return amount * USD_VALUE[from] / USD_VALUE[to];
};

const canonicalName = (name = "") => String(name)
  .toLowerCase()
  .replace(/\b(google|microsoft|ai|app|premium|plus|pro|advanced|basic|plan|tier)\b/g, "")
  .replace(/[^a-z0-9]/g, "")
  .trim();

const toolMatchesName = (tool, name) => {
  const target = canonicalName(name);
  return [tool.name, ...(tool.aliases || [])].some((candidate) => canonicalName(candidate) === target);
};

export function buildRecommendations(subscriptions, catalog, baseCurrency = "USD") {
  const overlapGroups = buildOverlapGroups(subscriptions);
  const overlapIds = new Set(overlapGroups.flatMap((group) => group.subscriptions.map((sub) => sub._id.toString())));

  return subscriptions.filter((subscription) => {
    const usage = Number(subscription.usagePercentage);
    return overlapIds.has(subscription._id.toString()) || subscription.isUnderutilized || (Number.isFinite(usage) && usage < 40);
  }).map((subscription) => {
    const required = normalizeCapabilities(subscription.requiredCapabilities?.length
      ? subscription.requiredCapabilities
      : subscription.capabilities);
    const currentMonthlyCost = convert(monthlyCost(subscription), subscription.currency, baseCurrency);
    if (currentMonthlyCost === null) return null;

    const reasons = [];
    const isUnderutilized = subscription.isUnderutilized
      || Number(subscription.usagePercentage) < 40;
    if (overlapIds.has(subscription._id.toString())) reasons.push("overlapping capabilities");
    if (isUnderutilized) reasons.push("underutilized");

    const alternatives = catalog.filter((tool) => !toolMatchesName(tool, subscription.name)).map((tool) => {
      const matchedCapabilities = required.filter((capability) => normalizeCapabilities(tool.capabilities).includes(capability));
      const capabilityMatch = required.length ? matchedCapabilities.length / required.length : 0;
      const ownedSubscription = subscriptions.find((owned) =>
        owned._id.toString() !== subscription._id.toString() && toolMatchesName(tool, owned.name));
      // Recommendations are limited to tools the user already added. The master
      // catalog validates their identity and capabilities; it is not a source of
      // unowned products to advertise.
      if (!ownedSubscription) return null;
      const existingSubscriptionMonthlyCost = convert(
        monthlyCost(ownedSubscription),
        ownedSubscription.currency,
        baseCurrency
      );
      if (existingSubscriptionMonthlyCost === null) return null;
      // The alternative is already part of total spend, so consolidating into it
      // adds no new cost and cancelling this subscription saves its full cost.
      const alternativeMonthlyCost = 0;
      const monthlySavings = currentMonthlyCost - alternativeMonthlyCost;

      return {
        tool,
        matchedCapabilities,
        capabilityMatch: Math.round(capabilityMatch * 100),
        monthlySavings,
        annualSavings: monthlySavings * 12,
        alternativeMonthlyCost,
        alreadySubscribed: true,
        existingSubscriptionName: ownedSubscription.name,
        existingSubscriptionId: ownedSubscription._id,
        existingSubscriptionMonthlyCost,
      };
    }).filter((match) => match
      && match.capabilityMatch >= 50
      && (match.existingSubscriptionMonthlyCost < currentMonthlyCost
        || (isUnderutilized && match.existingSubscriptionMonthlyCost <= currentMonthlyCost))
      && match.monthlySavings > 0
      && (String(match.tool.category).toLowerCase() === String(subscription.category).toLowerCase()
        || String(subscription.category).toLowerCase() === "ai"))
      .sort((a, b) => b.capabilityMatch - a.capabilityMatch || b.monthlySavings - a.monthlySavings)
      .slice(0, 3);

    return { subscription, reasons, requiredCapabilities: required, currentMonthlyCost, alternatives };
  }).filter((item) => item?.alternatives.length > 0);
}
