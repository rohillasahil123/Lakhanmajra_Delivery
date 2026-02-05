import { Router } from "express";
import { createCategory, getCategories } from "../controllers/category.controller";
import { protect, isAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Public
router.get("/", getCategories);

// Admin
router.post("/", protect, isAdmin, createCategory);

export default router;
