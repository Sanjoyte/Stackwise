import NotificationAlert from "../models/NotificationAlert.js";
import NotificationPreference from "../models/NotificationPreference.js";
import { isGmailConfigured } from "../services/gmailService.js";
import {
  collectAlertsForUser,
  getNotificationPreference,
  runNotificationsForUser,
} from "../services/notificationService.js";

const allowedFields = [
  "recipientEmail",
  "enabled",
  "subscriptionRenewals",
  "taxDeadlines",
  "spendingSpikes",
  "reminderDays",
  "spikeMultiplier",
];

export const getNotificationSettings = async (req, res, next) => {
  try {
    const settings = await getNotificationPreference(req.user);
    await NotificationAlert.deleteMany({
      user: req.user._id,
      fingerprint: /^spending-spike:/,
    });
    const alerts = await NotificationAlert.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      settings,
      gmailConfigured: isGmailConfigured(),
      alerts,
    });
  } catch (error) {
    return next(error);
  }
};




export const updateNotificationSettings = async (req, res, next) => {
  try {
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]])
    );

    if (
      updates.recipientEmail !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.recipientEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid notification email",
      });
    }

    const settings = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: updates,
        $setOnInsert: {
          user: req.user._id,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    return next(error);
  }
};




export const previewNotifications = async (req, res, next) => {
  try {
    const settings = await getNotificationPreference(req.user);
    const alerts = await collectAlertsForUser(req.user, settings);
    return res.status(200).json({ success: true, alerts, gmailConfigured: isGmailConfigured() });
  } catch (error) {
    return next(error);
  }
};

export const runNotifications = async (req, res, next) => {
  try {
    const settings = await getNotificationPreference(req.user);
    if (!settings.enabled) {
      return res.status(400).json({ success: false, message: "Notifications are disabled" });
    }

    const alerts = await runNotificationsForUser(req.user, settings);
    return res.status(200).json({ success: true, alerts });
  } catch (error) {
    return next(error);
  }
};
