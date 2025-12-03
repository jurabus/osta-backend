// controllers/subcategoryController.js
import Subcategory from "../models/Subcategory.js";
import Provider from "../models/Provider.js";
import { ok, fail } from "../utils/responses.js";

// Admin: create subcategory
export const createSubcategory = async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) {
      return fail(res, 400, "name and category are required");
    }

    const doc = await Subcategory.create({
      name: name.trim(),
      category: category.trim(),
    });

    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Admin: update subcategory
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {};
    if (req.body.name) payload.name = req.body.name.trim();
    if (req.body.category) payload.category = req.body.category.trim();

    const doc = await Subcategory.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return fail(res, 404, "Not found");
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Admin: delete subcategory
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Subcategory.findByIdAndDelete(id);
    if (!doc) return fail(res, 404, "Not found");
    return ok(res, { deleted: true });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Public: list/search subcategories (with optional category filter)
export const listSubcategories = async (req, res) => {
  try {
    const { q = "", limit = 100, skip = 0, category } = req.query;
    const match = {};

    if (category) {
      match.category = category;
    }

    if (q) {
      match.name = { $regex: q, $options: "i" };
    }

    const items = await Subcategory.find(match)
      .sort({ name: 1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await Subcategory.countDocuments(match);

    return ok(res, { items, total });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// Public: providers by subcategory (name via id) with pagination & rating filter
export const providersBySubcategory = async (req, res) => {
  try {
    const { id } = req.params; // subcategory id
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
    const skip = (page - 1) * limit;
    const minRating =
      req.query.minRating != null ? Number(req.query.minRating) : null;

    const sub = await Subcategory.findById(id);
    if (!sub) return fail(res, 404, "Subcategory not found");

    const q = {
  $or: [
    { subcategories: sub.name.trim() },    // legacy name matching
    { subcategoryIds: sub._id.toString() } // NEW: correct ID matching
  ]
};


    let docs = await Provider.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (!isNaN(minRating) && minRating > 0) {
      docs = docs.filter((d) => d.rating >= minRating);
    }

    const total = await Provider.countDocuments({ subcategories: sub.name });
    const hasMore = skip + docs.length < total;

    return ok(res, {
      subcategory: sub,
      items: docs,
      page,
      limit,
      total,
      hasMore,
    });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
