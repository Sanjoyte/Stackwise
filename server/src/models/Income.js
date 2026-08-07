import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Income must belong to a user"],
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

    date: {
      type: Date,
      required: [true, "Income date is required"],
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    linkedTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringIncomeTemplate",
    },
  },
  {
    timestamps: true,
  }
);

incomeSchema.index({ user: 1, date: -1 });

const Income = mongoose.model("Income", incomeSchema);

export default Income;
