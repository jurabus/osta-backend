// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: {
      type: String,
      unique: true,
      index: true,
      required: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },

    // ⭐ NEW: user can also receive ratings & reviews
    ratings: { type: [Number], default: [] }, // Rating values 0..10
    reviews: { type: [String], default: [] }, // Text reviews about this user
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ⭐ NEW: virtual average rating (0..10, with 1 decimal)
userSchema.virtual('rating').get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
