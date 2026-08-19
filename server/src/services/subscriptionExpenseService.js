import Subscription from "../models/Subscription.js";
import { slugifyCategory } from "../utils/expenseUtils.js";

export const DEFAULT_SUBSCRIPTION_EXPENSE_TYPE = "business";

const ENTERTAINMENT_NAMES = [
  "netflix",
  "spotify",
  "youtube",
  "disney",
  "prime video",
  "hoichoi",
  "chorki",
  "bongo",
  "hulu",
  "hbo",
  "apple music",
];

const getSubscriptionStartDate = (subscription) => {
  const rawDate = [
    subscription.startDate,
    subscription.subscriptionStartDate,
    subscription.billingDate,
    subscription.createdAt,
    subscription.renewalDate,
    subscription.nextRenewalDate,
  ].find(Boolean);
  const date = rawDate ? new Date(rawDate) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getSubscriptionEndDate = (subscription) => {
  const rawDate = [
    subscription.cancelledAt,
    subscription.canceledAt,
    subscription.endDate,
    subscription.expiredAt,
    subscription.expiresAt,
  ].find(Boolean);
  const date = rawDate ? new Date(rawDate) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const normalizeBillingCycle = (subscription) => {
  const cycle = String(
    subscription.billingCycle ??
      subscription.billingFrequency ??
      subscription.frequency ??
      subscription.interval ??
      "once"
  )
    .trim()
    .toLowerCase();

  if (["monthly", "month"].includes(cycle)) return "monthly";
  if (["yearly", "annual", "annually", "year"].includes(cycle)) return "yearly";
  if (["weekly", "week"].includes(cycle)) return "weekly";
  if (["quarterly", "quarter"].includes(cycle)) return "quarterly";
  if (["semi-annually", "semiannual", "half-yearly"].includes(cycle)) {
    return "semiannual";
  }

  return "once";
};

const moveToNextCharge = (date, cycle) => {
  const next = new Date(date);

  if (cycle === "weekly") next.setDate(next.getDate() + 7);
  else if (cycle === "monthly") next.setMonth(next.getMonth() + 1);
  else if (cycle === "quarterly") next.setMonth(next.getMonth() + 3);
  else if (cycle === "semiannual") next.setMonth(next.getMonth() + 6);
  else if (cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
  else return null;

  return next;
};

export const generateSubscriptionChargeDates = (
  subscription,
  now = new Date()
) => {
  const status = String(subscription.status || "").trim().toLowerCase();

  if (["inactive", "deleted"].includes(status)) return [];

  const startDate = getSubscriptionStartDate(subscription);
  if (!startDate) return [];

  const endDate = getSubscriptionEndDate(subscription);
  const effectiveEnd = endDate && endDate < now ? endDate : now;

  if (startDate > effectiveEnd) return [];

  const cycle = normalizeBillingCycle(subscription);
  if (cycle === "once") return [startDate];

  const dates = [];
  let current = new Date(startDate);
  let iterations = 0;

  while (current <= effectiveEnd && iterations < 1000) {
    dates.push(new Date(current));
    current = moveToNextCharge(current, cycle);
    if (!current) break;
    iterations += 1;
  }

  return dates;
};

const getSubscriptionCategory = (subscription) => {
  const categoryValue = String(
    subscription.category?.name || subscription.category || subscription.categoryName || ""
  )
    .trim()
    .toLowerCase();
  const name = String(
    subscription.name || subscription.toolName || subscription.serviceName || ""
  ).toLowerCase();
  const entertainmentCategories = ["entertainment", "streaming", "music", "movies"];

  if (
    entertainmentCategories.includes(categoryValue) ||
    ENTERTAINMENT_NAMES.some((item) => name.includes(item))
  ) {
    return { name: "Entertainment", slug: "entertainment", id: null };
  }

  return {
    name: "Software & Subscriptions",
    slug: "software-subscriptions",
    id: null,
  };
};

export const normalizeSubscriptionExpenses = (subscriptions, now = new Date()) => {
  const rows = [];

  subscriptions.forEach((subscription) => {
    const amount = Number(subscription.amount ?? subscription.price ?? subscription.cost ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const category = getSubscriptionCategory(subscription);
    const subscriptionId = String(subscription._id);

    generateSubscriptionChargeDates(subscription, now).forEach((date) => {
      rows.push({
        _id: `subscription:${subscriptionId}:${date.toISOString()}`,
        description:
          subscription.name || subscription.toolName || subscription.serviceName || "Subscription",
        amount,
        currency: String(subscription.currency || "BDT").toUpperCase(),
        date,
        category,
        categorySlug: slugifyCategory(category.slug),
        expenseType: DEFAULT_SUBSCRIPTION_EXPENSE_TYPE,
        merchant: subscription.name || "",
        paymentMethod: subscription.paymentMethod || "",
        notes: `${normalizeBillingCycle(subscription)} subscription`,
        source: "subscription",
        subscription: subscriptionId,
        receipt: null,
        readOnly: true,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      });
    });
  });

  return rows;
};

export const getSubscriptionExpenseRows = async (userId) => {
  const subscriptions = await Subscription.find({ user: userId }).lean();
  return normalizeSubscriptionExpenses(subscriptions);
};
