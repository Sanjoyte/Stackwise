import mongoose from "mongoose";

const taxJurisdictionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    supportedTaxYears: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TaxJurisdiction =
  mongoose.models.TaxJurisdiction ||
  mongoose.model("TaxJurisdiction", taxJurisdictionSchema);

export default TaxJurisdiction;
