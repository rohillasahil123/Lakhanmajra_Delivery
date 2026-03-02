import { Product, IProduct } from "../models/product.model";
import { Types } from "mongoose";

type ProductFilters = {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  stockStatus?: "in" | "out";
};

const computeDiscount = (mrp?: number, price?: number): number => {
  if (typeof mrp !== 'number' || typeof price !== 'number' || mrp <= 0 || price < 0 || price > mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const parseNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const ensureBaseVariant = (payload: any) => {
  if (!Array.isArray(payload?.variants) || payload.variants.length === 0) return payload;

  const basePrice = parseNumber(payload?.price);
  if (basePrice === undefined) return payload;

  const baseUnit = String(payload?.unit || 'piece').trim().toLowerCase() || 'piece';
  const baseLabel = String(payload?.unitType || payload?.unit || 'Default').trim() || 'Default';
  const baseMrp = parseNumber(payload?.mrp) ?? basePrice;
  const baseStock = parseNumber(payload?.stock) ?? 0;
  const baseDiscount = parseNumber(payload?.discount) ?? computeDiscount(baseMrp, basePrice);

  const hasBaseLabel = payload.variants.some(
    (variant: any) => String(variant?.label || '').trim().toLowerCase() === baseLabel.toLowerCase()
  );

  if (hasBaseLabel) return payload;

  const variants = payload.variants.map((variant: any) => ({ ...variant, isDefault: false }));
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
      ...variants,
    ],
  };
};

const syncRootFieldsFromVariants = (payload: any) => {
  if (!Array.isArray(payload?.variants) || payload.variants.length === 0) return payload;
  const payloadWithBase = ensureBaseVariant(payload);
  const defaultVariant = payloadWithBase.variants.find((variant: any) => variant?.isDefault) || payloadWithBase.variants[0];
  const stock = payloadWithBase.variants.reduce((sum: number, variant: any) => sum + Number(variant?.stock || 0), 0);

  return {
    ...payloadWithBase,
    price: payloadWithBase.price !== undefined ? payloadWithBase.price : Number(defaultVariant?.price || 0),
    mrp: payloadWithBase.mrp !== undefined ? payloadWithBase.mrp : Number(defaultVariant?.mrp || defaultVariant?.price || 0),
    discount:
      payloadWithBase.discount !== undefined
        ? payloadWithBase.discount
        : typeof defaultVariant?.discount === 'number'
        ? defaultVariant.discount
        : computeDiscount(Number(defaultVariant?.mrp || 0), Number(defaultVariant?.price || 0)),
    stock: payloadWithBase.stock !== undefined ? payloadWithBase.stock : stock,
    unit: payloadWithBase.unit || defaultVariant?.unit || 'piece',
    unitType: payloadWithBase.unitType || defaultVariant?.unitType || defaultVariant?.label || '',
  };
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

  const normalizedPayload: any = syncRootFieldsFromVariants(payload);
  const doc = await Product.create({ ...normalizedPayload, slug: finalSlug });
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
  if (filters.stockStatus === "out") query.stock = { $lte: 0 };
  if (filters.stockStatus === "in") query.stock = { $gt: 0 };

  const skip = (page - 1) * limit;

  if (sort === "demand") {
    const [data, total] = await Promise.all([
      Product.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "orders",
            let: { productId: "$_id" },
            pipeline: [
              { $match: { status: { $ne: "cancelled" } } },
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.productId", "$$productId"] } } },
              { $group: { _id: null, soldQty: { $sum: "$items.quantity" } } },
            ],
            as: "demandStats",
          },
        },
        {
          $addFields: {
            soldQty: { $ifNull: [{ $arrayElemAt: ["$demandStats.soldQty", 0] }, 0] },
          },
        },
        { $project: { demandStats: 0 } },
        { $sort: { soldQty: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Product.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

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

export const getProductByIdForDelete = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) return null;
  return Product.findById(id);
};

export const updateProduct = async (id: string, payload: Partial<IProduct>) => {
  const doc = await Product.findByIdAndUpdate(id, payload, { new: true });
  return doc;
};

export const softDeleteProduct = async (id: string) => {
  return Product.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
};

export const deleteProductById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) return null;
  return Product.findByIdAndDelete(id);
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

    // Only upsert by explicit slug. Do not match by name,
    // otherwise new products with same name can overwrite existing ones.
    const existing = it.slug ? await Product.findOne({ slug }) : null;

    const payload: any = {
      name,
      description: it.description || it.desc || undefined,
      price: it.price !== undefined ? Number(it.price) : (it.priceFrom || undefined),
      mrp: it.mrp !== undefined ? Number(it.mrp) : undefined,
      discount: it.discount !== undefined ? Number(it.discount) : undefined,
      stock: it.stock !== undefined ? Number(it.stock) : (it.qty !== undefined ? Number(it.qty) : 0),
      unit: it.unit ? String(it.unit).toLowerCase().trim() : 'piece',
      unitType: it.unitType ? String(it.unitType).trim() : undefined,
      tags: Array.isArray(it.tags) ? it.tags : (it.tags ? it.tags.toString().split(',').map((s:string)=>s.trim()) : []),
      images: Array.isArray(it.images) ? it.images : (it.images ? it.images.toString().split(',').map((s:string)=>s.trim()) : []),
      categoryId: it.categoryId || it.category || undefined,
      isActive: it.isActive === undefined ? true : Boolean(it.isActive),
    };

    if (it.variants) {
      const parsedVariants = Array.isArray(it.variants)
        ? it.variants
        : typeof it.variants === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(it.variants);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];

      payload.variants = parsedVariants
        .map((variant: any) => {
          const label = String(variant?.label || '').trim();
          const price = Number(variant?.price);
          const stock = Number(variant?.stock);
          if (!label || Number.isNaN(price) || Number.isNaN(stock)) return null;

          const mrp = variant?.mrp !== undefined ? Number(variant.mrp) : price;
          const discount =
            variant?.discount !== undefined
              ? Number(variant.discount)
              : computeDiscount(mrp, price);

          return {
            label,
            price,
            mrp,
            discount,
            stock,
            unit: String(variant?.unit || payload.unit || 'piece').toLowerCase().trim(),
            unitType: String(variant?.unitType || label).trim(),
            isDefault: Boolean(variant?.isDefault),
          };
        })
        .filter(Boolean);

      if (payload.variants.length > 0 && !payload.variants.some((variant: any) => variant.isDefault)) {
        payload.variants[0].isDefault = true;
      }
    }

    const syncedPayload = syncRootFieldsFromVariants(payload);

    if (existing) {
      const before = existing.toObject();
      Object.assign(existing, syncedPayload);
      await existing.save();
      results.push({ action: 'updated', id: existing._id.toString(), name: existing.name, before, after: existing.toObject() });
    } else {
      // ensure slug uniqueness
      let finalSlug = slug;
      let found = await Product.findOne({ slug: finalSlug });
      if (found) finalSlug = `${slug}-${Date.now().toString().slice(-5)}`;
      const created = await Product.create({ ...syncedPayload, slug: finalSlug });
      results.push({ action: 'created', id: created._id.toString(), name: created.name, after: created.toObject() });
    }
  }
  return results;
};
