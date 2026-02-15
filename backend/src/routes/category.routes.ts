import { Router } from "express";
import { createCategory, getCategories, updateCategory, deleteCategory } from "../controllers/category.controller";
import { protect } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

// Public
router.get("/", getCategories);

// Admin (permission-based)
router.post("/", protect, requirePermission('categories:create'), createCategory);
router.patch("/:id", protect, requirePermission('categories:update'), updateCategory);
router.delete("/:id", protect, requirePermission('categories:delete'), deleteCategory);

export default router;
