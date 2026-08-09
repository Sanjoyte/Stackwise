import mongoose from "mongoose";

const alternativeToolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    aliases: { type: [String], default: [] },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true, index: true },
    capabilities: { type: [String], default: [] },
    monthlyPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    pricingModel: {
      type: String,
      enum: ["free", "freemium", "paid", "open-source"],
      default: "freemium",
    },
    websiteUrl: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

alternativeToolSchema.index({ isActive: 1, category: 1, monthlyPrice: 1 });

export default mongoose.model("AlternativeTool", alternativeToolSchema);
