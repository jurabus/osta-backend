// controllers/categoryController.js
import Category from "../models/Category.js";
import Provider from "../models/Provider.js"; // existing model that has "category" (string)
import { ok, fail } from "../utils/responses.js";

// Create
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return fail(res, 400, "Name is required");

    const doc = await Category.create({ name: name.trim() });
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Update (only name)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {};

    if (req.body.name) {
      payload.name = req.body.name.trim();
    }

    const doc = await Category.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return fail(res, 404, "Not found");
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Delete
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Category.findByIdAndDelete(id);
    if (!doc) return fail(res, 404, "Not found");
    return ok(res, { deleted: true });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// List/search (paginated)
export const listCategories = async (req, res) => {
  try {
    const { q = "", limit = 20, skip = 0 } = req.query;

    const match = {};
    if (q) {
      match.name = { $regex: q, $options: "i" };
    }

    const items = await Category.find(match)
      .sort({ name: 1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await Category.countDocuments(match);
    return ok(res, { items, total });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Top categories (by name) limit=10 default
export const topCategories = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const items = await Category.find({})
      .sort({ name: 1 })
      .limit(limit);
    return ok(res, { items });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Providers by category (by name match) with pagination (20/page)
export const providersByCategory = async (req, res) => {
  try {
    const { id } = req.params; // category id
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
    const skip = (page - 1) * limit;

    const cat = await Category.findById(id);
    if (!cat) return fail(res, 404, "Category not found");

    // Existing Provider model stores string 'category'
    const match = { category: cat.name };

    const items = await Provider.find(match)
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Provider.countDocuments(match);
    const hasMore = skip + items.length < total;

    return ok(res, { category: cat, items, page, limit, total, hasMore });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// For Home: categories with first N providers each
export const categoriesWithProviders = async (req, res) => {
  try {
    const catsLimit = parseInt(req.query.catsLimit || "10", 10);
    const providersLimit = parseInt(req.query.providersLimit || "10", 10);

    const categories = await Category.find({})
      .sort({ name: 1 })
      .limit(catsLimit)
      .lean();

    const payload = [];
    for (const c of categories) {
      const providers = await Provider.find({ category: c.name })
        .sort({ rating: -1, createdAt: -1 })
        .limit(providersLimit)
        .lean();
      payload.push({ category: c, providers });
    }

    return ok(res, { rows: payload });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
