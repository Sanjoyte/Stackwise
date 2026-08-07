import mongoose from "mongoose";

const recurringIncomeTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Template must belong to a user"],
    },

    templateName: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    source: {
      type: String,
      required: [true, "Income source is required"],
      enum: ["client", "freelance", "salary", "royalties", "other"],
      default: "client",
    },
    
    clientName: {
      type: String,
      trim: true,
    },

    frequency: {
      type: String,
      enum: ["weekly", "bi-weekly", "monthly", "quarterly", "annual"],
      default: "monthly",
    },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },

    expectedDate: {
      type: Date,
      required: [true, "Expected payment date is required"],
    },
  },
  {
    timestamps: true,
  }
);

const RecurringIncomeTemplate = mongoose.model(
  "RecurringIncomeTemplate",
  recurringIncomeTemplateSchema
);

export default RecurringIncomeTemplate;
