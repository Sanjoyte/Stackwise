import mongoose from "mongoose";

const deductibleCategoryRuleSchema = new mongoose.Schema(
  {
    jurisdictionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    taxYear: {
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
    description: {
      type: String,
      default: "",
    },
    capType: {
      type: String,
      enum: ["none", "flat", "percent-of-income", "percent-of-expense"],
      default: "none",
    },
    capValue: {
      type: Number,
      default: 0,
    },
    appliesToRole: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

deductibleCategoryRuleSchema.index(
  { jurisdictionCode: 1, taxYear: 1, categoryTag: 1 },
  { unique: false }
);

const DeductibleCategoryRule =
  mongoose.models.DeductibleCategoryRule ||
  mongoose.model("DeductibleCategoryRule", deductibleCategoryRuleSchema);

export default DeductibleCategoryRule;
