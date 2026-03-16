import React, { useRef, useState } from 'react';
import api from '../../api/client';

type Category = { _id: string; name: string; parentCategory?: any };

interface Props {
  parentCategories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export default function AddCategoryModal({ parentCategories, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(0);
  const [parent, setParent] = useState('');
  const [subInput, setSubInput] = useState('');
  const [showSub, setShowSub] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const subs = showSub
      ? subInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (!name && subs.length === 0) return setError('Category name required');
    if (!name && subs.length > 0 && !parent) return setError('Select parent for sub-categories');

    setSaving(true);
    setError('');
    try {
      let createdId = '';
      if (name) {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('priority', String(priority));
        if (parent) fd.append('parentCategory', parent);
        if (file) fd.append('image', file);
        const res = await api.post('/categories', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        createdId = res.data?.data?._id || res.data?._id || '';
      }

      if (subs.length > 0) {
        const pid = parent || createdId;
        if (!pid) throw new Error('Parent not found');
        await Promise.all(
          subs.map((s) => {
            const fd = new FormData();
            fd.append('name', s);
            fd.append('priority', '0');
            fd.append('parentCategory', pid);
            return api.post('/categories', fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          })
        );
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-slate-800">Add Category</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="cat-name" className="text-xs text-slate-500 mb-1 block">
                Category Name *
              </label>
              <input
                id="cat-name"
                className="border px-3 py-2 rounded w-full text-sm"
                placeholder="e.g. Vegetables & Fruit"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="cat-priority" className="text-xs text-slate-500 mb-1 block">
                Priority
              </label>
              <input
                id="cat-priority"
                type="number"
                className="border px-3 py-2 rounded w-full text-sm"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="cat-parent" className="text-xs text-slate-500 mb-1 block">
                Parent (for sub-category)
              </label>
              <select
                id="cat-parent"
                className="border px-3 py-2 rounded w-full text-sm"
                value={parent}
                onChange={(e) => setParent(e.target.value)}
              >
                <option value="">None (main category)</option>
                {parentCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <span className="text-xs text-slate-500 mb-1 block">Image (optional)</span>
            <div className="flex items-center gap-3">
              <label
                htmlFor="cat-image"
                className="cursor-pointer px-3 py-2 border rounded text-sm bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                📷 Choose Image
              </label>
              <input
                ref={fileRef}
                id="cat-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setPreview(f ? URL.createObjectURL(f) : '');
                }}
              />
              {preview && (
                <div className="relative group">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview('');
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-categories */}
          <div>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              onClick={() => setShowSub((v) => !v)}
            >
              {showSub ? '▾' : '▸'} Also add sub-categories
            </button>
            {showSub && (
              <div className="mt-2">
                <label htmlFor="cat-subcats" className="text-xs text-slate-500 mb-1 block">
                  Sub-category names (comma separated)
                </label>
                <input
                  id="cat-subcats"
                  className="border px-3 py-2 rounded w-full text-sm"
                  placeholder="e.g. Dal, Chawal, Atta"
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-slate-50 rounded-b-xl">
          <button
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm transition-colors"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
