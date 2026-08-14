import mongoose from "mongoose";

const subscriptionUsageLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true, index: true },
    usageCount: { type: Number, required: true, min: 1, max: 10000 },
    usedAt: { type: Date, required: true, default: Date.now, index: true },
    source: { type: String, enum: ["manual", "integration"], default: "manual" },
    note: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true }
);

subscriptionUsageLogSchema.index({ user: 1, subscription: 1, usedAt: -1 });

export default mongoose.model("SubscriptionUsageLog", subscriptionUsageLogSchema);
