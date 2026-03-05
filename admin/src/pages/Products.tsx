import React, { useState } from 'react';
import { useProducts, Product } from '../hooks/useProducts';
import CreateProductModal from '../components/products/CreateProductModal';
import EditProductModal from '../components/products/EditProductModal';
import ProductsTable from '../components/products/ProductsTable';

export default function Products() {
  const {
    groupedByCategory, parentCategories, subCategoriesOf,
    total, page, totalPages, hasPerm,
    search, setSearch, stockFilter, setStockFilter,
    sortKey, sortOrder, toggleSort,
    refreshing, lastRefreshedAt,
    creating, updating, importing,
    load, manualRefresh,
    createProduct, updateProduct, deleteProduct, removeProductImage,
    importCSV,
  } = useProducts();

  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // CSV state (kept local — UI concern only)
  const [csvText,     setCsvText]     = useState('');
  const [showCsvBox,  setShowCsvBox]  = useState(false);
  const [csvFeedback, setCsvFeedback] = useState('');

  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    setCsvFeedback('');
    try {
      const imported = await importCSV(csvText);
      setCsvText('');
      setShowCsvBox(false);
      setCsvFeedback(`✅ Imported ${imported} products`);
    } catch (err: any) {
      setCsvFeedback(`❌ ${err?.response?.data?.message || 'Import failed'}`);
    }
  };

  return (
    <div className="p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Products</h2>
          <p className="text-sm text-slate-400 mt-0.5">{total} products total</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh info */}
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400">Auto-refresh: 10s</div>
            {lastRefreshedAt && (
              <div className="text-xs text-slate-400">
                Updated {lastRefreshedAt.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Manual refresh */}
          <button
            className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
            onClick={manualRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>

          {/* CSV import toggle */}
          <button
            className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 transition-colors"
            onClick={() => setShowCsvBox((v) => !v)}
          >
            ⬆ CSV Import
          </button>

          {/* Create product */}
          {hasPerm('products:create') && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              onClick={() => setShowCreate(true)}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* ── CSV import box ──────────────────────────────────────────────────── */}
      {showCsvBox && (
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-700 text-sm">CSV Import</h4>
            <span className="text-xs text-slate-400">Format: Name ⇥ Price ⇥ Stock ⇥ Category ⇥ Description</span>
          </div>
          <textarea
            className="border px-3 py-2 rounded w-full text-sm h-24 resize-none font-mono"
            placeholder={'Rajma Dal\t70\t20\tAtta Rice Pulses\tDelicious dal'}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          {csvFeedback && (
            <p className="text-sm mt-1 text-slate-600">{csvFeedback}</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              className="px-4 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              onClick={handleImportCSV}
              disabled={importing || !csvText.trim()}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300 transition-colors"
              onClick={() => { setShowCsvBox(false); setCsvText(''); setCsvFeedback(''); }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Search + filters ────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1 text-sm"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
        <button
          className="bg-slate-700 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 transition-colors"
          onClick={() => load(1)}
        >
          Search
        </button>
        <button
          className={`px-4 py-2 rounded border text-sm transition-colors ${
            stockFilter === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
          onClick={() => setStockFilter('all')}
        >
          All
        </button>
        <button
          className={`px-4 py-2 rounded border text-sm transition-colors ${
            stockFilter === 'out'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
          }`}
          onClick={() => setStockFilter('out')}
        >
          Out of Stock
        </button>
      </div>

      {/* ── Category-wise Product Table ─────────────────────────────────────── */}
      <ProductsTable
        groupedByCategory={groupedByCategory}
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

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      <div className="mt-5 flex justify-between items-center">
        <div className="text-sm text-slate-400">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button
            disabled={page === 1}
            onClick={() => load(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm"
          >
            Prev
          </button>
          <span className="px-2 text-sm text-slate-500">{page} / {Math.max(1, totalPages)}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateProductModal
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          creating={creating}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            await createProduct(payload);
          }}
        />
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          parentCategories={parentCategories}
          subCategoriesOf={subCategoriesOf}
          updating={updating}
          onClose={() => setEditProduct(null)}
          onSave={async (productId, payload) => {
            await updateProduct(productId, payload);
          }}
        />
      )}
    </div>
  );
}