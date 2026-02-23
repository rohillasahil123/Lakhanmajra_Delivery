import React, { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  images?: string[];
  isActive?: boolean;
};

type Category = { _id: string; name: string };

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Create form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stock, setStock] = useState('');
  const [catId, setCatId] = useState('');
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
      const res = await api.get(`/products?page=${pageNum}&limit=${limit}${search ? `&q=${search}` : ''}`);
      const data = res.data?.data ?? res.data;
      setItems(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        const catsRes = await api.get('/categories');
        const apiCats = catsRes.data?.data ?? catsRes.data ?? [];

        const staticCategories = [
          { _id: '65d7b1a2c8e4f1a9b2c3d4e5', name: 'Grocery' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4e6', name: 'Dairy & Breakfast' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4e7', name: 'Snacks & Branded Foods' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4e8', name: 'Staples' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4e9', name: 'Beverages' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4ea', name: 'Household Essentials' },
          { _id: '65d7b1a2c8e4f1a9b2c3d4eb', name: 'Personal Care' },
        ];

        setCategories([...staticCategories, ...(Array.isArray(apiCats) ? apiCats : [])]);
        await load(1);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p);

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

  const resetForm = () => {
    setName(''); setPrice(''); setMrp(''); setStock('');
    setCatId(''); setDescription(''); setTags('');
    setSelectedFiles([]); setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Create product ───────────────────────────────────────────────────────────
  const create = async () => {
    if (!name || !price || !catId) return alert('Name, price, and category are required');
    setCreating(true);
    try {
      // Use FormData to send files + fields together
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('categoryId', catId);
      if (mrp) formData.append('mrp', mrp);
      if (stock) formData.append('stock', stock);
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
        <span className="text-sm text-slate-500">Total: {total}</span>
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
              onChange={(e) => setCatId(e.target.value)}
            >
              <option value="">Select category *</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
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
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="MRP (₹)"
              type="number"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="Stock quantity"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <textarea
              className="border px-3 py-2 rounded col-span-2 h-20 resize-none"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ── Image Upload ──────────────────────────────────────────────── */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Product Images (max 5, each up to 5MB — JPEG/PNG/WEBP)
            </label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-sky-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-slate-500 text-sm">
                📷 Click to select images or drag & drop
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {selectedFiles.length}/5 images selected
              </p>
            </div>

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`preview-${i}`}
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={() => removeSelectedFile(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* ── CSV Import ────────────────────────────────────────────────── */}
          <div className="border-t pt-4 mt-4">
            <div className="text-sm font-medium mb-2 text-slate-600">Bulk Import (Tab-separated CSV)</div>
            <textarea
              className="border px-3 py-2 rounded w-full h-24 text-xs font-mono"
              placeholder="name&#9;price&#9;stock&#9;category&#9;description"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded mt-2 disabled:opacity-50"
              onClick={importCSV}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import CSV'}
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
      </div>

      {/* ── Products Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">MRP</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No products found
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-slate-50">
                  {/* Product image thumbnail */}
                  <td className="p-3">
                    {p.images && p.images.length > 0 ? (
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
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">₹{p.price}</td>
                  <td className="p-3 text-slate-500">
                    {(p as any).mrp ? `₹${(p as any).mrp}` : '—'}
                  </td>
                  <td className="p-3">{p.stock ?? '—'}</td>
                  <td className="p-3">
                    {hasPerm('products:delete') && (
                      <button
                        className="text-red-600 text-sm hover:underline"
                        onClick={() => remove(p._id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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