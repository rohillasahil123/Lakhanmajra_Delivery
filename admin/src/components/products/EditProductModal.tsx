import React, { useState, useEffect } from 'react';
import {
  Product,
  ProductVariant,
  Category,
  calculateDiscountPercent,
  getRefId,
} from '../../hooks/useProducts';
import VariantEditor from './VariantEditor';

interface Props {
  product: Product;
  parentCategories: Category[];
  subCategoriesOf: (parentId: string) => Category[];
  updating: boolean;
  onClose: () => void;
  onSave: (
    productId: string,
    payload: {
      name: string;
      price: string;
      mrp: string;
      discount: string;
      stock: string;
      catId: string;
      subcategoryId: string;
      existingImages: string[];
      newFiles: File[];
      variants: ProductVariant[];
      unit: string;
    }
  ) => Promise<void>;
}

export default function EditProductModal({
  product,
  parentCategories,
  subCategoriesOf,
  updating,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('');
  const [catId, setCatId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Populate from product on open
  useEffect(() => {
    setName(product.name || '');
    setPrice(String(product.price ?? ''));
    setMrp(String(product.mrp ?? ''));
    setDiscount(calculateDiscountPercent(String(product.mrp ?? ''), String(product.price ?? '')));
    setStock(String(product.stock ?? ''));
    setCatId(getRefId(product.categoryId));
    setSubcategoryId(getRefId(product.subcategoryId));
    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setNewFiles([]);
    setNewPreviews([]);
    setError('');

    const srcVariants = Array.isArray((product as any).variants) ? (product as any).variants : [];
    setVariants(
      srcVariants.map((v: any, i: number) => ({
        _id: v?._id ? String(v._id) : undefined,
        label: String(v?.label || v?.unitType || ''),
        price: String(v?.price ?? ''),
        mrp: String(v?.mrp ?? ''),
        discount: String(
          v?.discount ?? calculateDiscountPercent(String(v?.mrp ?? ''), String(v?.price ?? ''))
        ),
        stock: String(v?.stock ?? ''),
        unit: String(v?.unit || product.unit || 'piece'),
        unitType: String(v?.unitType || v?.label || ''),
        isDefault: Boolean(v?.isDefault || i === 0),
      }))
    );
  }, [product]);

  const subCategories = subCategoriesOf(catId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setNewFiles(picked);
    setNewPreviews(picked.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (url: string) =>
    setExistingImages((prev) => prev.filter((img) => img !== url));

  const handleSubmit = async () => {
    setError('');
    try {
      await onSave(product._id, {
        name,
        price,
        mrp,
        discount,
        stock,
        catId,
        subcategoryId,
        existingImages,
        newFiles,
        variants,
        unit: product.unit || 'piece',
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Update failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Edit Product</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
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
              onChange={(e) => {
                setCatId(e.target.value);
                setSubcategoryId('');
              }}
            >
              <option value="">Select category</option>
              {parentCategories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="border px-3 py-2 rounded text-sm"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!catId || subCategories.length === 0}
            >
              <option value="">No sub-category</option>
              {subCategories.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
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
              onChange={(e) => {
                setPrice(e.target.value);
                setDiscount(calculateDiscountPercent(mrp, e.target.value));
              }}
            />
            <input
              className="border px-3 py-2 rounded text-sm"
              placeholder="MRP (₹)"
              type="number"
              value={mrp}
              onChange={(e) => {
                setMrp(e.target.value);
                setDiscount(calculateDiscountPercent(e.target.value, price));
              }}
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

          {/* Variants */}
          <VariantEditor variants={variants} onChange={setVariants} />

          {/* Images */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Images</p>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      alt={`existing-${i}`}
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://via.placeholder.com/64?text=No+Img';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img)}
                      title="Remove image"
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new */}
            <label className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors block">
              <p className="text-slate-500 text-sm">📷 Add / replace images</p>
              <p className="text-slate-400 text-xs mt-0.5">
                JPEG · PNG · WEBP · SVG — max 5MB each
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {newPreviews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {newPreviews.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`new-preview-${i}`}
                    className="w-16 h-16 object-cover rounded-lg border-2 border-emerald-300"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50 rounded-b-xl">
          <button
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm transition-colors"
            onClick={onClose}
            disabled={updating}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
            onClick={handleSubmit}
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
