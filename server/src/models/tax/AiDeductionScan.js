import mongoose from "mongoose";

const aiDeductionScanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      enum: ["scheduled", "manual", "on-demand"],
      default: "manual",
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    jurisdictionCode: {
      type: String,
      default: "BD",
    },
    taxpayerCategory: {
      type: String,
      default: "general",
    },
    context: {
      expenseCount: { type: Number, default: 0 },
      subscriptionCount: { type: Number, default: 0 },
      incomeCount: { type: Number, default: 0 },
      ruleFlagCount: { type: Number, default: 0 },
    },
    geminiRequest: {
      model: { type: String, default: "gemini-1.5-flash" },
      promptTokens: { type: Number, default: 0 },
      responseTokens: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 },
    },
    results: {
      newDeductionFlags: { type: Number, default: 0 },
      newMissedSuggestions: { type: Number, default: 0 },
      errors: [{ type: String }],
    },
    rawPrompt: {
      type: String,
      default: "",
    },
    rawResponse: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["success", "partial", "failed"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const AiDeductionScan =
  mongoose.models.AiDeductionScan ||
  mongoose.model("AiDeductionScan", aiDeductionScanSchema);

export default AiDeductionScan;
