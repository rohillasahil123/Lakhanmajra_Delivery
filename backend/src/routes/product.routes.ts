import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProductStatus,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  changeStock,
  importProducts,
} from "../controllers/product.controller";
import { protect } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { upload, handleUploadError } from "../middlewares/upload.middleware";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get("/", getProducts);
router.get("/:productId", getProductById);

// ─── Admin Routes (permission-based) ─────────────────────────────────────────

// Create product — accepts up to 5 images as multipart/form-data
router.post(
  "/",
  protect,
  requirePermission("products:create"),
  upload.array("images", 5),   // field name: "images", max 5 files
  handleUploadError,
  createProduct
);

// Bulk import (JSON only, no images)
router.post(
  "/import",
  protect,
  requirePermission("products:create"),
  importProducts
);

// Update product — also accepts new images
router.patch(
  "/:id",
  protect,
  requirePermission("products:update"),
  upload.array("images", 5),
  handleUploadError,
  updateProduct
);

// Delete a single image from a product
router.delete(
  "/:id/image",
  protect,
  requirePermission("products:update"),
  deleteProductImage
);

// Update status
router.patch(
  "/:id/status",
  protect,
  requirePermission("products:update"),
  updateProductStatus
);

// Update stock
router.patch(
  "/:id/stock",
  protect,
  requirePermission("products:update"),
  changeStock
);

// Delete product
router.delete(
  "/:id",
  protect,
  requirePermission("products:delete"),
  deleteProduct
);

export default router;