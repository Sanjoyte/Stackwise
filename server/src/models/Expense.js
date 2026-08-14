import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      default: null,
    },
    name: {
      type: String,
      required: [true, "Expense category name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Expense category slug is required"],
      lowercase: true,
      trim: true,
    },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
    originalName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Expense must belong to a user"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [120, "Description cannot exceed 120 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Expense date is required"],
      index: true,
    },
    category: {
      type: categorySchema,
      required: [true, "Category is required"],
    },
    expenseType: {
      type: String,
      enum: ["business", "personal"],
      required: [true, "Expense type is required"],
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: [100, "Client/Project name cannot exceed 100 characters"],
      default: "",
    },

    clientProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientProject",
    },

    merchant: {
      type: String,
      trim: true,
      maxlength: [100, "Merchant cannot exceed 100 characters"],
      default: "",
    },
    paymentMethod: {
      type: String,
      trim: true,
      maxlength: [80, "Payment method cannot exceed 80 characters"],
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "csv"],
      required: true,
      default: "manual",
      immutable: true,
    },
    receipt: {
      type: receiptSchema,
      default: null,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, "category.slug": 1, expenseType: 1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
