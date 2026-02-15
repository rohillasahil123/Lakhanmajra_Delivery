import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Product = { _id: string; name: string; price: number; stock?: number };

type Category = { _id: string; name: string };

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // create form
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [catId, setCatId] = useState('');
  const [images, setImages] = useState('');

  // CSV import
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const load = async (pageNum = 1) => {
    try {
      const res = await api.get(`/products?page=${pageNum}&limit=${limit}${search ? `&q=${search}` : ''}`);
      const data = res.data?.data ?? res.data;
      setItems(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
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

      // Static Blinkit-style categories (valid ObjectId format)
      const staticCategories = [
        { _id: '65c9f1a4a3d2f9b00000001', name: 'Grocery' },
        { _id: '65c9f1a4a3d2f9b00000002', name: 'Dairy & Breakfast' },
        { _id: '65c9f1a4a3d2f9b00000003', name: 'Snacks & Branded Foods' },
        { _id: '65c9f1a4a3d2f9b00000004', name: 'Staples' },
        { _id: '65c9f1a4a3d2f9b00000005', name: 'Beverages' },
        { _id: '65c9f1a4a3d2f9b00000006', name: 'Household Essentials' },
        { _id: '65c9f1a4a3d2f9b00000007', name: 'Personal Care' }
      ];

      // Merge static + API categories
      const finalCategories = Array.isArray(apiCats)
        ? [...staticCategories, ...apiCats]
        : staticCategories;

      setCategories(finalCategories);

      await load(1);
    } catch (err) {
      console.error(err);
    }
  })();
}, []);


  const hasPerm = (p: string) => permissions.includes(p);

  const remove = async (id: string) => {
    if (!confirm('Delete product?')) return;
    try {
      await api.delete(`/products/${id}`);
      await load(page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const create = async () => {
    if (!name || !price || !catId) return alert('name, price, category required');
    try {
      const payload: any = {
        name,
        price: Number(price),
        categoryId: catId,
        stock: stock ? Number(stock) : undefined,
        images: images ? images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };
      await api.post('/products', payload);
      setName(''); setPrice(''); setStock(''); setImages(''); setCatId('');
      await load(1);
      alert('Product created');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    }
  };

  const importCSV = async () => {
    if (!csvText.trim()) return alert('CSV text required');
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const items: any[] = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t'); // tab-separated or adjust separator
        if (parts.length < 2) continue;
        items.push({
          name: parts[0],
          price: Number(parts[1]),
          stock: parts[2] ? Number(parts[2]) : undefined,
          category: parts[3],
          description: parts[4],
        });
      }

      const res = await api.post('/products/import', { items });
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
      </div>

      {hasPerm('products:create') && (
        <div className="mb-4 bg-white p-4 rounded shadow">
          <div className="flex gap-2 items-center mb-3">
            <input className="border px-3 py-2 rounded" placeholder="name" value={name} onChange={e => setName(e.target.value)} />
            <select className="border px-3 py-2 rounded" value={catId} onChange={e => setCatId(e.target.value)}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <input className="border px-3 py-2 rounded w-28" placeholder="price" value={price} onChange={e => setPrice(e.target.value)} />
            <input className="border px-3 py-2 rounded w-28" placeholder="stock" value={stock} onChange={e => setStock(e.target.value)} />
            <input className="border px-3 py-2 rounded" placeholder="images (comma separated URLs)" value={images} onChange={e => setImages(e.target.value)} />
            <button className="bg-sky-600 text-white px-4 rounded" onClick={create}>Create</button>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Bulk Import (CSV)</div>
            <textarea
              className="border px-3 py-2 rounded w-full h-24 text-xs"
              placeholder="name	price	stock	category	description"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <button
              className="bg-purple-600 text-white px-4 rounded mt-2"
              onClick={importCSV}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1"
          placeholder="Search products..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          onKeyDown={e => e.key === 'Enter' && load(1)}
        />
        <button className="bg-slate-600 text-white px-4 rounded" onClick={() => load(1)}>Search</button>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id} className="border-b last:border-0">
                <td className="p-3">{p.name}</td>
                <td className="p-3">₹{p.price}</td>
                <td className="p-3">{p.stock ?? '—'}</td>
                <td className="p-3">
                  {hasPerm('products:delete') && (
                    <button className="text-red-600 text-sm" onClick={() => remove(p._id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          <span className="px-3 py-1">{page} / {totalPages}</span>
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
