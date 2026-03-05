import React, { useState } from 'react';
import { useProducts, Product, Category } from '../hooks/useProducts';
import CreateProductModal from '../components/products/CreateProductModal';
import EditProductModal from '../components/products/EditProductModal';
import ProductsTable from '../components/products/ProductsTable';

// ─── Category Card ─────────────────────────────────────────────────────────────

const CARD_COLORS = [
  { bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500',   text: 'text-blue-700',   count: 'bg-blue-100 text-blue-600' },
  { bg: 'bg-emerald-50',border: 'border-emerald-200', dot: 'bg-emerald-500',text: 'text-emerald-700',count: 'bg-emerald-100 text-emerald-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200',  dot: 'bg-orange-500', text: 'text-orange-700', count: 'bg-orange-100 text-orange-600' },
  { bg: 'bg-purple-50', border: 'border-purple-200',  dot: 'bg-purple-500', text: 'text-purple-700', count: 'bg-purple-100 text-purple-600' },
  { bg: 'bg-rose-50',   border: 'border-rose-200',    dot: 'bg-rose-500',   text: 'text-rose-700',   count: 'bg-rose-100 text-rose-600' },
  { bg: 'bg-cyan-50',   border: 'border-cyan-200',    dot: 'bg-cyan-500',   text: 'text-cyan-700',   count: 'bg-cyan-100 text-cyan-600' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200',  dot: 'bg-yellow-500', text: 'text-yellow-700', count: 'bg-yellow-100 text-yellow-600' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200',  dot: 'bg-indigo-500', text: 'text-indigo-700', count: 'bg-indigo-100 text-indigo-600' },
];

function CategoryCard({
  category, count, colorIdx, onClick,
}: {
  category: Category; count: number; colorIdx: number; onClick: () => void;
}) {
  const c = CARD_COLORS[colorIdx % CARD_COLORS.length];
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border-2 p-5 transition-all duration-150
        hover:shadow-md hover:scale-[1.02] active:scale-[0.99]
        ${c.bg} ${c.border}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-3 h-3 rounded-full mt-1 ${c.dot}`} />
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.count}`}>
          {count} {count === 1 ? 'product' : 'products'}
        </span>
      </div>
      <h3 className={`font-semibold text-base leading-snug ${c.text}`}>
        {category.name}
      </h3>
      <p className="text-xs text-slate-400 mt-1">Click to view products →</p>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Products() {
  const {
    sortedItems, subCategoryGroups,
    parentCategories, subCategoriesOf,
    total, page, totalPages, hasPerm,
    search, setSearch,
    stockFilter, setStockFilter,
    sortKey, sortOrder, toggleSort,
    refreshing, lastRefreshedAt,
    creating, updating, importing,
    selectedCategoryId, setSelectedCategoryId,
    categoryProductCount,
    load, manualRefresh,
    createProduct, updateProduct,
    deleteProduct, removeProductImage,
    importCSV,
  } = useProducts();

  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // CSV state
  const [csvText,    setCsvText]    = useState('');
  const [showCsv,    setShowCsv]    = useState(false);
  const [csvMsg,     setCsvMsg]     = useState('');

  const selectedCategory = parentCategories.find((c) => c._id === selectedCategoryId) ?? null;

  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    setCsvMsg('');
    try {
      const imported = await importCSV(csvText);
      setCsvText(''); setShowCsv(false);
      setCsvMsg(`✅ Imported ${imported} products`);
    } catch (err: any) {
      setCsvMsg(`❌ ${err?.response?.data?.message || 'Import failed'}`);
    }
  };

  // ── Shared header actions ──────────────────────────────────────────────────

  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      <div className="text-right hidden sm:block">
        <div className="text-xs text-slate-400">Auto-refresh: 10s</div>
        {lastRefreshedAt && (
          <div className="text-xs text-slate-400">Updated {lastRefreshedAt.toLocaleTimeString()}</div>
        )}
      </div>
      <button
        className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        onClick={manualRefresh} disabled={refreshing}
      >
        {refreshing ? 'Refreshing...' : '↻ Refresh'}
      </button>
      <button
        className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 transition-colors"
        onClick={() => setShowCsv((v) => !v)}
      >
        ⬆ CSV Import
      </button>
      {hasPerm('products:create') && (
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
          onClick={() => setShowCreate(true)}
        >
          + Add Product
        </button>
      )}
    </div>
  );

  // ── CSV box ────────────────────────────────────────────────────────────────

  const CsvBox = () => showCsv ? (
    <div className="mb-4 bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-slate-700 text-sm">CSV Import</h4>
        <span className="text-xs text-slate-400">Format: Name ⇥ Price ⇥ Stock ⇥ Category ⇥ Description</span>
      </div>
      <textarea
        className="border px-3 py-2 rounded w-full text-sm h-20 resize-none font-mono"
        placeholder={'Rajma Dal\t70\t20\tAtta Rice Pulses\tDelicious dal'}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />
      {csvMsg && <p className="text-sm mt-1">{csvMsg}</p>}
      <div className="flex gap-2 mt-2">
        <button
          className="px-4 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50"
          onClick={handleImportCSV} disabled={importing || !csvText.trim()}
        >
          {importing ? 'Importing...' : 'Import'}
        </button>
        <button
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
          onClick={() => { setShowCsv(false); setCsvText(''); setCsvMsg(''); }}
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1 — Category Cards (default)
  // ══════════════════════════════════════════════════════════════════════════

  if (!selectedCategoryId) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Products</h2>
            <p className="text-sm text-slate-400 mt-0.5">{total} products · {parentCategories.length} categories</p>
          </div>
          <HeaderActions />
        </div>

        <CsvBox />

        {/* Category cards grid */}
        {parentCategories.length === 0 ? (
          <div className="mt-8 text-center text-slate-400 text-sm">No categories found</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {parentCategories.map((cat, idx) => (
              <CategoryCard
                key={cat._id}
                category={cat}
                count={categoryProductCount(cat._id)}
                colorIdx={idx}
                onClick={() => {
                  setSelectedCategoryId(cat._id);
                  setSearch('');
                }}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreate && (
          <CreateProductModal
            parentCategories={parentCategories}
            subCategoriesOf={subCategoriesOf}
            creating={creating}
            onClose={() => setShowCreate(false)}
            onCreate={async (payload) => { await createProduct(payload); }}
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
          {/* Back button */}
          <button
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group"
            onClick={() => { setSelectedCategoryId(null); setSearch(''); setStockFilter('all'); }}
          >
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
        <HeaderActions />
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
          className={`px-4 py-2 rounded border text-sm transition-colors ${
            stockFilter === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
          onClick={() => setStockFilter('all')}
        >All</button>
        <button
          className={`px-4 py-2 rounded border text-sm transition-colors ${
            stockFilter === 'out'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
          }`}
          onClick={() => setStockFilter('out')}
        >Out of Stock</button>
      </div>

      {/* Products table (grouped by sub-category) */}
      <ProductsTable
        subCategoryGroups={subCategoryGroups}
        sortKey={sortKey}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        hasPerm={hasPerm}
        onEdit={(p) => setEditProduct(p)}
        onDelete={async (id) => {
          try { await deleteProduct(id); }
          catch (err: any) { alert(err?.response?.data?.message || 'Delete failed'); }
        }}
        onRemoveImage={async (productId, imageUrl) => {
          if (!confirm('Remove this image?')) return;
          try { await removeProductImage(productId, imageUrl); }
          catch (err: any) { alert(err?.response?.data?.message || 'Image delete failed'); }
        }}
      />

      {/* Pagination */}
      <div className="mt-5 flex justify-between items-center">
        <div className="text-sm text-slate-400">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button disabled={page === 1} onClick={() => load(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm">
            Prev
          </button>
          <span className="px-2 text-sm text-slate-500">{page} / {Math.max(1, totalPages)}</span>
          <button disabled={page >= totalPages} onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm">
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateProductModal
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          creating={creating}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => { await createProduct(payload); }}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          updating={updating}
          onClose={() => setEditProduct(null)}
          onSave={async (productId, payload) => { await updateProduct(productId, payload); }}
        />
      )}
    </div>
  );
}