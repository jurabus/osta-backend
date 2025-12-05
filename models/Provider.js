import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const providerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, unique: true, index: true, required: true, lowercase: true },
    password: { type: String, required: true },
    category: { type: String, index: true, required: true },
	    // 🔹 NEW: multiple categories & subcategories by name
    categories: { type: [String], default: [] },      // e.g. ["Design", "Education"]
    subcategories: { type: [String], default: [] },   // e.g. ["Logo Design", "Math Tutor"]

    avatar: { type: String, default: '' },     // Profile image URL
	lastSeen: { type: Date, default: null },
online: { type: Boolean, default: false },

    website: { type: String, default: '' },    // Provider’s website link
    description: { type: String, default: '' },
    skills: { type: [String], default: [] },
    gallery: { type: [String], default: [] },
	// 🔹 Regions (City/Area filtering)
regions: {
  everywhere: { type: Boolean, default: false },

  // Example: ["Cairo", "Giza"]
  cities: { type: [String], default: [] },

  // Example: ["Nasr City", "Dokki"]
  areas: { type: [String], default: [] },
},

    ratings: { type: [Number], default: [] },  // Rating values 0..10
    reviews: [
  {
    reviewerId: { type: String, required: true },
    text: { type: String, default: "" },
    rating: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }
],

  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

providerSchema.virtual('rating').get(function () {
  if (!this.ratings?.length) return 0;
  const avg = this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length;
  return Math.round(avg * 10) / 10;   // ⭐ formatted to 1 decimal, still /5
});

// ⭐ NEW: total number of submitted ratings
providerSchema.virtual('ratingCount').get(function () {
  return this.ratings?.length || 0;
});

providerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

providerSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('Provider', providerSchema);
