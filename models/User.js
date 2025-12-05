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

    // ⭐ Add Missing Avatar Field
    avatar: { type: String, default: "" },
	lastSeen: { type: Date, default: null },
online: { type: Boolean, default: false },


    // ⭐ Ratings
    ratings: { type: [Number], default: [] },
    reviews: [
  {
    reviewerId: { type: String, required: true },
    text: { type: String, default: "" },
    rating: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }
],

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// ⭐ NEW: virtual average rating (0..10, with 1 decimal)
userSchema.virtual('rating').get(function () {
  if (!this.ratings?.length) return 0;
  const avg = this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length;
  return Math.round(avg * 10) / 10;   // ⭐ formatted to 1 decimal, still /5
});

// ⭐ NEW: total number of submitted ratings
userSchema.virtual('ratingCount').get(function () {
  return this.ratings?.length || 0;
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
