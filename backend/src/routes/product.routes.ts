import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProductStatus,
} from "../controllers/product.controller";

const router = Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:productId", getProductById);
router.patch("/:id/status", updateProductStatus);

export default router;
