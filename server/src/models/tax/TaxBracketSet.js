import mongoose from "mongoose";

const slabSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: true,
      default: 0,
    },
    max: {
      type: Number,
      default: null, // null means unlimited / top slab
    },
    rate: {
      type: Number,
      required: true, // e.g. 0.10 for 10%
    },
  },
  { _id: false }
);

const taxBracketSetSchema = new mongoose.Schema(
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
    taxpayerCategory: {
      type: String,
      required: true,
      enum: ["general", "woman-senior", "disabled", "freelancer"],
      default: "general",
    },
    slabs: [slabSchema],
    basicExemption: {
      type: Number,
      default: 0,
    },
    minimumTax: {
      type: Number,
      default: 0,
    },
    dataSource: {
      type: String,
      default: "manual-seed",
    },
    sourceUrl: {
      type: String,
      default: "",
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

taxBracketSetSchema.index(
  { jurisdictionCode: 1, taxYear: 1, taxpayerCategory: 1, version: 1 },
  { unique: true }
);

const TaxBracketSet =
  mongoose.models.TaxBracketSet ||
  mongoose.model("TaxBracketSet", taxBracketSetSchema);

export default TaxBracketSet;
