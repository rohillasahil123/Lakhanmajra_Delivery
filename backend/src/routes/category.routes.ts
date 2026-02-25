import { Router } from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryById   
} from "../controllers/category.controller";

import { protect } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { upload, handleUploadError } from "../middlewares/upload.middleware";

const router = Router();

// Public
router.get("/", getCategories);
router.get("/:id", getCategoryById); 

// Admin (permission-based)
router.post(
  "/",
  protect,
  requirePermission('categories:create'),
  upload.single("image"),
  handleUploadError,
  createCategory
);
router.patch(
  "/:id",
  protect,
  requirePermission('categories:update'),
  upload.single("image"),
  handleUploadError,
  updateCategory
);
router.delete("/:id", protect, requirePermission('categories:delete'), deleteCategory);

export default router;
