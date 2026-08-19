import mongoose from "mongoose";

const historyEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "created",
        "modification_requested",
        "resubmitted",
        "approved",
        "rejected",
        "payment_failed",
        "payment_started",
        "payment_completed",
        "payment_cancelled",
      ],
      required: true,
    },

    byUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["unpaid", "initiated", "paid", "failed", "cancelled"],
      default: "unpaid",
    },

    provider: {
      type: String,
      trim: true,
      default: "",
    },

    transactionId: {
      type: String,
      trim: true,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const teamRequestSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    requestType: {
      type: String,
      enum: ["subscription", "expense"],
      required: [true, "Request type is required"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
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

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Only relevant for requestType === "subscription".
    billingCycle: {
      type: String,
      enum: ["weekly", "monthly", "annual", null],
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "modification_requested",
      ],
      default: "pending",
      index: true,
    },

    // Message from the admin: rejection reason (optional) or
    // modification instructions (required).
    adminMessage: {
      type: String,
      trim: true,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    payment: {
      type: paymentSchema,
      default: () => ({}),
    },

    history: {
      type: [historyEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

teamRequestSchema.index({ team: 1, status: 1 });
teamRequestSchema.index({ team: 1, requestedBy: 1 });

const TeamRequest = mongoose.model("TeamRequest", teamRequestSchema);

export default TeamRequest;
