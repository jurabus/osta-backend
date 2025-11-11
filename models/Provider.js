import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Requirements:
 * - name, email, password, category (profession)
 * - rating (avg of ratings out of 10)
 * - reviews (string list)
 *
 * We'll keep:
 *   ratings: [Number]  // each 0..10
 *   reviews: [String]
 * rating is a computed field (virtual) => average of "ratings"
 */
const providerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, unique: true, index: true, required: true, lowercase: true },
    password: { type: String, required: true },
    category: { type: String, index: true, required: true },

    ratings: { type: [Number], default: [] }, // each 0..10
    reviews: { type: [String], default: [] }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

providerSchema.virtual('rating').get(function () {
  if (!this.ratings?.length) return 0;
  const sum = this.ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10; // 1 decimal
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
