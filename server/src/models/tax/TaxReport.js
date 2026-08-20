import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["income", "expense", "subscription"],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    deductible: {
      type: Boolean,
      default: false,
    },
    deductionRuleApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeductibleCategoryRule",
      default: null,
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high",
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    originalCurrency: {
      type: String,
      default: "BDT",
    },
    convertedAmount: {
      type: Number,
      required: true,
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    documentVaultRef: {
      type: String,
      default: null,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientProject",
      default: null,
    },
  },
  { _id: true }
);

const uncategorizedItemSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
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
      required: true,
    },
    reason: {
      type: String,
      default: "no matching DeductibleCategoryRule",
    },
  },
  { _id: true }
);

const taxReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      required: true,
      uppercase: true,
    },
    taxYear: {
      type: String,
      required: true,
    },
    taxpayerCategory: {
      type: String,
      default: "general",
    },
    bracketSetVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaxBracketSet",
      default: null,
    },
    currency: {
      type: String,
      default: "BDT",
    },
    summary: {
      grossIncome: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      estimatedTaxableIncome: { type: Number, default: 0 },
      estimatedTax: { type: Number, default: 0 },
      exchangeRateCount: { type: Number, default: 0 },
    },
    lineItems: [lineItemSchema],
    uncategorizedItems: [uncategorizedItemSchema],
    documentVaultRef: {
      type: String,
      default: null,
    },
    pdfData: {
      type: Buffer,
      select: false, // Don't return heavy buffer in list queries
    },
    status: {
      type: String,
      enum: ["generated", "superseded"],
      default: "generated",
    },
  },
  {
    timestamps: true,
  }
);

taxReportSchema.index({ userId: 1, periodStart: 1, periodEnd: 1, status: 1 });

const TaxReport =
  mongoose.models.TaxReport || mongoose.model("TaxReport", taxReportSchema);

export default TaxReport;
