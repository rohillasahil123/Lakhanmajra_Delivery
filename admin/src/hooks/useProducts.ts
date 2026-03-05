import { useState, useEffect } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductVariant = {
  _id?: string;
  label: string;
  price: string;
  mrp: string;
  discount: string;
  stock: string;
  unit?: string;
  unitType?: string;
  isDefault?: boolean;
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
  kg:    ['250 g', '500 g', '1 kg', '2 kg', '5 kg'],
  g:     ['50 g', '100 g', '200 g', '500 g'],
  l:     ['250 ml', '500 ml', '1 L', '2 L', '5 L'],
  ml:    ['100 ml', '200 ml', '500 ml', '750 ml'],
  pack:  ['1 pack', '2 pack', '5 pack', '10 pack'],
};

export const AUTO_REFRESH_MS = 10_000;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export const createEmptyVariant = (): ProductVariant => ({
  label: '', price: '', mrp: '', discount: '', stock: '', isDefault: false,
});

export const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const calculateDiscountPercent = (mrpValue: string, priceValue: string): string => {
  const mrp   = toNumber(mrpValue);
  const price = toNumber(priceValue);
  if (mrp === null || price === null || mrp <= 0 || price < 0 || price > mrp) return '';
  return String(Math.round(((mrp - price) / mrp) * 100));
};

export const getRefId = (
  ref: string | { _id?: string; name?: string } | null | undefined,
): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id || '';
};

export const getRefName = (
  ref: string | { _id?: string; name?: string } | null | undefined,
): string => {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.name) return ref.name;
  return '';
};

export const normalizeVariantsForPayload = (
  rawVariants: ProductVariant[],
  selectedUnit?: string,
) => {
  const cleaned = rawVariants
    .map((v) => {
      const label    = v.label.trim();
      const priceVal = toNumber(v.price);
      const stockVal = toNumber(v.stock);
      const mrpVal   = toNumber(v.mrp);
      if (!label || priceVal === null || stockVal === null) return null;
      const resolvedMrp = mrpVal === null ? priceVal : mrpVal;
      return {
        ...(v._id ? { _id: v._id } : {}),
        label,
        price:     priceVal,
        mrp:       resolvedMrp,
        discount:  Number(calculateDiscountPercent(String(resolvedMrp), String(priceVal)) || 0),
        stock:     Math.max(0, Math.floor(stockVal)),
        unit:      String(v.unit || selectedUnit || 'piece').toLowerCase(),
        unitType:  label,
        isDefault: Boolean(v.isDefault),
      };
    })
    .filter(Boolean) as Array<any>;

  if (cleaned.length === 0) return [];
  const defIdx = cleaned.findIndex((v) => v.isDefault);
  return cleaned.map((v, i) => ({ ...v, isDefault: i === (defIdx >= 0 ? defIdx : 0) }));
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProducts() {
  const [allItems,        setAllItems]        = useState<Product[]>([]);
  const [categories,      setCategories]      = useState<Category[]>([]);
  const [permissions,     setPermissions]     = useState<string[]>([]);
  const [page,            setPage]            = useState(1);
  const [total,           setTotal]           = useState(0);
  const [search,          setSearch]          = useState('');
  const [stockFilter,     setStockFilter]     = useState<StockFilter>('all');
  const [sortKey,         setSortKey]         = useState<SortKey>(null);
  const [sortOrder,       setSortOrder]       = useState<'asc' | 'desc'>('asc');
  const [refreshing,      setRefreshing]      = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // selected category for drill-down view
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // busy flags
  const [creating,  setCreating]  = useState(false);
  const [updating,  setUpdating]  = useState(false);
  const [importing, setImporting] = useState(false);

  const LIMIT = 50; // load more per page when inside a category

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getParentCategoryId = (cat: Category): string | null => {
    if (!cat.parentCategory) return null;
    if (typeof cat.parentCategory === 'string') return cat.parentCategory;
    return cat.parentCategory._id || null;
  };

  const parentCategories = categories.filter((c) => !getParentCategoryId(c));
  const subCategoriesOf  = (parentId: string) =>
    categories.filter((c) => getParentCategoryId(c) === parentId);

  const getCategoryLabel = (product: Product): string => {
    const direct = getRefName(product.categoryId);
    if (direct) return direct;
    const id = getRefId(product.categoryId);
    return categories.find((c) => c._id === id)?.name || '—';
  };

  const getSubCategoryLabel = (product: Product): string => {
    const direct = getRefName(product.subcategoryId);
    if (direct) return direct;
    const id = getRefId(product.subcategoryId);
    return categories.find((c) => c._id === id)?.name || '—';
  };

  // ── Load all products ─────────────────────────────────────────────────────

  const load = async (pageNum = 1) => {
    try {
      const q = new URLSearchParams();
      q.set('page',  String(pageNum));
      q.set('limit', String(LIMIT));
      q.set('_ts',   String(Date.now()));
      if (search.trim())         q.set('q',           search.trim());
      if (stockFilter === 'out') q.set('stockStatus', 'out');

      const res  = await api.get(`/products?${q.toString()}`);
      const data = res.data?.data ?? res.data;
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAllItems(rows);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error(err);
      setAllItems([]);
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try { await load(page); }
    finally { setRefreshing(false); }
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        const catsRes = await api.get('/categories');
        const apiCats = catsRes.data?.data ?? catsRes.data ?? [];
        setCategories(Array.isArray(apiCats) ? apiCats : []);
        await load(1);
      } catch (err) { console.error(err); }
    })();
  }, []);

  useEffect(() => { load(1); }, [stockFilter]);

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (creating || updating || importing) return;
    const id = setInterval(() => load(page), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [page, search, stockFilter, creating, updating, importing]);

  // ── Filtering & sorting ───────────────────────────────────────────────────

  // Products filtered by selected category
  const categoryProducts: Product[] = selectedCategoryId
    ? allItems.filter((p) => getRefId(p.categoryId) === selectedCategoryId)
    : allItems;

  // Client-side search within selected category view
  const searchedProducts: Product[] = search.trim()
    ? categoryProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : categoryProducts;

  const sortedItems = [...searchedProducts].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'name')  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
    if (sortKey === 'price') return ((a.price ?? 0) - (b.price ?? 0)) * dir;
    const aNull = a.stock == null, bNull = b.stock == null;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    return ((a.stock as number) - (b.stock as number)) * dir;
  });

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) { setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(key);
    setSortOrder('asc');
  };

  // Count products per parent category
  const categoryProductCount = (catId: string): number =>
    allItems.filter((p) => getRefId(p.categoryId) === catId).length;

  // Sub-category breakdown within selected category
  const subCategoryGroups: Record<string, Product[]> = sortedItems.reduce<Record<string, Product[]>>(
    (acc, p) => {
      const subName = getSubCategoryLabel(p) || 'General';
      if (!acc[subName]) acc[subName] = [];
      acc[subName].push(p);
      return acc;
    },
    {},
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createProduct = async (payload: {
    name: string; price: string; mrp: string; discount: string;
    stock: string; unit: string; unitType: string; catId: string;
    subcategoryId: string; description: string; tags: string;
    variants: ProductVariant[]; files: File[];
  }) => {
    const normalized    = normalizeVariantsForPayload(payload.variants, payload.unit);
    const defaultVar    = normalized.find((v) => v.isDefault) || normalized[0];
    const resolvedPrice = payload.price || (defaultVar ? String(defaultVar.price) : '');
    if (!payload.name || !resolvedPrice || !payload.catId)
      throw new Error('Name, price, and category are required');

    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('name',     payload.name);
      fd.append('price',    resolvedPrice);
      fd.append('categoryId', payload.catId);
      if (payload.subcategoryId) fd.append('subcategoryId', payload.subcategoryId);
      if (payload.mrp)         fd.append('mrp',         payload.mrp);
      if (payload.discount)    fd.append('discount',    payload.discount);
      if (payload.stock)       fd.append('stock',       payload.stock);
      if (normalized.length)   fd.append('variants',    JSON.stringify(normalized));
      fd.append('unit', payload.unit);
      if (payload.unitType)    fd.append('unitType',    payload.unitType);
      if (payload.description) fd.append('description', payload.description);
      if (payload.tags)        fd.append('tags',        payload.tags);
      payload.files.forEach((f) => fd.append('images', f));
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load(1);
    } finally { setCreating(false); }
  };

  const updateProduct = async (
    productId: string,
    payload: {
      name: string; price: string; mrp: string; discount: string;
      stock: string; catId: string; subcategoryId: string;
      existingImages: string[]; newFiles: File[];
      variants: ProductVariant[]; unit: string;
    },
  ) => {
    const normalized    = normalizeVariantsForPayload(payload.variants, payload.unit);
    const defaultVar    = normalized.find((v) => v.isDefault) || normalized[0];
    const resolvedPrice = payload.price || (defaultVar ? String(defaultVar.price) : '');
    if (!payload.name.trim()) throw new Error('Product name is required');
    if (!resolvedPrice)       throw new Error('Price is required');

    setUpdating(true);
    try {
      if (payload.newFiles.length > 0) {
        const fd = new FormData();
        fd.append('name',  payload.name.trim());
        fd.append('price', String(Number(resolvedPrice)));
        if (payload.mrp.trim())      fd.append('mrp',      String(Number(payload.mrp)));
        if (payload.discount.trim()) fd.append('discount', String(Number(payload.discount)));
        if (payload.stock.trim())    fd.append('stock',    String(Number(payload.stock)));
        fd.append('variants', JSON.stringify(normalized));
        if (payload.catId)           fd.append('categoryId',   payload.catId);
        fd.append('subcategoryId',   payload.subcategoryId || '');
        if (payload.existingImages.length) fd.append('images', payload.existingImages.join(','));
        payload.newFiles.forEach((f) => fd.append('images', f));
        await api.patch(`/products/${productId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const body: any = {
          name:          payload.name.trim(),
          price:         Number(resolvedPrice),
          variants:      normalized,
          subcategoryId: payload.subcategoryId,
        };
        if (payload.mrp.trim())      body.mrp      = Number(payload.mrp);
        if (payload.discount.trim()) body.discount = Number(payload.discount);
        if (payload.stock.trim())    body.stock    = Number(payload.stock);
        if (payload.catId)           body.categoryId = payload.catId;
        await api.patch(`/products/${productId}`, body);
      }
      await load(page);
    } finally { setUpdating(false); }
  };

  const deleteProduct = async (id: string) => {
    await api.delete(`/products/${id}`);
    await load(page);
  };

  const removeProductImage = async (productId: string, imageUrl: string) => {
    await api.delete(`/products/${productId}/image`, { data: { imageUrl } });
    await load(page);
  };

  const importCSV = async (csvText: string): Promise<number> => {
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const importItems = lines
        .map((line) => {
          const parts = line.split('\t');
          if (parts.length < 2) return null;
          return { name: parts[0], price: Number(parts[1]), stock: parts[2] ? Number(parts[2]) : undefined, category: parts[3], description: parts[4] };
        })
        .filter(Boolean);
      const res = await api.post('/products/import', { items: importItems });
      await load(1);
      return res.data?.data?.imported ?? 0;
    } finally { setImporting(false); }
  };

  const hasPerm = (p: string) => permissions.includes(p);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    allItems, sortedItems, subCategoryGroups,
    categories, parentCategories, subCategoriesOf,
    selectedCategoryId, setSelectedCategoryId,
    categoryProductCount,
    permissions, hasPerm,
    page, total, totalPages: Math.ceil(total / LIMIT), LIMIT,
    search, setSearch,
    stockFilter, setStockFilter,
    sortKey, sortOrder, toggleSort,
    refreshing, lastRefreshedAt,
    creating, updating, importing,
    load, manualRefresh,
    createProduct, updateProduct,
    deleteProduct, removeProductImage,
    importCSV,
    getCategoryLabel, getSubCategoryLabel,
  };
}