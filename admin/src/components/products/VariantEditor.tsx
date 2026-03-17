import {
  ProductVariant,
  createEmptyVariant,
  calculateDiscountPercent,
} from '../../hooks/useProducts';

interface Props {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

export default function VariantEditor({ variants, onChange }: Props) {
  const addVariant = () => {
    const next = [...variants, createEmptyVariant()];
    if (next.length === 1 && next[0]) {
      next[0].isDefault = true;
    }
    onChange(next);
  };

  const removeVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((v) => v.isDefault) && next[0]) {
      next[0].isDefault = true;
    }
    onChange(next);
  };

  const setDefault = (index: number) => {
    onChange(variants.map((v, i) => ({ ...v, isDefault: i === index })));
  };

  const update = (index: number, field: keyof ProductVariant, value: string) => {
    onChange(
      variants.map((v, i) => {
        if (i !== index) return v;
        const updated = { ...v, [field]: value };
        if (field === 'price') updated.discount = calculateDiscountPercent(v.mrp, value);
        if (field === 'mrp') updated.discount = calculateDiscountPercent(value, v.price);
        return updated;
      })
    );
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-slate-700 text-sm">Variants (optional)</h4>
        <button
          type="button"
          className="text-xs px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
          onClick={addVariant}
        >
          + Add Variant
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-slate-400">
          No variants added. You can keep single base product or add 500g / 1kg / 2kg variants.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-1 text-[10px] text-slate-400 font-medium px-1">
            <span className="col-span-3">Label</span>
            <span className="col-span-2">Price</span>
            <span className="col-span-2">MRP</span>
            <span className="col-span-1">%</span>
            <span className="col-span-2">Stock</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 items-center">
              <input
                className="border px-2 py-1 rounded col-span-3 text-xs"
                placeholder="e.g. 500g"
                value={v.label}
                onChange={(e) => update(i, 'label', e.target.value)}
              />
              <input
                className="border px-2 py-1 rounded col-span-2 text-xs"
                type="number"
                placeholder="Price"
                value={v.price}
                onChange={(e) => update(i, 'price', e.target.value)}
              />
              <input
                className="border px-2 py-1 rounded col-span-2 text-xs"
                type="number"
                placeholder="MRP"
                value={v.mrp}
                onChange={(e) => update(i, 'mrp', e.target.value)}
              />
              <input
                className="border px-2 py-1 rounded col-span-1 text-xs bg-slate-50"
                type="number"
                value={v.discount}
                readOnly
                tabIndex={-1}
              />
              <input
                className="border px-2 py-1 rounded col-span-2 text-xs"
                type="number"
                placeholder="Stock"
                value={v.stock}
                onChange={(e) => update(i, 'stock', e.target.value)}
              />
              <div className="col-span-2 flex items-center gap-1 justify-end">
                <button
                  type="button"
                  title={v.isDefault ? 'Default variant' : 'Set as default'}
                  className={`text-[10px] px-1.5 py-1 rounded transition-colors ${
                    v.isDefault
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  onClick={() => setDefault(i)}
                >
                  {v.isDefault ? '✓' : 'Def'}
                </button>
                <button
                  type="button"
                  title="Remove variant"
                  className="text-[10px] px-1.5 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  onClick={() => removeVariant(i)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
