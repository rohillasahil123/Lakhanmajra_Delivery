import { Request, Response } from "express";
import * as service from "../services/product.service";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";
import { success, fail } from "../utils/response";
import { recordAudit } from "../services/audit.service";
import { uploadToMinio, deleteFromMinio } from "../services/minio.service";

const parseOptionalNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseVariantsInput = (value: any): any[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const calculateDiscountPercent = (mrp?: number, price?: number): number => {
  if (typeof mrp !== "number" || typeof price !== "number" || mrp <= 0 || price < 0 || price > mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const normalizeVariants = (
  variants: any[] | undefined,
  fallbackUnit?: string,
  fallbackUnitType?: string
): any[] | undefined => {
  if (!Array.isArray(variants)) return undefined;

  const cleaned = variants
    .map((variant) => {
      const label = String(variant?.label || "").trim();
      const price = parseOptionalNumber(variant?.price);
      const stock = parseOptionalNumber(variant?.stock);
      const mrp = parseOptionalNumber(variant?.mrp);
      const discount = parseOptionalNumber(variant?.discount);
      if (!label || price === undefined || stock === undefined) return null;

      const normalizedMrp = mrp !== undefined ? mrp : price;
      const normalizedDiscount =
        discount !== undefined ? discount : calculateDiscountPercent(normalizedMrp, price);

      return {
        ...(variant?._id ? { _id: variant._id } : {}),
        label,
        price,
        mrp: normalizedMrp,
        discount: normalizedDiscount,
        stock,
        unit: String(variant?.unit || fallbackUnit || "piece").trim().toLowerCase(),
        unitType: String(variant?.unitType || label || fallbackUnitType || "").trim(),
        isDefault: Boolean(variant?.isDefault),
      };
    })
    .filter(Boolean) as any[];

  if (cleaned.length === 0) return [];

  if (!cleaned.some((variant) => variant.isDefault)) {
    cleaned[0].isDefault = true;
  } else {
    let defaultAssigned = false;
    for (const variant of cleaned) {
      if (variant.isDefault && !defaultAssigned) {
        defaultAssigned = true;
        continue;
      }
      variant.isDefault = false;
    }
  }

  return cleaned;
};

const ensureBaseVariant = (payload: any): any => {
  if (!Array.isArray(payload?.variants) || payload.variants.length === 0) return payload;

  const basePrice = parseOptionalNumber(payload?.price);
  if (basePrice === undefined) return payload;

  const baseUnit = String(payload?.unit || "piece").trim().toLowerCase() || "piece";
  const baseLabel = String(payload?.unitType || payload?.unit || "Default").trim() || "Default";
  const baseMrp = parseOptionalNumber(payload?.mrp) ?? basePrice;
  const baseStock = parseOptionalNumber(payload?.stock) ?? 0;
  const baseDiscount =
    parseOptionalNumber(payload?.discount) ?? calculateDiscountPercent(baseMrp, basePrice);

  const hasBaseLabel = payload.variants.some(
    (variant: any) => String(variant?.label || "").trim().toLowerCase() === baseLabel.toLowerCase()
  );

  if (hasBaseLabel) return payload;

  const resetDefaultVariants = payload.variants.map((variant: any) => ({ ...variant, isDefault: false }));
  return {
    ...payload,
    variants: [
      {
        label: baseLabel,
        price: basePrice,
        mrp: baseMrp,
        discount: baseDiscount,
        stock: baseStock,
        unit: baseUnit,
        unitType: baseLabel,
        isDefault: true,
      },
      ...resetDefaultVariants,
    ],
  };
};

const syncRootFieldsFromVariants = (payload: any): any => {
  if (!Array.isArray(payload?.variants) || payload.variants.length === 0) return payload;
  const payloadWithBase = ensureBaseVariant(payload);
  const defaultVariant =
    payloadWithBase.variants.find((variant: any) => variant.isDefault) || payloadWithBase.variants[0];
  const totalStock = payloadWithBase.variants.reduce(
    (sum: number, variant: any) => sum + Number(variant.stock || 0),
    0
  );

  return {
    ...payloadWithBase,
    price:
      payloadWithBase.price !== undefined
        ? payloadWithBase.price
        : Number(defaultVariant.price || 0),
    mrp:
      payloadWithBase.mrp !== undefined
        ? payloadWithBase.mrp
        : Number(defaultVariant.mrp || defaultVariant.price || 0),
    discount:
      payloadWithBase.discount !== undefined
        ? payloadWithBase.discount
        : typeof defaultVariant.discount === "number"
        ? defaultVariant.discount
        : calculateDiscountPercent(Number(defaultVariant.mrp || 0), Number(defaultVariant.price || 0)),
    stock:
      payloadWithBase.stock !== undefined
        ? payloadWithBase.stock
        : totalStock,
    unit: payloadWithBase.unit || defaultVariant.unit || "piece",
    unitType: payloadWithBase.unitType || defaultVariant.unitType || defaultVariant.label || "",
  };
};

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
      price: parseOptionalNumber(req.body.price),
      mrp: parseOptionalNumber(req.body.mrp),
      discount: parseOptionalNumber(req.body.discount),
      stock: parseOptionalNumber(req.body.stock),
      unit: req.body.unit ? String(req.body.unit).trim().toLowerCase() : undefined,
      unitType: req.body.unitType ? String(req.body.unitType).trim() : undefined,
      variants: normalizeVariants(
        parseVariantsInput(req.body.variants),
        req.body.unit ? String(req.body.unit).trim().toLowerCase() : undefined,
        req.body.unitType ? String(req.body.unitType).trim() : undefined
      ),
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
    const syncedValue = syncRootFieldsFromVariants(value);

    const dataToSave = {
      ...syncedValue,
      images: allImages,
      categoryId: syncedValue.categoryId ? new Types.ObjectId(syncedValue.categoryId) : undefined,
      subcategoryId: syncedValue.subcategoryId && syncedValue.subcategoryId.trim() ? new Types.ObjectId(syncedValue.subcategoryId) : null,
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
    const { q, categoryId, page = "1", limit = "20", minPrice, maxPrice, tags, stockStatus, sortBy } = req.query as any;
    const filters: any = {};
    if (q) filters.q = q;
    if (categoryId) filters.categoryId = categoryId;
    if (minPrice) filters.minPrice = Number(minPrice);
    if (maxPrice) filters.maxPrice = Number(maxPrice);
    if (tags) filters.tags = (tags as string).split(",");
    if (stockStatus === "out" || stockStatus === "in") filters.stockStatus = stockStatus;

    const resolvedSort = sortBy === "demand" ? "demand" : "-createdAt";
    const result = await service.getProducts(filters, Number(page), Number(limit), resolvedSort as any);
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
      price: parseOptionalNumber(req.body.price),
      mrp: parseOptionalNumber(req.body.mrp),
      discount: parseOptionalNumber(req.body.discount),
      stock: parseOptionalNumber(req.body.stock),
      unit: req.body.unit ? String(req.body.unit).trim().toLowerCase() : undefined,
      unitType: req.body.unitType ? String(req.body.unitType).trim() : undefined,
      variants: normalizeVariants(
        parseVariantsInput(req.body.variants),
        req.body.unit ? String(req.body.unit).trim().toLowerCase() : undefined,
        req.body.unitType ? String(req.body.unitType).trim() : undefined
      ),
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

    const syncedValue = syncRootFieldsFromVariants(value);

    // Convert categoryId and subcategoryId strings to ObjectIds for MongoDB
    const { Types } = require("mongoose");
    const dataToUpdate = { ...syncedValue } as any;
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

    const stillExists = await service.getProductByIdForDelete(id);
    if (stillExists) return fail(res, "Product could not be deleted from DB", 500);

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

    return success(
      res,
      {
        deletedId: String((deleted as any)?._id || id),
        deleted,
      },
      "Product deleted permanently"
    );
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