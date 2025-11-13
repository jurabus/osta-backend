// models/Subcategory.js
import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    // globally unique subcategory name
    name: { type: String, required: true, unique: true, trim: true },

    // parent category name (string container)
    category: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

subcategorySchema.index({ name: "text", category: "text" });

export default mongoose.model("Subcategory", subcategorySchema);
