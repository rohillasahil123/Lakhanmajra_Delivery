import { Request, Response } from "express";
import { Category } from "../models/category.model";
import { createCategorySchema } from "../validators/category.validator";
import { success, fail } from "../utils/response";
import { recordAudit } from "../services/audit.service";
import { uploadToMinio, deleteFromMinio } from "../services/minio.service";

const uploadCategoryImage = async (req: Request): Promise<string | undefined> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return undefined;
  return uploadToMinio(file.buffer, file.originalname, file.mimetype);
};

// ADMIN → Create category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const uploadedImageUrl = await uploadCategoryImage(req);

    const bodyData = {
      ...req.body,
      icon: uploadedImageUrl || req.body.icon,
      priority:
        req.body.priority === undefined || req.body.priority === null || req.body.priority === ""
          ? undefined
          : Number(req.body.priority),
    };

    const { error, value } = createCategorySchema.validate(bodyData);
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
    const { name, icon } = req.body;
    const uploadedImageUrl = await uploadCategoryImage(req);
    const priority =
      req.body.priority === undefined || req.body.priority === null || req.body.priority === ""
        ? undefined
        : Number(req.body.priority);
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

    if (uploadedImageUrl) update.image = uploadedImageUrl;
    else if (icon !== undefined) update.image = icon;
    if (priority !== undefined) update.priority = priority;

    const category = await Category.findByIdAndUpdate(id, update, { new: true });

    if (uploadedImageUrl && before.image && before.image !== uploadedImageUrl) {
      deleteFromMinio(before.image).catch(() => {});
    }

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

// ADMIN → Delete category (permanent)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const category = await Category.findByIdAndDelete(id);
    if (!category) return fail(res, "Category not found", 404);

    recordAudit({
      actorId: (req as any).user?.id,
      action: "delete",
      resource: "category",
      resourceId: id,
      after: { deleted: true },
    }).catch(() => {});

    return success(res, category, "Category deleted permanently");
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