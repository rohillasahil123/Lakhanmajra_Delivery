import React, { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type ProductVariant = {
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

type Product = {
  _id: string;
  name: string;
  price: number;
  discount?: number;
  stock?: number;
  unit?: string;
  unitType?: string;
  images?: string[];
  isActive?: boolean;
  categoryId?: string | { _id?: string; name?: string } | null;
  subcategoryId?: string | { _id?: string; name?: string } | null;
  variants?: ProductVariant[];
};

type Category = {
  _id: string;
  name: string;
  parentCategory?: string | { _id?: string } | null;
};
type SortKey = 'name' | 'price' | 'stock' | null;

const UNIT_VARIANTS: Record<string, string[]> = {
  piece: ['1 pc', '2 pcs', '5 pcs', '10 pcs'],
  kg: ['250 g', '500 g', '1 kg', '2 kg', '5 kg'],
  g: ['50 g', '100 g', '200 g', '500 g'],
  l: ['250 ml', '500 ml', '1 L', '2 L', '5 L'],
  ml: ['100 ml', '200 ml', '500 ml', '750 ml'],
  pack: ['1 pack', '2 pack', '5 pack', '10 pack'],
};

const AUTO_REFRESH_MS = 10000;

const createEmptyVariant = (): ProductVariant => ({
  label: '',
  price: '',
  mrp: '',
  discount: '',
  stock: '',
  isDefault: false,
});

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateDiscountPercent = (mrpValue: string, priceValue: string): string => {
  const mrpNumber = toNumber(mrpValue);
  const priceNumber = toNumber(priceValue);

  if (mrpNumber === null || priceNumber === null || mrpNumber <= 0 || priceNumber < 0 || priceNumber > mrpNumber) {
    return '';
  }

  const discountPercent = ((mrpNumber - priceNumber) / mrpNumber) * 100;
  return String(Math.round(discountPercent));
};

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'out'>('all');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [editCatId, setEditCatId] = useState('');
  const [editSubcategoryId, setEditSubcategoryId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Create form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState<'piece' | 'kg' | 'g' | 'l' | 'ml' | 'pack'>('piece');
  const [unitType, setUnitType] = useState('1 pc');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [catId, setCatId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV import
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const load = async (pageNum = 1) => {
    try {
      const query = new URLSearchParams();
      query.set('page', String(pageNum));
      query.set('limit', String(limit));
      query.set('_ts', String(Date.now()));
      if (search.trim()) query.set('q', search.trim());
      if (stockFilter === 'out') query.set('stockStatus', 'out');

      const res = await api.get(`/products?${query.toString()}`);
      const data = res.data?.data ?? res.data;
      setItems(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await load(page);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [stockFilter]);

  useEffect(() => {
    const isBusy = !!editingId || creating || importing || updating;
    if (isBusy) return;

    const intervalId = setInterval(() => {
      load(page);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [page, search, stockFilter, editingId, creating, importing, updating]);

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        const catsRes = await api.get('/categories');
        const apiCats = catsRes.data?.data ?? catsRes.data ?? [];
        setCategories([...(Array.isArray(apiCats) ? apiCats : [])]);
        await load(1);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('asc');
  };

  const getSortIndicator = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getRefId = (ref: string | { _id?: string; name?: string } | null | undefined): string => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref._id || '';
  };

  const getRefName = (ref: string | { _id?: string; name?: string } | null | undefined): string => {
    if (!ref) return '';
    if (typeof ref === 'object' && ref.name) return ref.name;
    return '';
  };

  const getCategoryNameById = (id: string): string => {
    if (!id) return '—';
    return categories.find((category) => category._id === id)?.name || '—';
  };

  const getCategoryLabel = (product: Product): string => {
    const directName = getRefName(product.categoryId);
    if (directName) return directName;
    return getCategoryNameById(getRefId(product.categoryId));
  };

  const getSubCategoryLabel = (product: Product): string => {
    const directName = getRefName(product.subcategoryId);
    if (directName) return directName;
    return getCategoryNameById(getRefId(product.subcategoryId));
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0;

    const direction = sortOrder === 'asc' ? 1 : -1;

    if (sortKey === 'name') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * direction;
    }

    if (sortKey === 'price') {
      return ((a.price ?? 0) - (b.price ?? 0)) * direction;
    }

    const aStockMissing = a.stock === undefined || a.stock === null;
    const bStockMissing = b.stock === undefined || b.stock === null;

    if (aStockMissing && bStockMissing) return 0;
    if (aStockMissing) return 1;
    if (bStockMissing) return -1;

    return ((a.stock as number) - (b.stock as number)) * direction;
  });

  // ── Handle file selection & previews ────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Max 5 images
    const merged = [...selectedFiles, ...files].slice(0, 5);
    setSelectedFiles(merged);

    // Generate preview URLs
    const previews = merged.map((f) => URL.createObjectURL(f));
    setPreviewUrls(previews);
  };

  const removeSelectedFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setPreviewUrls(updated.map((f) => URL.createObjectURL(f)));
  };

  const normalizeVariantsForPayload = (rawVariants: ProductVariant[], selectedUnit?: string) => {
    const cleaned = rawVariants
      .map((variant) => {
        const label = variant.label.trim();
        const priceValue = toNumber(variant.price);
        const stockValue = toNumber(variant.stock);
        const mrpValue = toNumber(variant.mrp);
        if (!label || priceValue === null || stockValue === null) return null;

        const resolvedMrp = mrpValue === null ? priceValue : mrpValue;

        return {
          ...(variant._id ? { _id: variant._id } : {}),
          label,
          price: priceValue,
          mrp: resolvedMrp,
          discount: Number(calculateDiscountPercent(String(resolvedMrp), String(priceValue)) || 0),
          stock: Math.max(0, Math.floor(stockValue)),
          unit: String(variant.unit || selectedUnit || 'piece').toLowerCase(),
          unitType: label,
          isDefault: Boolean(variant.isDefault),
        };
      })
      .filter(Boolean) as Array<any>;

    if (cleaned.length === 0) return [];
    const defaultIndex = cleaned.findIndex((variant) => variant.isDefault);
    const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;
    return cleaned.map((variant, index) => ({ ...variant, isDefault: index === resolvedDefaultIndex }));
  };

  const resetForm = () => {
    setName(''); setPrice(''); setMrp(''); setDiscount(''); setStock('');
    setUnit('piece'); setUnitType('1 pc');
    setVariants([]);
    setCatId(''); setSubcategoryId(''); setDescription(''); setTags('');
    setSelectedFiles([]); setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getParentCategoryId = (category: Category): string | null => {
    if (!category.parentCategory) return null;
    if (typeof category.parentCategory === 'string') return category.parentCategory;
    return category.parentCategory._id || null;
  };

  const parentCategories = categories.filter((category) => !getParentCategoryId(category));
  const subCategories = categories.filter((category) => getParentCategoryId(category) === catId);
  const editSubCategories = categories.filter((category) => getParentCategoryId(category) === editCatId);

  const startEdit = (product: Product) => {
    setEditingId(product._id);
    setEditName(product.name || '');
    setEditPrice(String(product.price ?? ''));
    setEditMrp(String((product as any).mrp ?? ''));
    setEditDiscount(calculateDiscountPercent(String((product as any).mrp ?? ''), String(product.price ?? '')));
    setEditStock(String(product.stock ?? ''));
    setEditImages(Array.isArray(product.images) ? product.images : []);
    setEditSelectedFiles([]);
    setEditPreviewUrls([]);
    const sourceVariants = Array.isArray((product as any).variants) ? (product as any).variants : [];
    setEditVariants(
      sourceVariants.map((variant: any, index: number) => ({
        _id: variant?._id ? String(variant._id) : undefined,
        label: String(variant?.label || variant?.unitType || ''),
        price: String(variant?.price ?? ''),
        mrp: String(variant?.mrp ?? ''),
        discount: String(
          variant?.discount ?? calculateDiscountPercent(String(variant?.mrp ?? ''), String(variant?.price ?? ''))
        ),
        stock: String(variant?.stock ?? ''),
        unit: String(variant?.unit || product.unit || 'piece'),
        unitType: String(variant?.unitType || variant?.label || ''),
        isDefault: Boolean(variant?.isDefault || index === 0),
      }))
    );
    const categoryRefId = getRefId(product.categoryId);
    const subcategoryRefId = getRefId(product.subcategoryId);
    setEditCatId(categoryRefId);
    setEditSubcategoryId(subcategoryRefId);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
    setEditMrp('');
    setEditDiscount('');
    setEditStock('');
    setEditImages([]);
    setEditSelectedFiles([]);
    setEditPreviewUrls([]);
    setEditVariants([]);
    setEditCatId('');
    setEditSubcategoryId('');
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEditSelectedFiles(files);
    setEditPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) return alert('Product name is required');
    const normalizedEditVariants = normalizeVariantsForPayload(editVariants, unit);
    const defaultEditVariant = normalizedEditVariants.find((variant) => variant.isDefault) || normalizedEditVariants[0];
    const resolvedEditPrice = editPrice.trim() || (defaultEditVariant ? String(defaultEditVariant.price) : '');
    if (!resolvedEditPrice) return alert('Price is required');

    setUpdating(true);
    try {
      if (editSelectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('name', editName.trim());
        formData.append('price', String(Number(resolvedEditPrice)));
        if (editMrp.trim() !== '') formData.append('mrp', String(Number(editMrp)));
        if (editDiscount.trim() !== '') formData.append('discount', String(Number(editDiscount)));
        if (editStock.trim() !== '') formData.append('stock', String(Number(editStock)));
        formData.append('variants', JSON.stringify(normalizedEditVariants));
        if (editCatId) formData.append('categoryId', editCatId);
        formData.append('subcategoryId', editSubcategoryId || '');
        if (editImages.length > 0) formData.append('images', editImages.join(','));
        editSelectedFiles.forEach((file) => formData.append('images', file));

        await api.patch(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload: any = {
          name: editName.trim(),
          price: Number(resolvedEditPrice),
        };

        if (editMrp.trim() !== '') payload.mrp = Number(editMrp);
        if (editDiscount.trim() !== '') payload.discount = Number(editDiscount);
        if (editStock.trim() !== '') payload.stock = Number(editStock);
        payload.variants = normalizedEditVariants;
        if (editCatId) payload.categoryId = editCatId;
        payload.subcategoryId = editSubcategoryId;

        await api.patch(`/products/${editingId}`, payload);
      }

      cancelEdit();
      await load(page);
      alert('Product updated');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  // ── Create product ───────────────────────────────────────────────────────────
  const create = async () => {
    const normalizedVariants = normalizeVariantsForPayload(variants, unit);
    const defaultVariant = normalizedVariants.find((variant) => variant.isDefault) || normalizedVariants[0];
    const resolvedPrice = price || (defaultVariant ? String(defaultVariant.price) : '');

    if (!name || !resolvedPrice || !catId) return alert('Name, price, and category are required');
    setCreating(true);
    try {
      // Use FormData to send files + fields together
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', resolvedPrice);
      formData.append('categoryId', catId);
      if (subcategoryId) formData.append('subcategoryId', subcategoryId);
      if (mrp) formData.append('mrp', mrp);
      if (discount) formData.append('discount', discount);
      if (stock) formData.append('stock', stock);
      if (normalizedVariants.length > 0) formData.append('variants', JSON.stringify(normalizedVariants));
      formData.append('unit', unit);
      if (unitType) formData.append('unitType', unitType);
      if (description) formData.append('description', description);
      if (tags) formData.append('tags', tags); // comma-separated, backend splits

      // Append each image file under field name "images"
      selectedFiles.forEach((file) => formData.append('images', file));

      await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      resetForm();
      await load(1);
      alert('✅ Product created successfully!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete product ───────────────────────────────────────────────────────────
  const remove = async (id: string) => {
    if (!confirm('Delete this product? Its images will also be removed from storage.')) return;
    try {
      await api.delete(`/products/${id}`);
      await load(page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  // ── Delete single image from product ────────────────────────────────────────
  const removeImage = async (productId: string, imageUrl: string) => {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/products/${productId}/image`, { data: { imageUrl } });
      await load(page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Image delete failed');
    }
  };

  // ── CSV Import ───────────────────────────────────────────────────────────────
  const importCSV = async () => {
    if (!csvText.trim()) return alert('CSV text required');
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const importItems: any[] = [];
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;
        importItems.push({
          name: parts[0],
          price: Number(parts[1]),
          stock: parts[2] ? Number(parts[2]) : undefined,
          category: parts[3],
          description: parts[4],
        });
      }
      const res = await api.post('/products/import', { items: importItems });
      alert(`Imported ${res.data?.data?.imported ?? 0} products`);
      setCsvText('');
      await load(1);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Products</h2>
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-slate-50"
            onClick={handleManualRefresh}
            title="Refresh products"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <div className="text-right">
          <div className="text-sm text-slate-500">Total: {total}</div>
          <div className="text-xs text-slate-400">
            Auto-refresh: 10s{lastRefreshedAt ? ` • Updated ${lastRefreshedAt.toLocaleTimeString()}` : ''}
          </div>
          </div>
        </div>
      </div>

      {/* ── Create Product Form ─────────────────────────────────────────────── */}
      {hasPerm('products:create') && (
        <div className="mb-6 bg-white p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Create New Product</h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              className="border px-3 py-2 rounded col-span-2"
              placeholder="Product name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="border px-3 py-2 rounded"
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                setSubcategoryId('');
              }}
            >
              <option value="">Select category *</option>
              {parentCategories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <select
              className="border px-3 py-2 rounded"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!catId || subCategories.length === 0}
            >
              <option value="">
                {!catId
                  ? 'Select sub-category (optional)'
                  : subCategories.length === 0
                    ? 'No sub-categories'
                    : 'Select sub-category (optional)'}
              </option>
              {subCategories.map((subCategory) => (
                <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>
              ))}
            </select>
            <input
              className="border px-3 py-2 rounded"
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="Price (₹) *"
              type="number"
              value={price}
              onChange={(e) => {
                const nextPrice = e.target.value;
                setPrice(nextPrice);
                setDiscount(calculateDiscountPercent(mrp, nextPrice));
              }}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="MRP (₹)"
              type="number"
              value={mrp}
              onChange={(e) => {
                const nextMrp = e.target.value;
                setMrp(nextMrp);
                setDiscount(calculateDiscountPercent(nextMrp, price));
              }}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="Discount (%)"
              type="number"
              min={0}
              max={100}
              value={discount}
              readOnly
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="Stock quantity"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <select
              className="border px-3 py-2 rounded"
              value={unit}
              onChange={(e) => {
                const nextUnit = e.target.value as 'piece' | 'kg' | 'g' | 'l' | 'ml' | 'pack';
                setUnit(nextUnit);
                const defaults = UNIT_VARIANTS[nextUnit] || [];
                setUnitType(defaults[0] || '');
              }}
            >
              <option value="piece">Piece</option>
              <option value="kg">KG</option>
              <option value="g">Gram (g)</option>
              <option value="l">Liter (L)</option>
              <option value="ml">Milliliter (ml)</option>
              <option value="pack">Pack</option>
            </select>
            <select
              className="border px-3 py-2 rounded"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
            >
              {(UNIT_VARIANTS[unit] || []).map((variant) => (
                <option key={variant} value={variant}>{variant}</option>
              ))}
            </select>
            <textarea
              className="border px-3 py-2 rounded col-span-2 h-20 resize-none"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mb-4 border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-700">Variants (optional)</h4>
              <button
                type="button"
                className="text-sm px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                onClick={() => setVariants((prev) => {
                  const next = [...prev, createEmptyVariant()];
                  if (next.length === 1) next[0].isDefault = true;
                  return next;
                })}
              >
                + Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="text-xs text-slate-500">No variants added. You can keep single base product or add 500g / 1kg / 2kg variants.</div>
            ) : (
              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      className="border px-2 py-1 rounded col-span-3"
                      placeholder="Label (e.g. 500g)"
                      value={variant.label}
                      onChange={(e) => setVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value, unitType: e.target.value } : row))}
                    />
                    <input
                      className="border px-2 py-1 rounded col-span-2"
                      placeholder="Price"
                      type="number"
                      value={variant.price}
                      onChange={(e) => {
                        const nextPrice = e.target.value;
                        setVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, price: nextPrice, discount: calculateDiscountPercent(row.mrp, nextPrice) } : row));
                      }}
                    />
                    <input
                      className="border px-2 py-1 rounded col-span-2"
                      placeholder="MRP"
                      type="number"
                      value={variant.mrp}
                      onChange={(e) => {
                        const nextMrp = e.target.value;
                        setVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, mrp: nextMrp, discount: calculateDiscountPercent(nextMrp, row.price) } : row));
                      }}
                    />
                    <input
                      className="border px-2 py-1 rounded col-span-1"
                      placeholder="%"
                      type="number"
                      value={variant.discount}
                      readOnly
                    />
                    <input
                      className="border px-2 py-1 rounded col-span-2"
                      placeholder="Stock"
                      type="number"
                      value={variant.stock}
                      onChange={(e) => setVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, stock: e.target.value } : row))}
                    />
                    <div className="col-span-2 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded ${variant.isDefault ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                        onClick={() => setVariants((prev) => prev.map((row, rowIndex) => ({ ...row, isDefault: rowIndex === index })))}
                      >
                        {variant.isDefault ? 'Default' : 'Set Default'}
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-600"
                        onClick={() => setVariants((prev) => {
                          const next = prev.filter((_, rowIndex) => rowIndex !== index);
                          if (next.length > 0 && !next.some((row) => row.isDefault)) next[0].isDefault = true;
                          return next;
                        })}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

    {/* ── Image Upload ──────────────────────────────────────────────── */}
<div className="mb-4">

  {/* Properly associated label */}
  <label
    htmlFor="productImages"
    className="block text-sm font-medium text-slate-600 mb-2"
  >
    Product Images (max 5, each up to 5MB — JPEG/PNG/WEBP/SVG)
  </label>

  {/* Clickable upload area (label instead of div) */}
  <label
    htmlFor="productImages"
    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-sky-400 transition-colors block"
  >
    <p className="text-slate-500 text-sm">
      📷 Click to select images or drag & drop
    </p>

    <p className="text-slate-400 text-xs mt-1">
      {selectedFiles.length}/5 images selected
    </p>
  </label>

  {/* Hidden actual file input */}
  <input
    id="productImages"
    ref={fileInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
    multiple
    className="hidden"
    onChange={handleFileChange}
  />

  {/* Image Previews */}
  {previewUrls.length > 0 && (
    <div className="flex gap-3 mt-3 flex-wrap">
      {previewUrls.map((url, i) => (
        <div key={i} className="relative group">
          <img
            src={url}
            alt={`Selected product preview ${i + 1}`}
            className="w-20 h-20 object-cover rounded-lg border border-slate-200"
          />

          <button
            type="button"
            onClick={() => removeSelectedFile(i)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}

</div>

          <div className="flex gap-2">
            <button
              className="bg-sky-600 text-white px-5 py-2 rounded disabled:opacity-50"
              onClick={create}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Product'}
            </button>
            <button
              className="bg-slate-200 text-slate-700 px-5 py-2 rounded"
              onClick={resetForm}
            >
              Reset
            </button>
          </div>


        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
        <button className="bg-slate-600 text-white px-4 py-2 rounded" onClick={() => load(1)}>
          Search
        </button>
        <button
          className={`px-4 py-2 rounded border ${stockFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300'}`}
          onClick={() => setStockFilter('all')}
        >
          All
        </button>
        <button
          className={`px-4 py-2 rounded border ${stockFilter === 'out' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300'}`}
          onClick={() => setStockFilter('out')}
        >
          Out of Stock
        </button>
      </div>

      {/* ── Products Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">
                <button className="inline-flex items-center gap-1" onClick={() => toggleSort('name')}>
                  Name <span className="text-slate-500">{getSortIndicator('name')}</span>
                </button>
              </th>
              <th className="p-3">
                <button className="inline-flex items-center gap-1" onClick={() => toggleSort('price')}>
                  Price <span className="text-slate-500">{getSortIndicator('price')}</span>
                </button>
              </th>
              <th className="p-3">MRP</th>
              <th className="p-3">Discount %</th>
              <th className="p-3">Category</th>
              <th className="p-3">Sub-category</th>
              <th className="p-3">Variant</th>
              <th className="p-3">
                <button className="inline-flex items-center gap-1" onClick={() => toggleSort('stock')}>
                  Stock <span className="text-slate-500">{getSortIndicator('stock')}</span>
                </button>
              </th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-400">
                  No products found
                </td>
              </tr>
            ) : (
              sortedItems.map((p) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-slate-50">
                  {/* Product image thumbnail */}
                  <td className="p-3">
                    {editingId === p._id ? (
                      <div className="space-y-2">
                        {p.images && p.images.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {p.images.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={p.name}
                                className="w-12 h-12 object-cover rounded border border-slate-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://via.placeholder.com/48x48?text=No+Img';
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No current image</div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                          multiple
                          className="text-xs"
                          onChange={handleEditFileChange}
                        />
                        {editPreviewUrls.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {editPreviewUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`new-preview-${i}`}
                                className="w-12 h-12 object-cover rounded border border-emerald-300"
                              />
                            ))}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">New images save hone par add ho jayengi.</div>
                      </div>
                    ) : p.images && p.images.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {p.images.map((img, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={img}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://via.placeholder.com/48x48?text=No+Img';
                              }}
                            />
                            {hasPerm('products:update') && (
                              <button
                                onClick={() => removeImage(p._id, img)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-medium">
                    {editingId === p._id ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === p._id ? (
                      <input
                        className="border px-2 py-1 rounded w-28"
                        type="number"
                        value={editPrice}
                        onChange={(e) => {
                          const nextPrice = e.target.value;
                          setEditPrice(nextPrice);
                          setEditDiscount(calculateDiscountPercent(editMrp, nextPrice));
                        }}
                      />
                    ) : (
                      `₹${p.price}`
                    )}
                  </td>
                  <td className="p-3 text-slate-500">
                    {editingId === p._id ? (
                      <input
                        className="border px-2 py-1 rounded w-28"
                        type="number"
                        value={editMrp}
                        onChange={(e) => {
                          const nextMrp = e.target.value;
                          setEditMrp(nextMrp);
                          setEditDiscount(calculateDiscountPercent(nextMrp, editPrice));
                        }}
                      />
                    ) : (
                      (p as any).mrp ? `₹${(p as any).mrp}` : '—'
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {editingId === p._id ? (
                      <input
                        className="border px-2 py-1 rounded w-24"
                        type="number"
                        min={0}
                        max={100}
                        value={editDiscount}
                        readOnly
                      />
                    ) : (
                      (p as any).discount ? `${(p as any).discount}%` : '—'
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {editingId === p._id ? (
                      <select
                        className="border px-2 py-1 rounded min-w-[170px]"
                        value={editCatId}
                        onChange={(e) => {
                          setEditCatId(e.target.value);
                          setEditSubcategoryId('');
                        }}
                      >
                        <option value="">Select category</option>
                        {parentCategories.map((category) => (
                          <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                      </select>
                    ) : (
                      getCategoryLabel(p)
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {editingId === p._id ? (
                      <select
                        className="border px-2 py-1 rounded min-w-[170px]"
                        value={editSubcategoryId}
                        onChange={(e) => setEditSubcategoryId(e.target.value)}
                        disabled={!editCatId || editSubCategories.length === 0}
                      >
                        <option value="">No sub-category</option>
                        {editSubCategories.map((subCategory) => (
                          <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>
                        ))}
                      </select>
                    ) : (
                      getSubCategoryLabel(p)
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {editingId === p._id ? (
                      <div className="space-y-2 min-w-[320px]">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                          onClick={() => setEditVariants((prev) => {
                            const next = [...prev, createEmptyVariant()];
                            if (next.length === 1) next[0].isDefault = true;
                            return next;
                          })}
                        >
                          + Add Variant
                        </button>
                        {editVariants.length === 0 ? (
                          <div className="text-xs text-slate-400">No variants configured</div>
                        ) : (
                          editVariants.map((variant, index) => (
                            <div key={index} className="grid grid-cols-12 gap-1 items-center">
                              <input
                                className="border px-1 py-1 rounded col-span-3 text-xs"
                                placeholder="500g"
                                value={variant.label}
                                onChange={(e) => setEditVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value, unitType: e.target.value } : row))}
                              />
                              <input
                                className="border px-1 py-1 rounded col-span-2 text-xs"
                                type="number"
                                placeholder="Price"
                                value={variant.price}
                                onChange={(e) => {
                                  const nextPrice = e.target.value;
                                  setEditVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, price: nextPrice, discount: calculateDiscountPercent(row.mrp, nextPrice) } : row));
                                }}
                              />
                              <input
                                className="border px-1 py-1 rounded col-span-2 text-xs"
                                type="number"
                                placeholder="MRP"
                                value={variant.mrp}
                                onChange={(e) => {
                                  const nextMrp = e.target.value;
                                  setEditVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, mrp: nextMrp, discount: calculateDiscountPercent(nextMrp, row.price) } : row));
                                }}
                              />
                              <input className="border px-1 py-1 rounded col-span-1 text-xs" type="number" value={variant.discount} readOnly />
                              <input
                                className="border px-1 py-1 rounded col-span-2 text-xs"
                                type="number"
                                placeholder="Stock"
                                value={variant.stock}
                                onChange={(e) => setEditVariants((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, stock: e.target.value } : row))}
                              />
                              <div className="col-span-2 flex gap-1 justify-end">
                                <button
                                  type="button"
                                  className={`text-[10px] px-1.5 py-1 rounded ${variant.isDefault ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                  onClick={() => setEditVariants((prev) => prev.map((row, rowIndex) => ({ ...row, isDefault: rowIndex === index })))}
                                >
                                  {variant.isDefault ? 'Default' : 'Set'}
                                </button>
                                <button
                                  type="button"
                                  className="text-[10px] px-1.5 py-1 rounded bg-red-100 text-red-600"
                                  onClick={() => setEditVariants((prev) => {
                                    const next = prev.filter((_, rowIndex) => rowIndex !== index);
                                    if (next.length > 0 && !next.some((row) => row.isDefault)) next[0].isDefault = true;
                                    return next;
                                  })}
                                >
                                  x
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : Array.isArray((p as any).variants) && (p as any).variants.length > 0 ? (
                      <div className="text-xs space-y-1">
                        {(p as any).variants.map((variant: any) => (
                          <div key={String(variant?._id || variant?.label)} className="whitespace-nowrap">
                            {variant?.label || variant?.unitType || 'Variant'}: ₹{variant?.price ?? 0} • Stock {variant?.stock ?? 0}
                          </div>
                        ))}
                      </div>
                    ) : (
                      (p.unitType || p.unit || 'piece').toString()
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === p._id ? (
                      <input
                        className="border px-2 py-1 rounded w-24"
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                      />
                    ) : (
                      p.stock ?? '—'
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {editingId === p._id ? (
                        <>
                          <button
                            className="text-green-600 text-sm hover:underline disabled:opacity-50"
                            onClick={saveEdit}
                            disabled={updating}
                          >
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-slate-600 text-sm hover:underline"
                            onClick={cancelEdit}
                            disabled={updating}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {hasPerm('products:update') && (
                            <button
                              className="text-blue-600 text-sm hover:underline"
                              onClick={() => startEdit(p)}
                            >
                              Edit
                            </button>
                          )}
                          {hasPerm('products:delete') && (
                            <button
                              className="text-red-600 text-sm hover:underline"
                              onClick={() => remove(p._id)}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

{/* push change file  */}
      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-slate-500">Total: {total}</div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => load(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">{page} / {Math.max(1, totalPages)}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}