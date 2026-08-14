import mongoose from "mongoose";

const expenseCategorySchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60,
      },

      slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      icon: {
        type: String,
        default: "wallet",
      },

      theme: {
        type: String,
        default: "indigo",
      },

      monthlyBudget: {
        type: Number,
        default: null,
        min: 0,
      },

      isCustom: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

expenseCategorySchema.index(
  {
    user: 1,
    slug: 1,
  },
  {
    unique: true,
  }
);

const ExpenseCategory =
  mongoose.model(
    "ExpenseCategory",
    expenseCategorySchema
  );

export default ExpenseCategory;