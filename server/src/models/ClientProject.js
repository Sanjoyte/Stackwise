import mongoose from "mongoose";

const clientProjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client/Project must belong to a user"],
    },

    name: {
      type: String,
      required: [true, "Client/Project name is required"],
      trim: true,
      maxlength: [100, "Client/Project name cannot exceed 100 characters"],
    },
  },
  {
    timestamps: true,
  }
);

clientProjectSchema.index({ user: 1, name: 1 }, { unique: true });

const ClientProject = mongoose.model("ClientProject", clientProjectSchema);

export default ClientProject;