import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    sourceType: { type: String, enum: ["team_request", "subscription"], required: true, index: true },
    source: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    provider: { type: String, default: "sslcommerz", trim: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    sessionKey: { type: String, default: "" },
    validationId: { type: String, default: "" },
    bankTransactionId: { type: String, default: "" },
    cardType: { type: String, default: "" },
    status: {
      type: String,
      enum: ["initiated", "paid", "failed", "cancelled"],
      default: "initiated",
      index: true,
    },
    riskLevel: { type: Number, default: null },
    riskTitle: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: "" },
    rawValidation: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ team: 1, createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
