import React, { useState } from 'react';
import { useProducts, Product, Category, AUTO_REFRESH_MS } from '../hooks/useProducts';
import CreateProductModal from '../components/products/CreateProductModal';
import EditProductModal from '../components/products/EditProductModal';
import ProductsTable from '../components/products/ProductsTable';
import AddCategoryModal from '../components/products/AddCategoryModal';
import EditCategoryModal from '../components/products/EditCategoryModal';
import Toast from '../components/users/Toast';
import api from '../api/client';

// ─── Color palette for category cards ────────────────────────────────────────

const COLORS = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600' },
  { bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-500',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-600' },
  { bg: 'bg-purple-50',  border: 'border-purple-200',  dot: 'bg-purple-500',  text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-600' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-600' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    dot: 'bg-cyan-500',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-600' },
  { bg: 'bg-yellow-50',  border: 'border-yellow-200',  dot: 'bg-yellow-500',  text: 'text-yellow-700',  badge: 'bg-yellow-100 text-yellow-600' },
  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  dot: 'bg-indigo-500',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-600' },
];

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  category, count, colorIdx,
  onOpen, onEdit, onDelete,
}: {
  category: Category; count: number; colorIdx: number;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const c = COLORS[colorIdx % COLORS.length];

  return (
    <div className={`relative group rounded-xl border-2 transition-all duration-150 hover:shadow-md ${c.bg} ${c.border}`}>

      {/* Edit / Delete icons — visible on hover */}
      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          title="Edit category"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 hover:shadow transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
          </svg>
        </button>
        <button
          title="Delete category"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:shadow transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
          </svg>
        </button>
      </div>

      {/* Clickable area → open products */}
      <button onClick={onOpen} className="w-full text-left p-5">
        <div className="flex items-start justify-between mb-3 pr-10">
          <div className={`w-3 h-3 rounded-full mt-1 ${c.dot}`} />
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.badge}`}>
            {count} {count === 1 ? 'product' : 'products'}
          </span>
        </div>
        <h3 className={`font-semibold text-base leading-snug ${c.text}`}>{category.name}</h3>
        <p className="text-xs text-slate-400 mt-1">Click to view products →</p>
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Products() {
  const [showAddProduct,   setShowAddProduct]   = useState(false);
  const [editProduct,      setEditProduct]      = useState<Product | null>(null);
  const [showAddCategory,  setShowAddCategory]  = useState(false);
  const [editCategory,     setEditCategory]     = useState<Category | null>(null);

  const isProductFormOpen = showAddProduct || Boolean(editProduct);
  const activeAutoRefreshMs = isProductFormOpen ? 0 : AUTO_REFRESH_MS;

  const {
    sortedItems, subCategoryGroups,
    categories, parentCategories, subCategoriesOf,
    total, page, totalPages, hasPerm,
    search, setSearch,
    stockFilter, setStockFilter,
    sortKey, sortOrder, toggleSort,
    refreshing, lastRefreshedAt,
    creating, updating, importing,
    selectedCatId, setSelectedCatId,
    categoryProductCount,
    load, manualRefresh, reloadCategories,
    createProduct, updateProduct,
    deleteProduct, removeProductImage,
    importCSV,
  } = useProducts(activeAutoRefreshMs);

  // CSV
  const [csvText, setCsvText] = useState('');
  const [showCsv, setShowCsv] = useState(false);
  const [csvMsg,  setCsvMsg]  = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const selectedCategory = parentCategories.find((c) => c._id === selectedCatId) ?? null;

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      await reloadCategories();
      console.info('Category deleted', { categoryId: cat._id, categoryName: cat.name });
      setToast({ message: `Category deleted: ${cat.name}`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Category delete failed', type: 'error' });
    }
  };

  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    setCsvMsg('');
    try {
      const n = await importCSV(csvText);
      setCsvText(''); setShowCsv(false); setCsvMsg(`✅ Imported ${n} products`);
    } catch (err: any) {
      setCsvMsg(`❌ ${err?.response?.data?.message || 'Import failed'}`);
    }
  };

  // ── Shared header action bar ───────────────────────────────────────────────

  const ActionBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="text-right hidden sm:block">
        <div className="text-xs text-slate-400">
          Auto-refresh: {isProductFormOpen ? 'Paused (product form open)' : `${Math.round(activeAutoRefreshMs / 1000)}s`}
        </div>
        {lastRefreshedAt && <div className="text-xs text-slate-400">Updated {lastRefreshedAt.toLocaleTimeString()}</div>}
      </div>

      <button className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        onClick={manualRefresh} disabled={refreshing}>
        {refreshing ? '...' : '↻ Refresh'}
      </button>

      <button className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 transition-colors"
        onClick={() => setShowCsv((v) => !v)}>
        ⬆ CSV
      </button>

      {/* Add Category — only on cards view */}
      {!selectedCatId && (
        <button
          className="px-3 py-2 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-slate-700"
          onClick={() => setShowAddCategory(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      )}

      {/* Add Product */}
      {hasPerm('products:create') && (
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
          onClick={() => setShowAddProduct(true)}>
          + Add Product
        </button>
      )}
    </div>
  );

  // ── CSV box ────────────────────────────────────────────────────────────────

  const CsvBox = () => !showCsv ? null : (
    <div className="mb-4 bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-slate-700 text-sm">CSV Import</h4>
        <span className="text-xs text-slate-400">Format: Name ⇥ Price ⇥ Stock ⇥ Category ⇥ Description</span>
      </div>
      <textarea className="border px-3 py-2 rounded w-full text-sm h-20 resize-none font-mono"
        placeholder={'Rajma Dal\t70\t20\tAtta Rice Pulses\tDelicious dal'}
        value={csvText} onChange={(e) => setCsvText(e.target.value)} />
      {csvMsg && <p className="text-sm mt-1">{csvMsg}</p>}
      <div className="flex gap-2 mt-2">
        <button className="px-4 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50"
          onClick={handleImportCSV} disabled={importing || !csvText.trim()}>
          {importing ? 'Importing...' : 'Import'}
        </button>
        <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
          onClick={() => { setShowCsv(false); setCsvText(''); setCsvMsg(''); }}>
          Close
        </button>
      </div>
    </div>
  );

  // ── All modals (rendered at bottom of both views) ─────────────────────────

  const Modals = () => (
    <>
      {showAddCategory && (
        <AddCategoryModal
          parentCategories={parentCategories}
          onClose={() => setShowAddCategory(false)}
          onCreated={reloadCategories}
        />
      )}
      {editCategory && (
        <EditCategoryModal
          category={editCategory}
          parentCategories={parentCategories}
          subCategories={subCategoriesOf(editCategory._id)}
          onClose={() => setEditCategory(null)}
          onSaved={reloadCategories}
        />
      )}
      {showAddProduct && (
        <CreateProductModal
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          creating={creating}
          defaultCategoryId={selectedCatId ?? ''}
          onClose={() => setShowAddProduct(false)}
          onCreate={async (p) => { await createProduct(p); }}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          updating={updating}
          onClose={() => setEditProduct(null)}
          onSave={async (pid, p) => { await updateProduct(pid, p); }}
        />
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1 — Category cards (default)
  // ══════════════════════════════════════════════════════════════════════════

  if (!selectedCatId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Products</h2>
            <p className="text-sm text-slate-400 mt-0.5">{total} products · {parentCategories.length} categories</p>
          </div>
          <ActionBar />
        </div>

        <CsvBox />

        {parentCategories.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-slate-500 font-medium mb-1">No categories yet</p>
            <p className="text-slate-400 text-sm mb-4">Create a category to start adding products</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              onClick={() => setShowAddCategory(true)}>
              + Add First Category
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {parentCategories.map((cat, idx) => (
              <CategoryCard
                key={cat._id}
                category={cat}
                count={categoryProductCount(cat._id)}
                colorIdx={idx}
                onOpen={() => { setSelectedCatId(cat._id); setSearch(''); }}
                onEdit={() => setEditCategory(cat)}
                onDelete={() => handleDeleteCategory(cat)}
              />
            ))}
          </div>
        )}

        <Modals />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2 — Products of selected category
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group"
            onClick={() => { setSelectedCatId(null); setSearch(''); setStockFilter('all'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Categories
          </button>
          <span className="text-slate-300">/</span>
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">{selectedCategory?.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{sortedItems.length} products</p>
          </div>
        </div>
        <ActionBar />
      </div>

      <CsvBox />

      {/* Search + filters */}
      <div className="my-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1 text-sm"
          placeholder={`Search in ${selectedCategory?.name ?? 'category'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`px-4 py-2 rounded border text-sm transition-colors ${stockFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          onClick={() => setStockFilter('all')}>All</button>
        <button
          className={`px-4 py-2 rounded border text-sm transition-colors ${stockFilter === 'out' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300 hover:bg-red-50'}`}
          onClick={() => setStockFilter('out')}>Out of Stock</button>
      </div>

      {/* Table */}
      <ProductsTable
        subCategoryGroups={subCategoryGroups}
        sortKey={sortKey} sortOrder={sortOrder} toggleSort={toggleSort}
        hasPerm={hasPerm}
        onEdit={(p) => setEditProduct(p)}
        onDelete={async (id) => {
          try {
            const deletedId = await deleteProduct(id);
            console.info('Product deleted permanently', { deletedId });
            setToast({ message: `Product deleted (ID: ${deletedId})`, type: 'success' });
          }
          catch (err: any) {
            const message = err?.response?.data?.message || 'Delete failed';
            setToast({ message, type: 'error' });
          }
        }}
        onRemoveImage={async (pid, url) => {
          if (!confirm('Remove this image?')) return;
          try {
            await removeProductImage(pid, url);
            console.info('Product image deleted', { productId: pid, imageUrl: url });
            setToast({ message: 'Product image deleted', type: 'success' });
          }
          catch (err: any) {
            setToast({ message: err?.response?.data?.message || 'Image delete failed', type: 'error' });
          }
        }}
      />

      {/* Pagination */}
      <div className="mt-5 flex justify-between items-center">
        <div className="text-sm text-slate-400">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button disabled={page === 1} onClick={() => load(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm">Prev</button>
          <span className="px-2 text-sm text-slate-500">{page} / {Math.max(1, totalPages)}</span>
          <button disabled={page >= totalPages} onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm">Next</button>
        </div>
      </div>

      <Modals />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}