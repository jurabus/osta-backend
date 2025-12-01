// routes/categoryRoutes.js
import express from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
  topCategories,
  providersByCategory,
  categoriesWithProviders,
  allCategoriesAndSubcategories,
} from "../controllers/categoryController.js";
import { requireAdminKey } from "../middleware/adminKey.js";

const router = express.Router();

// public
router.get("/", listCategories);
router.get("/top", topCategories);
router.get("/with-providers", categoriesWithProviders);
router.get("/:id/providers", providersByCategory);
router.get(
  "/categories-and-subcategories",
  allCategoriesAndSubcategories
);

// admin
router.post("/", requireAdminKey, createCategory);
router.put("/:id", requireAdminKey, updateCategory);
router.delete("/:id", requireAdminKey, deleteCategory);

export default router;
