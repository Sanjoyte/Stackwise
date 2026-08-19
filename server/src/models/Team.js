import crypto from "node:crypto";
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      minlength: [2, "Team name must contain at least 2 characters"],
      maxlength: [80, "Team name cannot exceed 80 characters"],
    },

    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    monthlyBudget: {
      type: Number,
      default: 0,
      min: [0, "Budget cannot be negative"],
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    currentSpending: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const getMemberUserId = (member) => {
  if (!member?.user) return null;

  // Works for both an ObjectId and a populated User document.
  return member.user._id || member.user;
};

teamSchema.methods.getMember = function (userId) {
  if (!userId) return undefined;

  const idString = userId.toString();

  return this.members.find((member) => {
    const memberUserId = getMemberUserId(member);
    return memberUserId && memberUserId.toString() === idString;
  });
};

teamSchema.methods.isAdmin = function (userId) {
  const member = this.getMember(userId);
  return Boolean(member && member.role === "admin");
};

teamSchema.statics.generateInviteCode = function () {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

const Team = mongoose.model("Team", teamSchema);

export default Team;
