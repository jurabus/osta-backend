import jwt from 'jsonwebtoken';
import Provider from '../models/Provider.js';
import { ok, fail } from '../utils/responses.js';

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

// AUTH
export const signup = async (req, res) => {
  try {
    const provider = await Provider.create(req.body);
    const token = sign({ id: provider._id, role: 'provider', kind: 'provider' });
    return ok(res, { provider, token });
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
    return ok(res, { provider, token });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// LIST (optionally filter by category ?category=)
export const listProviders = async (req, res) => {
  const q = {};
  if (req.query.category) q.category = req.query.category;
  const data = await Provider.find(q).sort({ createdAt: -1 });
  return ok(res, data);
};

export const getProvider = async (req, res) => {
  const doc = await Provider.findById(req.params.id);
  return doc ? ok(res, doc) : fail(res, 404, 'Not found');
};

export const createProvider = async (req, res) => {
  try {
    const doc = await Provider.create(req.body);
    return ok(res, doc);
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

export const deleteProvider = async (req, res) => {
  const doc = await Provider.findByIdAndDelete(req.params.id);
  return doc ? ok(res, { deleted: doc._id }) : fail(res, 404, 'Not found');
};

// Ratings & reviews
export const addRating = async (req, res) => {
  const { rating, review } = req.body; // rating 0..10
  if (rating == null || rating < 0 || rating > 10) return fail(res, 400, 'rating 0..10');
  const doc = await Provider.findById(req.params.id);
  if (!doc) return fail(res, 404, 'Not found');
  doc.ratings.push(Number(rating));
  if (review) doc.reviews.push(review);
  await doc.save();
  return ok(res, doc);
};
