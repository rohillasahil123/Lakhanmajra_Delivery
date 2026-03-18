import {
  ProductVariant,
  createEmptyVariant,
  calculateDiscountPercent,
} from '../../hooks/useProducts';

interface Props {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

export default function VariantEditor({ variants, onChange }: Readonly<Props>) {
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
          No variants added. You can keep single base product or add manual variants like 500 g, 1 liter, family pack.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={v.clientKey || v._id || `${v.label}-${v.unit}-${v.price}-${v.stock}`} className="rounded-lg border border-slate-200 p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="border px-2 py-1 rounded text-xs"
                  placeholder="Variant label, e.g. 500 g"
                  value={v.label}
                  onChange={(e) => update(i, 'label', e.target.value)}
                />
                <input
                  className="border px-2 py-1 rounded text-xs"
                  placeholder="Unit, optional e.g. g, liter"
                  value={v.unit || ''}
                  onChange={(e) => update(i, 'unit', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-5 gap-1 items-center">
                <input
                  className="border px-2 py-1 rounded text-xs"
                  type="number"
                  placeholder="Price"
                  value={v.price}
                  onChange={(e) => update(i, 'price', e.target.value)}
                />
                <input
                  className="border px-2 py-1 rounded text-xs"
                  type="number"
                  placeholder="MRP"
                  value={v.mrp}
                  onChange={(e) => update(i, 'mrp', e.target.value)}
                />
                <input
                  className="border px-2 py-1 rounded text-xs bg-slate-50"
                  type="number"
                  value={v.discount}
                  readOnly
                  tabIndex={-1}
                />
                <input
                  className="border px-2 py-1 rounded text-xs"
                  type="number"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => update(i, 'stock', e.target.value)}
                />
                <div className="flex items-center gap-1 justify-end">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
