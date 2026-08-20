import mongoose from "mongoose";

const supportingEntrySchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["income", "expense", "subscription"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const missedDeductionSuggestionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jurisdictionCode: {
      type: String,
      default: "BD",
      uppercase: true,
    },
    taxYear: {
      type: String,
      default: "2025-26",
    },
    suggestedCategory: {
      type: String,
      required: true,
      trim: true,
    },
    categoryTag: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rationale: {
      type: String,
      required: true,
    },
    aiReasoning: {
      type: String,
      default: "",
    },
    estimatedAmount: {
      type: Number,
      default: null,
    },
    estimatedAmountCurrency: {
      type: String,
      default: "BDT",
    },
    supportingEntries: [supportingEntrySchema],
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["suggested", "accepted", "dismissed", "user-overridden"],
      default: "suggested",
      index: true,
    },
    overriddenBy: {
      type: String,
      default: null,
    },
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiDeductionScan",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

missedDeductionSuggestionSchema.index({ userId: 1, status: 1, createdAt: -1 });
missedDeductionSuggestionSchema.index({ userId: 1, suggestedCategory: 1, status: 1 });

const MissedDeductionSuggestion =
  mongoose.models.MissedDeductionSuggestion ||
  mongoose.model("MissedDeductionSuggestion", missedDeductionSuggestionSchema);

export default MissedDeductionSuggestion;
