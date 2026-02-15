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

// Bulk import / upsert products from admin CSV/JSON import
export const importProducts = async (items: Array<any>) => {
  const results: any[] = [];
  for (const it of items) {
    const name = (it.name || it.title || '').toString().trim();
    if (!name) continue;

    // generate slug from name
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = it.slug ? it.slug.toString().toLowerCase() : base;

    // try find by slug or name
    let existing = await Product.findOne({ slug });
    if (!existing) existing = await Product.findOne({ name });

    const payload: any = {
      name,
      description: it.description || it.desc || undefined,
      price: it.price !== undefined ? Number(it.price) : (it.priceFrom || undefined),
      mrp: it.mrp !== undefined ? Number(it.mrp) : undefined,
      stock: it.stock !== undefined ? Number(it.stock) : (it.qty !== undefined ? Number(it.qty) : 0),
      tags: Array.isArray(it.tags) ? it.tags : (it.tags ? it.tags.toString().split(',').map((s:string)=>s.trim()) : []),
      images: Array.isArray(it.images) ? it.images : (it.images ? it.images.toString().split(',').map((s:string)=>s.trim()) : []),
      categoryId: it.categoryId || it.category || undefined,
      isActive: it.isActive === undefined ? true : Boolean(it.isActive),
    };

    if (existing) {
      const before = existing.toObject();
      Object.assign(existing, payload);
      await existing.save();
      results.push({ action: 'updated', id: existing._id.toString(), name: existing.name, before, after: existing.toObject() });
    } else {
      // ensure slug uniqueness
      let finalSlug = slug;
      let found = await Product.findOne({ slug: finalSlug });
      if (found) finalSlug = `${slug}-${Date.now().toString().slice(-5)}`;
      const created = await Product.create({ ...payload, slug: finalSlug });
      results.push({ action: 'created', id: created._id.toString(), name: created.name, after: created.toObject() });
    }
  }
  return results;
};
