import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    providerId: { type: String, required: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Request", requestSchema);
