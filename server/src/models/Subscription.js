import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Subscription must belong to a user"],
    },

    name: {
      type: String,
      required: [true, "Subscription tool name is required"],
      trim: true,
    },

    planName: {
      type: String,
      default: "PRO TIER",
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

    billingCycle: {
      type: String,
      enum: ["weekly", "monthly", "annual"],
      default: "monthly",
    },

    renewalDate: {
      type: Date,
      required: [true, "Renewal / Trial End Date is required"],
    },

    paymentPortalUrl: {
      type: String,
      trim: true,
    },

    registeredEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    paymentMethod: {
      type: String,
      default: "Visa | **** 2466",
      trim: true,
    },

    isTrial: {
      type: Boolean,
      default: false,
    },

    trialAlert: {
      type: Boolean,
      default: true,
    },

    category: {
      type: String,
      default: "AI",
      trim: true,
    },

    capabilities: {
      type: [String],
      default: [],
      trim: true,
    },

    requiredCapabilities: { type: [String], default: [] },
    usagePercentage: { type: Number, min: 0, max: 100, default: 100 },
    isUnderutilized: { type: Boolean, default: false },
    lastUsedAt: { type: Date },

    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly sort by renewalDate
subscriptionSchema.index({ user: 1, renewalDate: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
