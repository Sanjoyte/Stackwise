import mongoose from "mongoose";
import Subscription from "../models/Subscription.js";
import SubscriptionUsageLog from "../models/SubscriptionUsageLog.js";
import { buildUsageAnalytics } from "../services/usageAnalyticsService.js";

export const createUsageLog = async (req, res, next) => {
  try {
    const { subscriptionId, usageCount, usedAt, note } = req.body;
    const usageDate = usedAt ? new Date(usedAt) : new Date();
    const now = new Date();
    if (!mongoose.isValidObjectId(subscriptionId)
      || !Number.isInteger(Number(usageCount))
      || Number(usageCount) < 1
      || Number(usageCount) > 10000
      || Number.isNaN(usageDate.getTime())
      || usageDate > now) {
      return res.status(400).json({ success: false, message: "A valid subscription, positive whole-number usage count, and a usage date that is not in the future are required" });
    }
    const subscription = await Subscription.findOne({ _id: subscriptionId, user: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    const log = await SubscriptionUsageLog.create({
      user: req.user._id,
      subscription: subscription._id,
      usageCount: Number(usageCount),
      usedAt: usageDate,
      source: "manual",
      note: note || "",
    });
    return res.status(201).json({ success: true, log });
  } catch (error) { return next(error); }
};

export const getUsageAnalytics = async (req, res, next) => {
  try {
    const months = Math.min(12, Math.max(1, Number.parseInt(req.query.months, 10) || 6));
    const subscriptions = await Subscription.find({ user: req.user._id, status: "active" }).sort({ renewalDate: 1 }).lean();
    const startDate = new Date();
    startDate.setUTCMonth(startDate.getUTCMonth() - months + 1, 1);
    startDate.setUTCHours(0, 0, 0, 0);
    const logs = await SubscriptionUsageLog.find({
      user: req.user._id,
      usedAt: { $gte: startDate, $lte: new Date() },
    }).sort({ usedAt: -1 }).lean();
    const result = buildUsageAnalytics(subscriptions, logs, months);
    return res.status(200).json({ success: true, periodMonths: months, ...result, recentLogs: logs.slice(0, 20) });
  } catch (error) { return next(error); }
};

export const deleteUsageLog = async (req, res, next) => {
  try {
    const log = await SubscriptionUsageLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: "Usage log not found" });
    return res.status(200).json({ success: true, message: "Usage log deleted" });
  } catch (error) { return next(error); }
};
