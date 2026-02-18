import { Request, Response } from "express";
import * as service from "../services/product.service";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";
import { success, fail } from "../utils/response";
import { recordAudit } from "../services/audit.service";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) return fail(res, "Validation failed", 400, error.details);

    const doc = await service.createProduct(value as any);
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'create',
      resource: 'product',
      resourceId: doc._id.toString(),
      after: doc.toObject(),
    }).catch(() => {}); // non‑blocking
    return success(res, doc, "Product created", 201);
  } catch (err: any) {
    return fail(res, err.message || "Create failed", 500);
  }
};

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

export const updateProduct = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) return fail(res, "Validation failed", 400, error.details);

    const before = await service.getProductById(id);
    const doc = await service.updateProduct(id, value as any);
    if (!doc) return fail(res, "Product not found", 404);
    
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'update',
      resource: 'product',
      resourceId: id,
      before: before?.toObject(),
      after: doc.toObject(),
    }).catch(() => {}); // non‑blocking

    return success(res, doc, "Product updated");
  } catch (err: any) {
    return fail(res, err.message || "Update failed", 500);
  }
};

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

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const doc = await service.softDeleteProduct(id);
    if (!doc) return fail(res, "Product not found", 404);
    
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'delete',
      resource: 'product',
      resourceId: id,
      after: { isDeleted: true },
    }).catch(() => {}); // non‑blocking

    return success(res, doc, "Product soft-deleted");
  } catch (err: any) {
    return fail(res, err.message || "Delete failed", 500);
  }
};

// CSV/JSON bulk import for products
export const importProducts = async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of product objects
    if (!Array.isArray(items)) return fail(res, 'items must be array', 400);

    const result = await service.importProducts(items);
    
    recordAudit({
      actorId: (req as any).user?.id,
      action: 'bulk_import',
      resource: 'product',
      meta: { count: items.length, results: result },
    }).catch(() => {}); // non‑blocking

    return success(res, { imported: result.length, results: result }, 'Products imported');
  } catch (err: any) {
    return fail(res, err.message || 'Import failed', 500);
  }
};

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
