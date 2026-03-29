import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';
import { logErrorSafely, sanitizeError } from '../utils/errorHandler';
import {
  sanitizeFormInput,
  sanitizeNumber,
  sanitizeSearchQuery,
} from '../utils/sanitize';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductVariant = {
  _id?: string;
  clientKey?: string;
  label: string;
  price: string;
  mrp: string;
  discount: string;
  stock: string;
  unit?: string;
  unitType?: string;
  isDefault?: boolean;
  image?: string;
};

export type Product = {
  _id: string;
  name: string;
  price: number;
  mrp?: number;
  discount?: number;
  stock?: number;
  unit?: string;
  unitType?: string;
  images?: string[];
  isActive?: boolean;
  categoryId?: string | { _id?: string; name?: string } | null;
  subcategoryId?: string | { _id?: string; name?: string } | null;
  variants?: ProductVariant[];
  description?: string;
  tags?: string;
};

export type Category = {
  _id: string;
  name: string;
  parentCategory?: string | { _id?: string } | null;
};

export type SortKey = 'name' | 'price' | 'stock' | null;
export type StockFilter = 'all' | 'out';

// ─── Constants ────────────────────────────────────────────────────────────────

export const UNIT_VARIANTS: Record<string, string[]> = {
  piece: ['1 pc', '2 pcs', '5 pcs', '10 pcs'],
  kg: ['250 g', '500 g', '1 kg', '2 kg', '5 kg'],
  g: ['50 g', '100 g', '200 g', '500 g'],
  l: ['250 ml', '500 ml', '1 L', '2 L', '5 L'],
  ml: ['100 ml', '200 ml', '500 ml', '750 ml'],
  pack: ['1 pack', '2 pack', '5 pack', '10 pack'],
};

export const AUTO_REFRESH_MS = 10_000;
export const AUTO_REFRESH_EDITING_MS = 30_000;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const createUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for environments where crypto.randomUUID is unavailable (older browsers or some WebViews)
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const createEmptyVariant = (): ProductVariant => ({
  clientKey: createUuid(),
  label: '',
  price: '',
  mrp: '',
  discount: '',
  stock: '',
  unit: '',
  isDefault: false,
  image: '',
});

export const toNumber = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const calculateDiscountPercent = (mrpVal: string, priceVal: string): string => {
  const m = toNumber(mrpVal),
    p = toNumber(priceVal);
  if (m === null || p === null || m <= 0 || p < 0 || p > m) return '';
  return String(Math.round(((m - p) / m) * 100));
};

export const getRefId = (
  ref: string | { _id?: string; id?: string; name?: string } | null | undefined
): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id || ref.id || '';
};

export const getRefName = (
  ref: string | { _id?: string; name?: string } | null | undefined
): string => {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.name) return ref.name;
  return '';
};

export const normalizeVariantsForPayload = (raw: ProductVariant[], selectedUnit?: string) => {
  const cleaned = raw
    .map((v) => {
      const label = v.label.trim(),
        pv = toNumber(v.price),
        sv = toNumber(v.stock),
        mv = toNumber(v.mrp);
      if (!label || pv === null || sv === null) return null;
      const rm = mv === null ? pv : mv;
      return {
        ...(v._id ? { _id: v._id } : {}),
        label,
        price: pv,
        mrp: rm,
        discount: Number(calculateDiscountPercent(String(rm), String(pv)) || 0),
        stock: Math.max(0, Math.floor(sv)),
        unit: String(v.unit || selectedUnit || 'piece').toLowerCase(),
        unitType: String(v.unitType || label).trim(),
        isDefault: Boolean(v.isDefault),
      };
    })
    .filter(Boolean) as any[];

  if (!cleaned.length) return [];
  const di = cleaned.findIndex((v) => v.isDefault);
  return cleaned.map((v, i) => ({ ...v, isDefault: i === (di >= 0 ? di : 0) }));
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProducts(autoRefreshMs: number = AUTO_REFRESH_MS) {
  const [allItems, setAllItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track total count per category (fetched once)
  const [categoryTotalCounts, setCategoryTotalCounts] = useState<Record<string, number>>({});

  const LIMIT = 50;

  // ── Category helpers ──────────────────────────────────────────────────────

  const getParentCategoryId = (c: Category): string | null => {
    if (!c.parentCategory) return null;
    if (typeof c.parentCategory === 'string') return c.parentCategory;
    return c.parentCategory._id || (c.parentCategory as any).id || null;
  };

  const parentCategories = categories.filter((c) => !getParentCategoryId(c));
  const subCategoriesOf = (pid: string) => categories.filter((c) => getParentCategoryId(c) === pid);

  const getCategoryLabel = (p: Product): string => {
    const d = getRefName(p.categoryId);
    if (d) return d;
    return categories.find((c) => c._id === getRefId(p.categoryId))?.name || '—';
  };

  const getSubCategoryLabel = (p: Product): string => {
    const d = getRefName(p.subcategoryId);
    if (d) return d;
    return categories.find((c) => c._id === getRefId(p.subcategoryId))?.name || '—';
  };

  // ── Load products ─────────────────────────────────────────────────────────

  // Load paginated products for general view OR all products for selected category
  const load = async (pageNum = 1, catId: string | null = null) => {
    try {
      setError(null);
      const q = new URLSearchParams();
      q.set('page', String(pageNum));
      q.set('limit', String(LIMIT));
      q.set('_ts', String(Date.now()));
      if (search.trim()) q.set('q', search.trim());
      if (stockFilter === 'out') q.set('stockStatus', 'out');
      if (catId) q.set('categoryId', catId);
      
      const res = await api.get(`/products?${q.toString()}`);
      const data = res.data?.data ?? res.data;
      const products = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      setAllItems(products);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
      setLastRefreshedAt(new Date());
      
      // Store total count for this category if provided
      if (catId && data?.total) {
        setCategoryTotalCounts(prev => ({ ...prev, [catId]: data.total }));
      }
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('loadProducts', err);
      setError(sanitized.userMessage);
      setAllItems([]);
    }
  };

  // ── Load categories (called externally after modal changes) ───────────────

  // Load product count for all categories
  const loadCategoryProductCounts = useCallback(async () => {
    try {
      if (categories.length === 0) return;
      
      const counts: Record<string, number> = {};
      
      // Fetch count for each category
      await Promise.all(
        categories.map(async (cat) => {
          try {
            const q = new URLSearchParams();
            q.set('categoryId', cat._id);
            q.set('limit', '1'); // We only need the total count
            q.set('page', '1');
            const res = await api.get(`/products?${q.toString()}`);
            const data = res.data?.data ?? res.data;
            counts[cat._id] = data?.total ?? 0;
          } catch {
            counts[cat._id] = 0;
          }
        })
      );
      
      setCategoryTotalCounts(counts);
    } catch {
      /* silent */
    }
  }, [categories]);

  const reloadCategories = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/categories');
      const data = res.data?.data ?? res.data ?? [];
      const catData = Array.isArray(data) ? data : [];
      setCategories(catData);
      
      // Fetch counts for all categories
      if (catData.length > 0) {
        const counts: Record<string, number> = {};
        await Promise.all(
          catData.map(async (cat) => {
            try {
              const q = new URLSearchParams();
              q.set('categoryId', cat._id);
              q.set('limit', '1');
              q.set('page', '1');
              const res = await api.get(`/products?${q.toString()}`);
              const responseData = res.data?.data ?? res.data;
              counts[cat._id] = responseData?.total ?? 0;
            } catch {
              counts[cat._id] = 0;
            }
          })
        );
        setCategoryTotalCounts(counts);
      }
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('reloadCategories', err);
      setError(sanitized.userMessage);
    }
  }, []);

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(page, selectedCatId), reloadCategories()]);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setPermissions(await getPermissions());
        // Load categories first
        const res = await api.get('/categories');
        const data = res.data?.data ?? res.data ?? [];
        const catData = Array.isArray(data) ? data : [];
        setCategories(catData);
        
        // Then load counts for all categories
        if (catData.length > 0) {
          const counts: Record<string, number> = {};
          await Promise.all(
            catData.map(async (cat) => {
              try {
                const q = new URLSearchParams();
                q.set('categoryId', cat._id);
                q.set('limit', '1');
                q.set('page', '1');
                const res = await api.get(`/products?${q.toString()}`);
                const responseData = res.data?.data ?? res.data;
                counts[cat._id] = responseData?.total ?? 0;
              } catch {
                counts[cat._id] = 0;
              }
            })
          );
          setCategoryTotalCounts(counts);
        }
        
        // Finally load products for display
        await load(1);
      } catch (err) {
        const sanitized = sanitizeError(err);
        logErrorSafely('initProducts', err);
        setError(sanitized.userMessage);
      }
    })();
  }, []);

  useEffect(() => {
    load(1, selectedCatId);
  }, [stockFilter, selectedCatId]);

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (creating || updating || importing || autoRefreshMs <= 0) return;
    const id = setInterval(() => load(page, selectedCatId), autoRefreshMs);
    return () => clearInterval(id);
  }, [page, search, stockFilter, selectedCatId, creating, updating, importing, autoRefreshMs]);

  // ── Sort ──────────────────────────────────────────────────────────────────

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) {
      setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('asc');
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryProducts = selectedCatId
    ? allItems.filter((p) => getRefId(p.categoryId) === selectedCatId)
    : allItems;

  const searchedProducts = search.trim()
    ? categoryProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : categoryProducts;

  // Sort products alphabetically by default, then apply user-selected sorts
  const sortedItems = [...searchedProducts].sort((a, b) => {
    if (!sortKey) {
      // Default: sort alphabetically by name
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'name')
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
    if (sortKey === 'price') return ((a.price ?? 0) - (b.price ?? 0)) * dir;
    const an = a.stock == null,
      bn = b.stock == null;
    if (an && bn) return 0;
    if (an) return 1;
    if (bn) return -1;
    return ((a.stock as number) - (b.stock as number)) * dir;
  });

  // Get accurate category product count from tracked totals
  const categoryProductCount = (catId: string): number => {
    // Return tracked total if available (most accurate)
    if (categoryTotalCounts[catId] !== undefined) {
      return categoryTotalCounts[catId];
    }
    // Fallback: count from current data
    return allItems.filter((p) => getRefId(p.categoryId) === catId).length;
  };

  // Group products by subcategory and sort each group alphabetically
  const subCategoryGroups: Record<string, Product[]> = sortedItems.reduce<
    Record<string, Product[]>
  >((acc, p) => {
    const sub = getSubCategoryLabel(p) || 'General';
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(p);
    return acc;
  }, {});
  
  // Sort products within each subcategory alphabetically
  Object.keys(subCategoryGroups).forEach((key) => {
    const group = subCategoryGroups[key as keyof typeof subCategoryGroups];
    if (group) {
      group.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }
  });

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createProduct = async (payload: {
    name: string;
    price: string;
    mrp: string;
    discount: string;
    stock: string;
    unit: string;
    unitType: string;
    catId: string;
    subcategoryId: string;
    description: string;
    tags: string;
    variants: ProductVariant[];
    files: File[];
    variantFiles: { [variantIndex: number]: File | null };
  }) => {
    /**
     * SECURITY: Sanitize all product input fields
     */
    const sanitizedName = sanitizeFormInput(payload.name?.trim() || '', 100);
    const sanitizedPrice = String(sanitizeNumber(parseFloat(payload.price) || 0, 0, 999999));
    const sanitizedMrp = payload.mrp ? String(sanitizeNumber(parseFloat(payload.mrp) || 0, 0, 999999)) : '';
    const sanitizedDiscount = payload.discount ? String(sanitizeNumber(parseFloat(payload.discount) || 0, 0, 100)) : '';
    const sanitizedStock = payload.stock ? String(sanitizeNumber(parseFloat(payload.stock) || 0, 0, 999999)) : '';
    const sanitizedUnit = sanitizeFormInput(payload.unit?.trim() || '', 50);
    const sanitizedUnitType = sanitizeFormInput(payload.unitType?.trim() || '', 50);
    const sanitizedDescription = sanitizeFormInput(payload.description?.trim() || '', 500);
    const sanitizedTags = sanitizeSearchQuery(payload.tags?.trim() || '', 200);

    if (!sanitizedName || !sanitizedPrice) throw new Error('Name and price are required');

    const norm = normalizeVariantsForPayload(payload.variants, payload.unit);
    const defV = norm.find((v) => v.isDefault) || norm[0];
    const price = sanitizedPrice || (defV ? String(defV.price) : '');
    if (!sanitizedName || !price) throw new Error('Name and price are required');

    setCreating(true);
    try {
      setError(null);
      const fd = new FormData();
      fd.append('name', sanitizedName);
      fd.append('price', price);
      if (payload.catId) fd.append('categoryId', payload.catId);
      if (payload.subcategoryId) fd.append('subcategoryId', payload.subcategoryId);
      if (sanitizedMrp) fd.append('mrp', sanitizedMrp);
      if (sanitizedDiscount) fd.append('discount', sanitizedDiscount);
      if (sanitizedStock) fd.append('stock', sanitizedStock);
      if (norm.length) fd.append('variants', JSON.stringify(norm));
      fd.append('unit', sanitizedUnit);
      if (sanitizedUnitType) fd.append('unitType', sanitizedUnitType);
      if (sanitizedDescription) fd.append('description', sanitizedDescription);
      if (sanitizedTags) fd.append('tags', sanitizedTags);
      payload.files.forEach((f) => fd.append('images', f));
      // Append variant images using the same field name (multer.fields expects `variantImages`)
      Object.values(payload.variantFiles).forEach((file) => {
        if (file) {
          fd.append('variantImages', file);
        }
      });
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load(1);
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('createProduct', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    } finally {
      setCreating(false);
    }
  };

  const updateProduct = async (
    productId: string,
    payload: {
      name: string;
      price: string;
      mrp: string;
      discount: string;
      stock: string;
      catId: string;
      subcategoryId: string;
      existingImages: string[];
      newFiles: File[];
      variants: ProductVariant[];
      unit: string;
      unitType: string;
    }
  ) => {
    /**
     * SECURITY: Sanitize all product input fields
     */
    const sanitizedName = sanitizeFormInput(payload.name?.trim() || '', 100);
    const sanitizedPrice = String(sanitizeNumber(parseFloat(payload.price) || 0, 0, 999999));
    const sanitizedMrp = payload.mrp ? String(sanitizeNumber(parseFloat(payload.mrp) || 0, 0, 999999)) : '';
    const sanitizedDiscount = payload.discount ? String(sanitizeNumber(parseFloat(payload.discount) || 0, 0, 100)) : '';
    const sanitizedStock = payload.stock ? String(sanitizeNumber(parseFloat(payload.stock) || 0, 0, 999999)) : '';
    const sanitizedUnit = sanitizeFormInput(payload.unit?.trim() || '', 50);
    const sanitizedUnitType = sanitizeFormInput(payload.unitType?.trim() || '', 50);

    if (!sanitizedName) throw new Error('Product name is required');
    if (!sanitizedPrice) throw new Error('Price is required');

    const norm = normalizeVariantsForPayload(payload.variants, payload.unit);

    setUpdating(true);
    try {
      setError(null);
      if (payload.newFiles.length > 0) {
        const fd = new FormData();
        fd.append('name', sanitizedName);
        fd.append('price', String(Number(sanitizedPrice)));
        if (sanitizedMrp) fd.append('mrp', String(Number(sanitizedMrp)));
        if (sanitizedDiscount) fd.append('discount', String(Number(sanitizedDiscount)));
        if (sanitizedStock) fd.append('stock', String(Number(sanitizedStock)));
        fd.append('unit', sanitizedUnit);
        if (sanitizedUnitType) fd.append('unitType', sanitizedUnitType);
        fd.append('variants', JSON.stringify(norm));
        if (payload.catId) fd.append('categoryId', payload.catId);
        fd.append('subcategoryId', payload.subcategoryId || '');
        if (payload.existingImages.length) fd.append('images', payload.existingImages.join(','));
        payload.newFiles.forEach((f) => fd.append('images', f));
        await api.patch(`/products/${productId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const body: any = {
          name: sanitizedName,
          price: Number(sanitizedPrice),
          unit: sanitizedUnit,
          variants: norm,
          subcategoryId: payload.subcategoryId,
        };
        if (sanitizedMrp) body.mrp = Number(sanitizedMrp);
        if (sanitizedDiscount) body.discount = Number(sanitizedDiscount);
        if (sanitizedStock) body.stock = Number(sanitizedStock);
        if (sanitizedUnitType) body.unitType = sanitizedUnitType;
        if (payload.catId) body.categoryId = payload.catId;
        await api.patch(`/products/${productId}`, body);
      }
      await load(page);
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('updateProduct', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    } finally {
      setUpdating(false);
    }
  };

  const deleteProduct = async (id: string): Promise<string> => {
    try {
      setError(null);
      const res = await api.delete(`/products/${id}`);
      await load(page);
      const payload = res?.data?.data;
      return String(payload?.deletedId || payload?.deleted?._id || id);
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('deleteProduct', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    }
  };

  const removeProductImage = async (productId: string, imageUrl: string) => {
    try {
      setError(null);
      await api.delete(`/products/${productId}/image`, { data: { imageUrl } });
      await load(page);
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('removeProductImage', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    }
  };

  const importCSV = async (csvText: string): Promise<number> => {
    setImporting(true);
    try {
      setError(null);
      const lines = csvText.trim().split('\n');
      const importItems = lines
        .map((l) => {
          const p = l.split('\t');
          if (p.length < 2) return null;
          return {
            name: p[0],
            price: Number(p[1]),
            stock: p[2] ? Number(p[2]) : undefined,
            category: p[3],
            description: p[4],
          };
        })
        .filter(Boolean);
      const res = await api.post('/products/import', { items: importItems });
      await load(1);
      return res.data?.data?.imported ?? 0;
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('importCSV', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    } finally {
      setImporting(false);
    }
  };

  const hasPerm = (p: string) => permissions.includes(p);

  return {
    error,
    allItems,
    sortedItems,
    subCategoryGroups,
    categories,
    parentCategories,
    subCategoriesOf,
    selectedCatId,
    setSelectedCatId,
    categoryProductCount,
    permissions,
    hasPerm,
    page,
    total,
    totalPages: Math.ceil(total / LIMIT),
    LIMIT,
    search,
    setSearch,
    stockFilter,
    setStockFilter,
    sortKey,
    sortOrder,
    toggleSort,
    refreshing,
    lastRefreshedAt,
    creating,
    updating,
    importing,
    categoryTotalCounts,
    loadCategoryProductCounts,
    load,
    manualRefresh,
    reloadCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    removeProductImage,
    importCSV,
    getCategoryLabel,
    getSubCategoryLabel,
  };
}
