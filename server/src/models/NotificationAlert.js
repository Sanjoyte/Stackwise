import mongoose from "mongoose";

const notificationAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["subscription", "tax", "spending_spike"],
      required: true,
    },
    fingerprint: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
    },
    sentAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

notificationAlertSchema.index({ user: 1, fingerprint: 1 }, { unique: true });

const NotificationAlert = mongoose.model(
  "NotificationAlert",
  notificationAlertSchema
);

export default NotificationAlert;
