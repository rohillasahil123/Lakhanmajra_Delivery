import { Request, Response } from "express";
import * as service from "../services/product.service";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";
import { success, fail } from "../utils/response";
import { recordAudit } from "../services/audit.service";
import { uploadToMinio, deleteFromMinio } from "../services/minio.service";

// ─── Helper: upload all files from req.files to MinIO ────────────────────────
const uploadProductImages = async (req: Request): Promise<string[]> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) return [];

  const urls = await Promise.all(
    files.map((file) => uploadToMinio(file.buffer, file.originalname, file.mimetype))
  );
  return urls;
};

// ─── Create Product ───────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
  try {
    // Parse body — when using multipart/form-data, numbers come as strings
    const bodyData = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined,
      mrp: req.body.mrp ? Number(req.body.mrp) : undefined,
      stock: req.body.stock ? Number(req.body.stock) : undefined,
      categoryId: req.body.categoryId ? String(req.body.categoryId).trim() : undefined,
      subcategoryId: req.body.subcategoryId ? String(req.body.subcategoryId).trim() : undefined,
      tags: req.body.tags
        ? typeof req.body.tags === "string"
          ? req.body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : req.body.tags
        : [],
      // Merge manually typed image URLs with uploaded file URLs
      images: req.body.images
        ? typeof req.body.images === "string"
          ? req.body.images.split(",").map((s: string) => s.trim()).filter(Boolean)
          : req.body.images
        : [],
    };

    const { error, value } = createProductSchema.validate(bodyData);
    if (error) {
      console.error("Validation error:", error.details);
      // Return the first error message for clarity
      return res.status(400).json({
        success: false,
        message: error.details[0]?.message || "Validation failed",
        details: error.details
      });
    }

    // Upload images to MinIO
    const uploadedUrls = await uploadProductImages(req);
    
    // Ensure images is always an array
    let existingImages: string[] = [];
    if (Array.isArray(value.images)) {
      existingImages = value.images.filter((img: any) => typeof img === 'string' && img.trim());
    }
    const allImages = [...existingImages, ...uploadedUrls];

    // Import ObjectId and convert categoryId/subcategoryId strings to ObjectIds
    const { Types } = require("mongoose");
    const dataToSave = {
      ...value,
      images: allImages,
      categoryId: value.categoryId ? new Types.ObjectId(value.categoryId) : undefined,
      subcategoryId: value.subcategoryId && value.subcategoryId.trim() ? new Types.ObjectId(value.subcategoryId) : null,
    };

    const doc = await service.createProduct(dataToSave);

    recordAudit({
      actorId: (req as any).user?.id,
      action: "create",
      resource: "product",
      resourceId: doc._id.toString(),
      after: doc.toObject(),
    }).catch(() => {});

    return success(res, doc, "Product created", 201);
  } catch (err: any) {
    return fail(res, err.message || "Create failed", 500);
  }
};

// ─── Get Products ─────────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { q, categoryId, page = "1", limit = "20", minPrice, maxPrice, tags } = req.query as any;
    const filters: any = {};
    if (q) filters.q = q;
    if (categoryId) filters.categoryId = categoryId;
    if (minPrice) filters.minPrice = Number(minPrice);
    if (maxPrice) filters.maxPrice = Number(maxPrice);
    if (tags) filters.tags = (tags as string).split(",");

    const result = await service.getProducts(filters, Number(page), Number(limit));
    return success(res, result, "Products fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// ─── Get Product By ID ────────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  try {
    let { productId } = req.params;
    if (Array.isArray(productId)) productId = productId[0];
    const doc = await service.getProductById(productId);
    if (!doc) return fail(res, "Product not found", 404);
    return success(res, doc, "Product fetched");
  } catch (err: any) {
    return fail(res, err.message || "Fetch failed", 500);
  }
};

// ─── Update Product ───────────────────────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const bodyData = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined,
      mrp: req.body.mrp ? Number(req.body.mrp) : undefined,
      stock: req.body.stock ? Number(req.body.stock) : undefined,
      tags: req.body.tags
        ? typeof req.body.tags === "string"
          ? req.body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : req.body.tags
        : undefined,
      images: req.body.images
        ? typeof req.body.images === "string"
          ? req.body.images.split(",").map((s: string) => s.trim()).filter(Boolean)
          : req.body.images
        : undefined,
    };

    // Ensure categoryId and subcategoryId are strings before validation
    if (bodyData.categoryId) bodyData.categoryId = String(bodyData.categoryId).trim();
    if (bodyData.subcategoryId) bodyData.subcategoryId = String(bodyData.subcategoryId).trim();

    // Remove undefined keys so validator doesn't complain
    Object.keys(bodyData).forEach((k) => bodyData[k] === undefined && delete bodyData[k]);

    const { error, value } = updateProductSchema.validate(bodyData);
    if (error) {
      console.error("Validation error:", error.details);
      return fail(res, "Validation failed", 400, error.details);
    }

    // Upload new images if any files attached
    const uploadedUrls = await uploadProductImages(req);

    // Merge: keep existing images + add newly uploaded
    let finalImages: string[] = [];
    if (Array.isArray(value.images)) {
      finalImages = value.images.filter((img: any) => typeof img === 'string' && img.trim());
    }
    if (uploadedUrls.length > 0) {
      finalImages = [...finalImages, ...uploadedUrls];
    }
    if (finalImages.length > 0) value.images = finalImages;

    // Convert categoryId and subcategoryId strings to ObjectIds for MongoDB
    const { Types } = require("mongoose");
    const dataToUpdate = { ...value } as any;
    if (dataToUpdate.categoryId) dataToUpdate.categoryId = new Types.ObjectId(dataToUpdate.categoryId);
    if (dataToUpdate.subcategoryId && dataToUpdate.subcategoryId.trim()) {
      dataToUpdate.subcategoryId = new Types.ObjectId(dataToUpdate.subcategoryId);
    } else {
      dataToUpdate.subcategoryId = null;
    }

    const before = await service.getProductById(id);
    const doc = await service.updateProduct(id, dataToUpdate);
    if (!doc) return fail(res, "Product not found", 404);

    recordAudit({
      actorId: (req as any).user?.id,
      action: "update",
      resource: "product",
      resourceId: id,
      before: before?.toObject(),
      after: doc.toObject(),
    }).catch(() => {});

    return success(res, doc, "Product updated");
  } catch (err: any) {
    return fail(res, err.message || "Update failed", 500);
  }
};

// ─── Delete Product Image ─────────────────────────────────────────────────────
export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { imageUrl } = req.body;
    if (!imageUrl) return fail(res, "imageUrl required", 400);

    const doc = await service.getProductById(id);
    if (!doc) return fail(res, "Product not found", 404);

    // Remove from MinIO
    await deleteFromMinio(imageUrl);

    // Remove from product images array
    const updatedImages = doc.images.filter((img) => img !== imageUrl);
    const updated = await service.updateProduct(id, { images: updatedImages } as any);

    return success(res, updated, "Image deleted");
  } catch (err: any) {
    return fail(res, err.message || "Delete image failed", 500);
  }
};

// ─── Update Product Status ────────────────────────────────────────────────────
export const updateProductStatus = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { isActive } = req.body;
    const doc = await service.updateProduct(id, { isActive } as any);
    if (!doc) return fail(res, "Product not found", 404);
    return success(res, doc, "Status updated");
  } catch (err: any) {
    return fail(res, err.message || "Update failed", 500);
  }
};

// ─── Delete Product ───────────────────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const existing = await service.getProductByIdForDelete(id);
    if (!existing) return fail(res, "Product not found", 404);

    const imageUrls = Array.isArray(existing.images) ? [...existing.images] : [];

    const deleted = await service.deleteProductById(id);
    if (!deleted) return fail(res, "Product not found", 404);

    // Cleanup image objects in background (best effort, do not block DB delete)
    if (imageUrls.length > 0) {
      Promise.allSettled(imageUrls.map((url) => deleteFromMinio(url))).catch(() => {});
    }

    recordAudit({
      actorId: (req as any).user?.id,
      action: "delete",
      resource: "product",
      resourceId: id,
      after: { deleted: true },
    }).catch(() => {});

    return success(res, deleted, "Product deleted permanently");
  } catch (err: any) {
    return fail(res, err.message || "Delete failed", 500);
  }
};

// ─── Bulk Import ──────────────────────────────────────────────────────────────
export const importProducts = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return fail(res, "items must be array", 400);

    const result = await service.importProducts(items);

    recordAudit({
      actorId: (req as any).user?.id,
      action: "bulk_import",
      resource: "product",
      meta: { count: items.length, results: result },
    }).catch(() => {});

    return success(res, { imported: result.length, results: result }, "Products imported");
  } catch (err: any) {
    return fail(res, err.message || "Import failed", 500);
  }
};

// ─── Change Stock ─────────────────────────────────────────────────────────────
export const changeStock = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { delta } = req.body;
    if (typeof delta !== "number") return fail(res, "delta must be number", 400);
    const doc = await service.changeStock(id, Number(delta));
    if (!doc) return fail(res, "Product not found", 404);
    return success(res, doc, "Stock updated");
  } catch (err: any) {
    return fail(res, err.message || "Stock update failed", 500);
  }
};