import mongoose from "mongoose";

const regionSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true },
  areas: { type: [String], default: [] }  // Example: ["Nasr City", "Dokki"]
});

export default mongoose.model("Region", regionSchema);
