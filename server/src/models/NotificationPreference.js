import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    enabled: { type: Boolean, default: true },
    subscriptionRenewals: { type: Boolean, default: true },
    taxDeadlines: { type: Boolean, default: true },
    spendingSpikes: { type: Boolean, default: true },
    reminderDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 60,
    },
    spikeMultiplier: {
      type: Number,
      default: 1.5,
      min: 1.1,
      max: 10,
    },
  },
  { timestamps: true }
);

const NotificationPreference = mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema
);

export default NotificationPreference;
