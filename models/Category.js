// models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    // Minimal container: only name
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

// helpful index for searching by name
categorySchema.index({ name: "text" });

export default mongoose.model("Category", categorySchema);
