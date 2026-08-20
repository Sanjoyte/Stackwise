import mongoose from "mongoose";

const deductionFlagSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["expense", "subscription"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    categoryTag: {
      type: String,
      required: true,
    },
    deductionRuleApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeductibleCategoryRule",
      default: null,
    },
    detectionMethod: {
      type: String,
      enum: ["rule", "ai"],
      default: "ai",
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    rationale: {
      type: String,
      required: true,
    },
    aiRationale: {
      type: String,
      default: "",
    },
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiDeductionScan",
      default: null,
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
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deductionFlagSchema.index({ userId: 1, sourceId: 1, status: 1 });

const DeductionFlag =
  mongoose.models.DeductionFlag ||
  mongoose.model("DeductionFlag", deductionFlagSchema);

export default DeductionFlag;
