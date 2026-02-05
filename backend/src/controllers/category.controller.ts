import { Request, Response } from "express";
import { Category } from "../models/category.model";
import { createCategorySchema } from "../validators/category.validator";
import { success, fail } from "../utils/response";

// ADMIN → Create category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) return fail(res, "Validation failed", 400, error.details);

    const { name, icon, priority, parentCategory } = value as any;
    const base = (name || "").toString().toLowerCase().trim();
    const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const category = await Category.create({
      name,
      slug,
      image: icon,
      priority,
      parentCategory: parentCategory || null,
    });

    return success(res, category, "Category created", 201);
  } catch (error: any) {
    return fail(res, error.message || "Create failed", 500);
  }
};

// USER → Get active categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      priority: 1,
    });

    return success(res, categories, "Categories fetched");
  } catch (error: any) {
    return fail(res, error.message || "Fetch failed", 500);
  }
};
