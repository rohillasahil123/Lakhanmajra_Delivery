import React from 'react';
import { Product, SortKey } from '../../hooks/useProducts';

interface Props {
  subCategoryGroups: Record<string, Product[]>;
  sortKey: SortKey;
  sortOrder: 'asc' | 'desc';
  toggleSort: (key: Exclude<SortKey, null>) => void;
  hasPerm: (p: string) => boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onRemoveImage: (productId: string, imageUrl: string) => void;
}

function SortBtn({ label, sortKey, currentKey, sortOrder, onClick }: {
  label: string; sortKey: SortKey; currentKey: Exclude<SortKey, null>;
  sortOrder: 'asc' | 'desc'; onClick: () => void;
}) {
  const active = sortKey === currentKey;
  return (
    <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors" onClick={onClick}>
      {label}
      <span className={`text-xs ${active ? 'text-blue-500' : 'text-slate-400'}`}>
        {active ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

function ProductRow({ p, hasPerm, onEdit, onDelete, onRemoveImage }: {
  p: Product;
  hasPerm: (perm: string) => boolean;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onRemoveImage: (pid: string, url: string) => void;
}) {
  const hasVariants = Array.isArray((p as any).variants) && (p as any).variants.length > 0;

  return (
    <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
      {/* Image */}
      <td className="px-4 py-3">
        {p.images && p.images.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {p.images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img} alt={p.name}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=No+Img'; }}
                />
                {hasPerm('products:update') && (
                  <button
                    onClick={() => onRemoveImage(p._id, img)}
                    title="Remove image"
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
            No img
          </div>
        )}
      </td>

      {/* Name */}
      <td className="px-4 py-3">
        <span className="font-medium text-slate-800 text-sm">{p.name}</span>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-sm font-medium text-slate-700">₹{p.price}</td>

      {/* MRP */}
      <td className="px-4 py-3 text-sm text-slate-400">
        {(p as any).mrp ? <s>₹{(p as any).mrp}</s> : '—'}
      </td>

      {/* Discount */}
      <td className="px-4 py-3">
        {(p as any).discount ? (
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            {(p as any).discount}%
          </span>
        ) : '—'}
      </td>

      {/* Variant */}
      <td className="px-4 py-3">
        {hasVariants ? (
          <div className="space-y-0.5">
            {(p as any).variants.map((v: any) => (
              <div key={String(v?._id || v?.label)} className="text-xs text-slate-500 whitespace-nowrap">
                <span className="font-medium text-slate-600">{v?.label || v?.unitType}</span>
                {' '}· ₹{v?.price ?? 0} · Stock {v?.stock ?? 0}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">{p.unitType || p.unit || 'piece'}</span>
        )}
      </td>

      {/* Stock */}
      <td className="px-4 py-3">
        {p.stock != null ? (
          <span className={`text-sm font-semibold ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-slate-700'}`}>
            {p.stock}
          </span>
        ) : '—'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {hasPerm('products:update') && (
            <button
              title="Edit"
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
              onClick={() => onEdit(p)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
              </svg>
            </button>
          )}
          {hasPerm('products:delete') && (
            <button
              title="Delete"
              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => { if (confirm('Delete this product?')) onDelete(p._id); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ProductsTable({
  subCategoryGroups, sortKey, sortOrder, toggleSort,
  hasPerm, onEdit, onDelete, onRemoveImage,
}: Props) {
  const subCatNames = Object.keys(subCategoryGroups).sort();
  const totalProducts = Object.values(subCategoryGroups).reduce((sum, arr) => sum + arr.length, 0);

  if (totalProducts === 0) {
    return (
      <div className="bg-white rounded-lg shadow px-6 py-14 text-center text-slate-400 text-sm">
        No products found
      </div>
    );
  }

  const tableHead = (
    <thead className="border-b">
      <tr className="text-xs uppercase tracking-wider text-slate-400">
        <th className="px-4 py-2 font-medium">Image</th>
        <th className="px-4 py-2 font-medium">
          <SortBtn label="Name" sortKey={sortKey} currentKey="name" sortOrder={sortOrder} onClick={() => toggleSort('name')} />
        </th>
        <th className="px-4 py-2 font-medium">
          <SortBtn label="Price" sortKey={sortKey} currentKey="price" sortOrder={sortOrder} onClick={() => toggleSort('price')} />
        </th>
        <th className="px-4 py-2 font-medium">MRP</th>
        <th className="px-4 py-2 font-medium">Discount</th>
        <th className="px-4 py-2 font-medium">Variant</th>
        <th className="px-4 py-2 font-medium">
          <SortBtn label="Stock" sortKey={sortKey} currentKey="stock" sortOrder={sortOrder} onClick={() => toggleSort('stock')} />
        </th>
        <th className="px-4 py-2 font-medium">Actions</th>
      </tr>
    </thead>
  );

  // Single sub-category or no grouping needed — flat table
  if (subCatNames.length === 1) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left table-auto">
          {tableHead}
          <tbody>
            {subCategoryGroups[subCatNames[0]].map((p) => (
              <ProductRow key={p._id} p={p} hasPerm={hasPerm} onEdit={onEdit} onDelete={onDelete} onRemoveImage={onRemoveImage} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Multiple sub-categories — show sub-category sections
  return (
    <div className="space-y-4">
      {subCatNames.map((subName) => {
        const products = subCategoryGroups[subName];
        return (
          <div key={subName} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Sub-category header */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-600">{subName}</span>
              <span className="ml-auto text-xs text-slate-400 bg-white border px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            </div>
            <table className="w-full text-left table-auto">
              {tableHead}
              <tbody>
                {products.map((p) => (
                  <ProductRow key={p._id} p={p} hasPerm={hasPerm} onEdit={onEdit} onDelete={onDelete} onRemoveImage={onRemoveImage} />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}