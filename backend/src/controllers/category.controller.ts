import { Request, Response } from "express";
import { Category } from "../models/category.model";
import { createCategorySchema } from "../validators/category.validator";
import { success, fail } from "../utils/response";
import { recordAudit } from "../services/audit.service";

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

    recordAudit({
      actorId: (req as any).user?.id,
      action: "create",
      resource: "category",
      resourceId: category._id.toString(),
      after: category.toObject(),
    }).catch(() => {});

    return success(res, category, "Category created", 201);
  } catch (error: any) {
    return fail(res, error.message || "Create failed", 500);
  }
};

// ADMIN → Update category
// ✅ Fixed: slug is only regenerated if the name actually changed
//    This prevents E11000 duplicate key error when saving without renaming
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, priority } = req.body;
    const update: any = {};

    // Fetch existing doc first — reused for both slug check and audit log
    const before = await Category.findById(id);
    if (!before) return fail(res, "Category not found", 404);

    if (name !== undefined) {
      update.name = name;
      const newSlug = (name || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // ✅ Only update slug if name actually changed
      // Without this check, saving same name causes duplicate key error
      if (before.slug !== newSlug) {
        update.slug = newSlug;
      }
    }

    if (icon !== undefined) update.image = icon;
    if (priority !== undefined) update.priority = priority;

    const category = await Category.findByIdAndUpdate(id, update, { new: true });

    recordAudit({
      actorId: (req as any).user?.id,
      action: "update",
      resource: "category",
      resourceId: Array.isArray(id) ? id[0] : id,
      before: before.toObject(),
      after: category!.toObject(),
    }).catch(() => {});

    return success(res, category, "Category updated");
  } catch (error: any) {
    return fail(res, error.message || "Update failed", 500);
  }
};

// ADMIN → Delete category (soft)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!category) return fail(res, "Category not found", 404);

    recordAudit({
      actorId: (req as any).user?.id,
      action: "delete",
      resource: "category",
      resourceId: Array.isArray(id) ? id[0] : id,
      after: { isActive: false },
    }).catch(() => {});

    return success(res, category, "Category soft-deleted");
  } catch (error: any) {
    return fail(res, error.message || "Delete failed", 500);
  }
};

// USER → Get all active categories
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

// USER → Get single category by id
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const category = await Category.findOne({ _id: id, isActive: true });
    if (!category) return fail(res, "Category not found", 404);

    return success(res, category, "Category fetched");
  } catch (error: any) {
    return fail(res, error.message || "Fetch failed", 500);
  }
};