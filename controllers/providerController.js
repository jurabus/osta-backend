import jwt from 'jsonwebtoken';
import Provider from '../models/Provider.js';
import { ok, fail } from '../utils/responses.js';

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

// AUTH
// controllers/providerController.js

export const signup = async (req, res) => {
  try {
    // 🔹 If client sends categories array but no legacy 'category',
    // set category = first categories[0] for backward compatibility
    if (!req.body.category && Array.isArray(req.body.categories) && req.body.categories.length > 0) {
      req.body.category = req.body.categories[0];
    }

    const provider = await Provider.create(req.body);
    const token = sign({ id: provider._id, role: 'provider', kind: 'provider' });
    return ok(res, { provider, token });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

export const getProvider = async (req, res) => {
  try {
    const doc = await Provider.findById(req.params.id);
    if (!doc) return fail(res, 404, "Provider not found");
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const provider = await Provider.findOne({ email });
    if (!provider || !(await provider.comparePassword(password)))
      return fail(res, 401, 'Invalid credentials');

    const token = sign({ id: provider._id, role: 'provider', kind: 'provider' });
    return ok(res, {
      token,
      kind: 'provider',
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email
      }
    });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};


// LIST (optionally filter by category ?category=)
// LIST (optionally filter by category ?category= & subcategory ?subcategory= & rating ?minRating=)
export const listProviders = async (req, res) => {
  try {
    const q = {};

    if (req.query.category) {
      const cat = req.query.category;
      // match either legacy single category or new categories array
      q.$or = [{ category: cat }, { categories: cat }];
    }

    if (req.query.subcategory) {
      const sub = req.query.subcategory;
      // match providers whose subcategories array contains this name
      q.subcategories = sub;
    }
    // --- Region Filters ---
    const city = req.query.city;
    const area = req.query.area;

    // --- REGION FILTER (Optimized) ---
if (city || area) {
  q.$or = [
    { "regions.everywhere": true },
    city ? { "regions.cities": city } : null,
    area ? { "regions.areas": area } : null
  ].filter(Boolean);
}

    const minRating =
      req.query.minRating != null ? Number(req.query.minRating) : null;

    let docs = await Provider.find(q).sort({ createdAt: -1 });

    if (!isNaN(minRating) && minRating > 0) {
      docs = docs.filter((d) => d.rating >= minRating);
    }

    return ok(res, docs);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};


export const updateProvider = async (req, res) => {
  try {
    const doc = await Provider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return doc ? ok(res, doc) : fail(res, 404, 'Not found');
  } catch (e) {
    return fail(res, 400, e.message);
  }
};



// Ratings & reviews
export const addRating = async (req, res) => {
  const { rating, review } = req.body; // rating 0..5
  if (rating == null || rating < 0 || rating > 5) {
    return fail(res, 400, 'rating 0..5');
  }

  const doc = await Provider.findById(req.params.id);
  if (!doc) return fail(res, 404, 'Not found');

  doc.ratings.push(Number(rating));
  if (review) doc.reviews.push(review);

  await doc.save();
  return ok(res, doc);
};
