import { Product, IProduct } from "../models/product.model";
import { Types } from "mongoose";

type ProductFilters = {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
};

export const createProduct = async (payload: Partial<IProduct>) => {
  // generate slug from name
  const base = (payload.name || "").toString().toLowerCase().trim();
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  // ensure unique slug by appending timestamp if needed
  let finalSlug = slug;
  let exists = await Product.findOne({ slug: finalSlug });
  if (exists) finalSlug = `${slug}-${Date.now().toString().slice(-5)}`;

  const doc = await Product.create({ ...payload, slug: finalSlug });
  return doc;
};

export const getProducts = async (
  filters: ProductFilters,
  page = 1,
  limit = 20,
  sort = "-createdAt"
) => {
  const query: any = { isDeleted: false, isActive: true };

  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.q) query.$text = { $search: filters.q };
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};
    if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
  }
  if (filters.tags && filters.tags.length) query.tags = { $in: filters.tags };

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Product.find(query).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  return { data, total, page, limit };
};

export const getProductById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await Product.findOne({ _id: id, isDeleted: false });
  return doc;
};

export const updateProduct = async (id: string, payload: Partial<IProduct>) => {
  const doc = await Product.findByIdAndUpdate(id, payload, { new: true });
  return doc;
};

export const softDeleteProduct = async (id: string) => {
  return Product.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
};

export const changeStock = async (id: string, delta: number) => {
  // delta can be negative
  const doc = await Product.findById(id);
  if (!doc) return null;
  doc.stock = Math.max(0, (doc.stock || 0) + delta);
  await doc.save();
  return doc;
};
