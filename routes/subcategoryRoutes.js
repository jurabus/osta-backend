// routes/subcategoryRoutes.js
import express from "express";
import {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  listSubcategories,
  providersBySubcategory,
} from "../controllers/subcategoryController.js";
import { requireAdminKey } from "../middleware/adminKey.js";

const router = express.Router();

// public
router.get("/", listSubcategories);
router.get("/:id/providers", providersBySubcategory);

// admin
router.post("/", requireAdminKey, createSubcategory);
router.put("/:id", requireAdminKey, updateSubcategory);
router.delete("/:id", requireAdminKey, deleteSubcategory);

export default router;
