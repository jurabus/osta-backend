import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    text: { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
	delivered: { type: Boolean, default: true }, // 🟢 automatically true when stored
    seen: { type: Boolean, default: false }, 
    fileUrl: { type: String, default: "" },
  },
  { timestamps: true }
);


const chatSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true },
    userId: { type: String, required: true },
    providerId: { type: String, required: true },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
