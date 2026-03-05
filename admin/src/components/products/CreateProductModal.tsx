import React, { useRef, useState } from 'react';
import {
  ProductVariant, Category,
  UNIT_VARIANTS, calculateDiscountPercent,
} from '../../hooks/useProducts';
import VariantEditor from './VariantEditor';

interface Props {
  parentCategories: Category[];
  subCategoriesOf: (parentId: string) => Category[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string; price: string; mrp: string; discount: string;
    stock: string; unit: string; unitType: string; catId: string;
    subcategoryId: string; description: string; tags: string;
    variants: ProductVariant[]; files: File[];
  }) => Promise<void>;
}

export default function CreateProductModal({
  parentCategories, subCategoriesOf, creating, onClose, onCreate,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name,          setName]          = useState('');
  const [price,         setPrice]         = useState('');
  const [mrp,           setMrp]           = useState('');
  const [discount,      setDiscount]      = useState('');
  const [stock,         setStock]         = useState('');
  const [unit,          setUnit]          = useState<'piece'|'kg'|'g'|'l'|'ml'|'pack'>('piece');
  const [unitType,      setUnitType]      = useState('1 pc');
  const [catId,         setCatId]         = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [description,   setDescription]   = useState('');
  const [tags,          setTags]          = useState('');
  const [variants,      setVariants]      = useState<ProductVariant[]>([]);
  const [files,         setFiles]         = useState<File[]>([]);
  const [previews,      setPreviews]      = useState<string[]>([]);
  const [error,         setError]         = useState('');

  const subCategories = subCategoriesOf(catId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const merged = [...files, ...picked].slice(0, 5);
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    setPreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const reset = () => {
    setName(''); setPrice(''); setMrp(''); setDiscount(''); setStock('');
    setUnit('piece'); setUnitType('1 pc'); setCatId(''); setSubcategoryId('');
    setDescription(''); setTags(''); setVariants([]); setFiles([]); setPreviews([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    setError('');
    try {
      await onCreate({ name, price, mrp, discount, stock, unit, unitType, catId, subcategoryId, description, tags, variants, files });
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Create failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Create New Product</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <input
            className="border px-3 py-2 rounded w-full text-sm"
            placeholder="Product name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Category row */}
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border px-3 py-2 rounded text-sm"
              value={catId}
              onChange={(e) => { setCatId(e.target.value); setSubcategoryId(''); }}
            >
              <option value="">Select category *</option>
              {parentCategories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <select
              className="border px-3 py-2 rounded text-sm"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!catId || subCategories.length === 0}
            >
              <option value="">
                {!catId ? 'Select sub-category' : subCategories.length === 0 ? 'No sub-categories' : 'Select sub-category (optional)'}
              </option>
              {subCategories.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Price / MRP / Discount / Stock */}
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border px-3 py-2 rounded text-sm"
              placeholder="Price (₹) *"
              type="number"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setDiscount(calculateDiscountPercent(mrp, e.target.value)); }}
            />
            <input
              className="border px-3 py-2 rounded text-sm"
              placeholder="MRP (₹)"
              type="number"
              value={mrp}
              onChange={(e) => { setMrp(e.target.value); setDiscount(calculateDiscountPercent(e.target.value, price)); }}
            />
            <input
              className="border px-3 py-2 rounded text-sm bg-slate-50"
              placeholder="Discount (%)"
              type="number"
              value={discount}
              readOnly
              tabIndex={-1}
            />
            <input
              className="border px-3 py-2 rounded text-sm"
              placeholder="Stock quantity"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          {/* Unit row */}
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border px-3 py-2 rounded text-sm"
              value={unit}
              onChange={(e) => {
                const u = e.target.value as typeof unit;
                setUnit(u);
                setUnitType((UNIT_VARIANTS[u] || [])[0] || '');
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
              className="border px-3 py-2 rounded text-sm"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
            >
              {(UNIT_VARIANTS[unit] || []).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <input
            className="border px-3 py-2 rounded w-full text-sm"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* Description */}
          <textarea
            className="border px-3 py-2 rounded w-full text-sm h-20 resize-none"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Variants */}
          <VariantEditor variants={variants} onChange={setVariants} />

          {/* Images */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              Product Images (max 5 — JPEG/PNG/WEBP/SVG, up to 5MB each)
            </p>
            <label
              htmlFor="createProductImages"
              className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors block"
            >
              <p className="text-slate-500 text-sm">📷 Click to select images or drag & drop</p>
              <p className="text-slate-400 text-xs mt-1">{files.length}/5 images selected</p>
            </label>
            <input
              id="createProductImages"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`preview-${i}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50 rounded-b-xl">
          <button
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm transition-colors"
            onClick={() => { reset(); onClose(); }}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm transition-colors"
            onClick={reset}
            disabled={creating}
          >
            Reset
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
            onClick={handleSubmit}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}