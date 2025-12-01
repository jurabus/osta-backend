// controllers/categoryController.js
import Subcategory from "../models/Subcategory.js"; 
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

//
// NEW: return ALL categories + ALL subcategories
export const allCategoriesAndSubcategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    const subcategories = await Subcategory.find({}).sort({ name: 1 }).lean();

    return ok(res, { categories, subcategories });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

//
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
// GET ALL categories + ONLY subcategories WITH providers
export const categoriesWithProviderFiltering = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const result = [];

    for (const cat of categories) {
      // find subs
      const subs = await Subcategory.find({ category: cat.name })
        .sort({ name: 1 })
        .lean();

      const filteredSubs = [];

      for (const s of subs) {
        const subCount = await Provider.countDocuments({
          subcategories: s.name
        });

        if (subCount > 0) {
          filteredSubs.push({
            ...s,
            providerCount: subCount
          });
        }
      }

      const catCount = await Provider.countDocuments({
        $or: [{ category: cat.name }, { categories: cat.name }]
      });

      if (catCount > 0 || filteredSubs.length > 0) {
        result.push({
          category: cat,
          providerCount: catCount,
          subcategories: filteredSubs
        });
      }
    }

    return ok(res, { items: result });
  } catch (e) {
    return fail(res, 500, e.message);
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
    const match = {
  $or: [
    { category: cat.name },      // legacy primary category
    { categories: cat.name }     // new multi-category system
  ]
};


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
// For Home: categories with first N subcategories + providers each
export const categoriesWithProviders = async (req, res) => {
  try {
    const catsLimit = parseInt(req.query.catsLimit || "10", 10);
    const providersLimit = parseInt(req.query.providersLimit || "10", 10);
    const subLimit = parseInt(req.query.subLimit || "5", 10); // max 5 subcategories per category

    const categories = await Category.find({})
      .sort({ name: 1 })
      .limit(catsLimit)
      .lean();

    const rows = [];

    for (const c of categories) {
      // fetch up to 5 subcategories for this category
      const subcats = await Subcategory.find({ category: c.name })
        .sort({ name: 1 })
        .limit(subLimit)
        .lean();

      const subPayload = [];

      for (const s of subcats) {
        const providers = await Provider.find({ subcategories: s.name })
          .sort({ createdAt: -1 })
          .limit(providersLimit);

        subPayload.push({
          subcategory: s,
          // include virtual rating by using document.toJSON()
          providers: providers.map((p) => p.toJSON()),
        });
      }

      rows.push({ category: c, subcategories: subPayload });
    }

    return ok(res, { rows });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

