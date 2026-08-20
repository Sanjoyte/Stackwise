import NotificationAlert from "../models/NotificationAlert.js";
import NotificationPreference from "../models/NotificationPreference.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { getExpenseCategorySpending } from "./expenseCategoryService.js";
import { isGmailConfigured, sendGmailMessage } from "./gmailService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateKey = (date) => date.toISOString().slice(0, 10);
const monthKey = (date) => date.toISOString().slice(0, 7);
const currency = (amount, code) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
    maximumFractionDigits: 2,
  }).format(amount);

const buildTaxDeadlines = (now) => {
  const currentYear = now.getFullYear();
  const deadlines = [];

  for (const year of [currentYear, currentYear + 1]) {
    deadlines.push(
      { date: new Date(year, 0, 15), label: `Q4 estimated tax deadline (${year - 1})` },
      { date: new Date(year, 3, 15), label: `Annual tax filing and Q1 estimated tax deadline (${year})` },
      { date: new Date(year, 5, 15), label: `Q2 estimated tax deadline (${year})` },
      { date: new Date(year, 8, 15), label: `Q3 estimated tax deadline (${year})` }
    );
  }

  return deadlines;
};

const makeSubscriptionAlerts = async (userId, preference, now) => {
  if (!preference.subscriptionRenewals) return [];

  const from = startOfDay(now);
  const through = new Date(from.getTime() + preference.reminderDays * DAY_MS);
  const subscriptions = await Subscription.find({
    user: userId,
    status: "active",
    renewalDate: { $gte: from, $lte: through },
  }).lean();

  return subscriptions.map((subscription) => {
    const renewal = new Date(subscription.renewalDate);
    const remainingDays = Math.max(0, Math.ceil((startOfDay(renewal) - from) / DAY_MS));
    const label = subscription.isTrial ? "trial ends" : "renews";
    const due = renewal.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const message = `${subscription.name} ${label} on ${due} (${remainingDays} day${remainingDays === 1 ? "" : "s"} away). Cost: ${currency(subscription.amount, subscription.currency)}.`;

    return {
      type: "subscription",
      fingerprint: `subscription:${subscription._id}:${dateKey(renewal)}`,
      title: `${subscription.name} ${label} soon`,
      message,
    };
  });
};

const makeTaxAlerts = (preference, now) => {
  if (!preference.taxDeadlines) return [];

  const from = startOfDay(now);
  const through = new Date(from.getTime() + preference.reminderDays * DAY_MS);

  return buildTaxDeadlines(now)
    .filter(({ date }) => date >= from && date <= through)
    .map(({ date, label }) => {
      const remainingDays = Math.max(0, Math.ceil((startOfDay(date) - from) / DAY_MS));
      const due = date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      return {
        type: "tax",
        fingerprint: `tax:${dateKey(date)}`,
        title: "Tax deadline approaching",
        message: `${label} is on ${due} (${remainingDays} day${remainingDays === 1 ? "" : "s"} away). Confirm the deadline that applies to your tax jurisdiction.`,
      };
    });
};

const makeSpendingSpikeAlerts = async (userId, preference, now) => {
  if (!preference.spendingSpikes) return [];

  const spending = await getExpenseCategorySpending({ userId, period: "monthly" });

  return spending.categories.flatMap((category) => {
    if (!category.budget || category.amount < category.budget) return [];

    return [{
      type: "spending_spike",
      fingerprint: `budget-alert:${category.slug}:${monthKey(now)}`,
      title: `${category.name} budget exceeded`,
      message: `Your ${category.name} spending this month is ${currency(category.amount, spending.currency)}, exceeding its monthly budget of ${currency(category.budget, spending.currency)}.`,
    }];
  });
};

export const getNotificationPreference = async (user) => {
  const preference = await NotificationPreference.findOne({ user: user._id }).lean();
  return preference || {
    recipientEmail: user.email,
    enabled: true,
    subscriptionRenewals: true,
    taxDeadlines: true,
    spendingSpikes: true,
    reminderDays: 7,
    spikeMultiplier: 1.5,
  };
};

export const collectAlertsForUser = async (user, preference, now = new Date()) => {
  if (!preference.enabled) return [];
  const [subscriptions, spendingSpikes] = await Promise.all([
    makeSubscriptionAlerts(user._id, preference, now),
    makeSpendingSpikeAlerts(user._id, preference, now),
  ]);
  return [...subscriptions, ...makeTaxAlerts(preference, now), ...spendingSpikes];
};

const renderEmail = (alert) => `
  <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
    <h2 style="margin:0 0 12px">${escapeHtml(alert.title)}</h2>
    <p style="margin:0">${escapeHtml(alert.message)}</p>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">Sent by Stackwise Notifications.</p>
  </div>`;

const deliverAlert = async (user, preference, alert) => {
  const existing = await NotificationAlert.findOne({
    user: user._id,
    fingerprint: alert.fingerprint,
  });
  if (existing?.status === "sent") return { ...alert, status: "already_sent" };

  try {
    await sendGmailMessage({
      to: preference.recipientEmail,
      subject: `[Stackwise] ${alert.title}`,
      text: alert.message,
      html: renderEmail(alert),
    });

    await NotificationAlert.findOneAndUpdate(
      { user: user._id, fingerprint: alert.fingerprint },
      { $set: { type: alert.type, title: alert.title, message: alert.message, status: "sent", sentAt: new Date(), error: "" } },
      { upsert: true, new: true, runValidators: true }
    );
    return { ...alert, status: "sent" };
  } catch (error) {
    await NotificationAlert.findOneAndUpdate(
      { user: user._id, fingerprint: alert.fingerprint },
      { $set: { type: alert.type, title: alert.title, message: alert.message, status: "failed", error: error.message } },
      { upsert: true, new: true, runValidators: true }
    );
    return { ...alert, status: "failed", error: error.message };
  }
};

export const runNotificationsForUser = async (user, preference) => {
  if (!isGmailConfigured()) {
    throw new Error("Gmail API is not configured on the server");
  }

  const alerts = await collectAlertsForUser(user, preference);
  return Promise.all(alerts.map((alert) => deliverAlert(user, preference, alert)));
};

export const runScheduledNotifications = async () => {
  if (!isGmailConfigured()) return { skipped: true, sent: 0 };

  const preferences = await NotificationPreference.find({ enabled: true }).lean();
  let sent = 0;
  for (const preference of preferences) {
    const user = await User.findById(preference.user);
    if (!user) continue;
    const results = await runNotificationsForUser(user, preference);
    sent += results.filter((result) => result.status === "sent").length;
  }

  return { skipped: false, sent };
};
