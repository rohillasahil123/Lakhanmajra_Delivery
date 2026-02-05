import { Router } from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/category.controller";

const router = Router();

// later → admin middleware add karenge
router.post("/", createCategory);
router.get("/", getCategories);

export default router;
