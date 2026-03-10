import React, { useRef, useState, useEffect } from 'react';
import api from '../../api/client';

type Category = { _id: string; name: string; image?: string; priority?: number; parentCategory?: any };

interface Props {
  category: Category;
  parentCategories: Category[];
  subCategories: Category[]; // existing sub-cats of this category
  onClose: () => void;
  onSaved: () => void;
}

export default function EditCategoryModal({ category, parentCategories, subCategories, onClose, onSaved }: Props) {
  const [name,      setName]      = useState(category.name);
  const [priority,  setPriority]  = useState(category.priority ?? 0);
  const [parent,    setParent]    = useState(() => {
    if (!category.parentCategory) return '';
    if (typeof category.parentCategory === 'string') return category.parentCategory;
    return category.parentCategory._id || category.parentCategory.id || '';
  });
  const [preview,   setPreview]   = useState(category.image || '');
  const [file,      setFile]      = useState<File | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [newSubInput, setNewSubInput] = useState('');
  const [showNewSub,  setShowNewSub]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) return setError('Name required');
    const newSubs = showNewSub ? newSubInput.split(',').map((s) => s.trim()).filter(Boolean) : [];

    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('priority', String(priority));
      fd.append('parentCategory', parent);
      if (removeImg) fd.append('icon', '');
      if (file)      fd.append('image', file);
      await api.patch(`/categories/${category._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (newSubs.length > 0) {
        await Promise.all(newSubs.map((s) => {
          const fd2 = new FormData();
          fd2.append('name', s); fd2.append('priority', '0'); fd2.append('parentCategory', category._id);
          return api.post('/categories', fd2, { headers: { 'Content-Type': 'multipart/form-data' } });
        }));
      }

      onSaved(); onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const deleteSubCat = async (subId: string, subName: string) => {
    if (!confirm(`Delete sub-category "${subName}"?`)) return;
    try {
      await api.delete(`/categories/${subId}`);
      onSaved(); // refresh
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-800">Edit Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">{category.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

          {/* Name + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <input className="border px-3 py-2 rounded w-full text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Priority</label>
              <input type="number" className="border px-3 py-2 rounded w-full text-sm"
                value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Parent</label>
              <select className="border px-3 py-2 rounded w-full text-sm" value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">None (main category)</option>
                {parentCategories.filter((c) => c._id !== category._id).map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Image</label>
            <div className="flex items-center gap-3">
              {preview && !removeImg ? (
                <div className="relative group">
                  <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/56?text=No'; }} />
                  <button type="button"
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setRemoveImg(true); setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}>×</button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">No img</div>
              )}
              <label className="cursor-pointer px-3 py-2 border rounded text-sm bg-slate-50 hover:bg-slate-100 transition-colors">
                📷 {preview && !removeImg ? 'Replace' : 'Upload'}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f); setRemoveImg(false); setPreview(f ? URL.createObjectURL(f) : '');
                  }} />
              </label>
            </div>
          </div>

          {/* Existing sub-categories */}
          {subCategories.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium">
                Sub-categories ({subCategories.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {subCategories.map((sub) => (
                  <div key={sub._id} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm text-slate-600">
                    {sub.name}
                    <button type="button"
                      className="text-slate-400 hover:text-red-500 ml-1 transition-colors leading-none"
                      onClick={() => deleteSubCat(sub._id, sub.name)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new sub-categories */}
          <div>
            <button type="button"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              onClick={() => setShowNewSub((v) => !v)}>
              {showNewSub ? '▾' : '▸'} Add more sub-categories
            </button>
            {showNewSub && (
              <div className="mt-2">
                <input className="border px-3 py-2 rounded w-full text-sm"
                  placeholder="e.g. Dal, Chawal (comma separated)"
                  value={newSubInput} onChange={(e) => setNewSubInput(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-slate-50 rounded-b-xl">
          <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm"
            onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}