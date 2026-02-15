import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProductStatus,
  updateProduct,
  deleteProduct,
  changeStock,
  importProducts,
} from "../controllers/product.controller";
import { protect } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

// Public
router.get("/", getProducts);
router.get("/:productId", getProductById);

// Admin (permission-based)
router.post("/", protect, requirePermission('products:create'), createProduct);
router.post("/import", protect, requirePermission('products:create'), importProducts);
router.patch("/:id", protect, requirePermission('products:update'), updateProduct);
router.patch("/:id/status", protect, requirePermission('products:update'), updateProductStatus);
router.patch("/:id/stock", protect, requirePermission('products:update'), changeStock);
router.delete("/:id", protect, requirePermission('products:delete'), deleteProduct);

export default router;
