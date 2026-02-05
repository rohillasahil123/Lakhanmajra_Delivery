import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProductStatus,
  updateProduct,
  deleteProduct,
  changeStock,
} from "../controllers/product.controller";
import { protect, isAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Public
router.get("/", getProducts);
router.get("/:productId", getProductById);

// Admin
router.post("/", protect, isAdmin, createProduct);
router.patch("/:id", protect, isAdmin, updateProduct);
router.patch("/:id/status", protect, isAdmin, updateProductStatus);
router.patch("/:id/stock", protect, isAdmin, changeStock);
router.delete("/:id", protect, isAdmin, deleteProduct);

export default router;
