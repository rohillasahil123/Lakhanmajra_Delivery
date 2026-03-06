import { useState, useEffect, useCallback } from 'react';
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

export type SortKey    = 'name' | 'price' | 'stock' | null;
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

export const toNumber = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const calculateDiscountPercent = (mrpVal: string, priceVal: string): string => {
  const m = toNumber(mrpVal), p = toNumber(priceVal);
  if (m === null || p === null || m <= 0 || p < 0 || p > m) return '';
  return String(Math.round(((m - p) / m) * 100));
};

export const getRefId = (ref: string | { _id?: string; name?: string } | null | undefined): string => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id || '';
};

export const getRefName = (ref: string | { _id?: string; name?: string } | null | undefined): string => {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.name) return ref.name;
  return '';
};

export const normalizeVariantsForPayload = (raw: ProductVariant[], selectedUnit?: string) => {
  const cleaned = raw.map((v) => {
    const label = v.label.trim(), pv = toNumber(v.price), sv = toNumber(v.stock), mv = toNumber(v.mrp);
    if (!label || pv === null || sv === null) return null;
    const rm = mv === null ? pv : mv;
    return {
      ...(v._id ? { _id: v._id } : {}),
      label, price: pv, mrp: rm,
      discount: Number(calculateDiscountPercent(String(rm), String(pv)) || 0),
      stock: Math.max(0, Math.floor(sv)),
      unit: String(v.unit || selectedUnit || 'piece').toLowerCase(),
      unitType: label, isDefault: Boolean(v.isDefault),
    };
  }).filter(Boolean) as any[];

  if (!cleaned.length) return [];
  const di = cleaned.findIndex((v) => v.isDefault);
  return cleaned.map((v, i) => ({ ...v, isDefault: i === (di >= 0 ? di : 0) }));
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
  const [selectedCatId,   setSelectedCatId]   = useState<string | null>(null);
  const [creating,        setCreating]        = useState(false);
  const [updating,        setUpdating]        = useState(false);
  const [importing,       setImporting]       = useState(false);

  const LIMIT = 50;

  // ── Category helpers ──────────────────────────────────────────────────────

  const getParentCategoryId = (c: Category): string | null => {
    if (!c.parentCategory) return null;
    if (typeof c.parentCategory === 'string') return c.parentCategory;
    return c.parentCategory._id || null;
  };

  const parentCategories = categories.filter((c) => !getParentCategoryId(c));
  const subCategoriesOf  = (pid: string) => categories.filter((c) => getParentCategoryId(c) === pid);

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

  const load = async (pageNum = 1) => {
    try {
      const q = new URLSearchParams();
      q.set('page', String(pageNum)); q.set('limit', String(LIMIT)); q.set('_ts', String(Date.now()));
      if (search.trim())         q.set('q', search.trim());
      if (stockFilter === 'out') q.set('stockStatus', 'out');
      const res  = await api.get(`/products?${q.toString()}`);
      const data = res.data?.data ?? res.data;
      setAllItems(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
      setLastRefreshedAt(new Date());
    } catch (err) { console.error(err); setAllItems([]); }
  };

  // ── Load categories (called externally after modal changes) ───────────────

  const reloadCategories = useCallback(async () => {
    try {
      const res  = await api.get('/categories');
      const data = res.data?.data ?? res.data ?? [];
      setCategories(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  const manualRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([load(page), reloadCategories()]); }
    finally { setRefreshing(false); }
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        await reloadCategories();
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

  // ── Sort ──────────────────────────────────────────────────────────────────

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) { setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(key); setSortOrder('asc');
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryProducts = selectedCatId
    ? allItems.filter((p) => getRefId(p.categoryId) === selectedCatId)
    : allItems;

  const searchedProducts = search.trim()
    ? categoryProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : categoryProducts;

  const sortedItems = [...searchedProducts].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'name')  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
    if (sortKey === 'price') return ((a.price ?? 0) - (b.price ?? 0)) * dir;
    const an = a.stock == null, bn = b.stock == null;
    if (an && bn) return 0; if (an) return 1; if (bn) return -1;
    return ((a.stock as number) - (b.stock as number)) * dir;
  });

  const categoryProductCount = (catId: string) =>
    allItems.filter((p) => getRefId(p.categoryId) === catId).length;

  const subCategoryGroups: Record<string, Product[]> = sortedItems.reduce<Record<string, Product[]>>(
    (acc, p) => {
      const sub = getSubCategoryLabel(p) || 'General';
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(p);
      return acc;
    }, {},
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createProduct = async (payload: {
    name: string; price: string; mrp: string; discount: string;
    stock: string; unit: string; unitType: string; catId: string;
    subcategoryId: string; description: string; tags: string;
    variants: ProductVariant[]; files: File[];
  }) => {
    const norm  = normalizeVariantsForPayload(payload.variants, payload.unit);
    const defV  = norm.find((v) => v.isDefault) || norm[0];
    const price = payload.price || (defV ? String(defV.price) : '');
    if (!payload.name || !price) throw new Error('Name and price are required');

    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('name', payload.name); fd.append('price', price);
      if (payload.catId)        fd.append('categoryId',    payload.catId);
      if (payload.subcategoryId) fd.append('subcategoryId', payload.subcategoryId);
      if (payload.mrp)          fd.append('mrp',           payload.mrp);
      if (payload.discount)     fd.append('discount',      payload.discount);
      if (payload.stock)        fd.append('stock',         payload.stock);
      if (norm.length)          fd.append('variants',      JSON.stringify(norm));
      fd.append('unit', payload.unit);
      if (payload.unitType)     fd.append('unitType',      payload.unitType);
      if (payload.description)  fd.append('description',   payload.description);
      if (payload.tags)         fd.append('tags',          payload.tags);
      payload.files.forEach((f) => fd.append('images', f));
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load(1);
    } finally { setCreating(false); }
  };

  const updateProduct = async (productId: string, payload: {
    name: string; price: string; mrp: string; discount: string;
    stock: string; catId: string; subcategoryId: string;
    existingImages: string[]; newFiles: File[];
    variants: ProductVariant[]; unit: string;
  }) => {
    const norm  = normalizeVariantsForPayload(payload.variants, payload.unit);
    const defV  = norm.find((v) => v.isDefault) || norm[0];
    const price = payload.price || (defV ? String(defV.price) : '');
    if (!payload.name.trim()) throw new Error('Product name is required');
    if (!price)               throw new Error('Price is required');

    setUpdating(true);
    try {
      if (payload.newFiles.length > 0) {
        const fd = new FormData();
        fd.append('name', payload.name.trim()); fd.append('price', String(Number(price)));
        if (payload.mrp.trim())      fd.append('mrp',      String(Number(payload.mrp)));
        if (payload.discount.trim()) fd.append('discount', String(Number(payload.discount)));
        if (payload.stock.trim())    fd.append('stock',    String(Number(payload.stock)));
        fd.append('variants', JSON.stringify(norm));
        if (payload.catId)           fd.append('categoryId',    payload.catId);
        fd.append('subcategoryId',   payload.subcategoryId || '');
        if (payload.existingImages.length) fd.append('images', payload.existingImages.join(','));
        payload.newFiles.forEach((f) => fd.append('images', f));
        await api.patch(`/products/${productId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const body: any = { name: payload.name.trim(), price: Number(price), variants: norm, subcategoryId: payload.subcategoryId };
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
      const importItems = lines.map((l) => {
        const p = l.split('\t');
        if (p.length < 2) return null;
        return { name: p[0], price: Number(p[1]), stock: p[2] ? Number(p[2]) : undefined, category: p[3], description: p[4] };
      }).filter(Boolean);
      const res = await api.post('/products/import', { items: importItems });
      await load(1);
      return res.data?.data?.imported ?? 0;
    } finally { setImporting(false); }
  };

  const hasPerm = (p: string) => permissions.includes(p);

  return {
    allItems, sortedItems, subCategoryGroups,
    categories, parentCategories, subCategoriesOf,
    selectedCatId, setSelectedCatId,
    categoryProductCount,
    permissions, hasPerm,
    page, total, totalPages: Math.ceil(total / LIMIT), LIMIT,
    search, setSearch,
    stockFilter, setStockFilter,
    sortKey, sortOrder, toggleSort,
    refreshing, lastRefreshedAt,
    creating, updating, importing,
    load, manualRefresh, reloadCategories,
    createProduct, updateProduct,
    deleteProduct, removeProductImage,
    importCSV,
    getCategoryLabel, getSubCategoryLabel,
  };
}