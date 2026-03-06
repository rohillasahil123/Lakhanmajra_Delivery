import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';

type Category = {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  priority?: number;
  parentCategory?: string | { _id?: string; name?: string } | null;
};

interface Props {
  onClose: () => void;
  onCategoriesChanged?: () => void; // so Products page can reload categories
}

export default function CategoryManagerModal({ onClose, onCategoriesChanged }: Props) {
  const [items,       setItems]       = useState<Category[]>([]);
  const [activeTab,   setActiveTab]   = useState<'main' | 'sub'>('main');
  const [loading,     setLoading]     = useState(false);

  // ── create form ──────────────────────────────────────────────────────────
  const [cName,       setCName]       = useState('');
  const [cPriority,   setCPriority]   = useState(0);
  const [cParent,     setCParent]     = useState('');
  const [cSubInput,   setCSubInput]   = useState('');
  const [cShowSub,    setCShowSub]    = useState(false);
  const [cFile,       setCFile]       = useState<File | null>(null);
  const [cPreview,    setCPreview]    = useState('');
  const cFileRef = useRef<HTMLInputElement>(null);

  // ── edit ─────────────────────────────────────────────────────────────────
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [eName,       setEName]       = useState('');
  const [ePriority,   setEPriority]   = useState(0);
  const [eParent,     setEParent]     = useState('');
  const [eSubInput,   setESubInput]   = useState('');
  const [eShowSub,    setEShowSub]    = useState(false);
  const [eFile,       setEFile]       = useState<File | null>(null);
  const [ePreview,    setEPreview]    = useState('');
  const [eRemoveImg,  setERemoveImg]  = useState(false);
  const eFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res     = await api.get('/categories');
      const payload = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getParentId = (c: Category): string => {
    if (!c.parentCategory) return '';
    if (typeof c.parentCategory === 'string') return c.parentCategory;
    return c.parentCategory._id || '';
  };

  const nameById = (id: string) => items.find((c) => c._id === id)?.name || '-';

  const mainCategories = items.filter((c) => !getParentId(c));
  const subCategories  = items.filter((c) => !!getParentId(c));

  // ── create ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const subs = cShowSub ? cSubInput.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (!cName && subs.length === 0) return alert('Category name required');
    if (!cName && subs.length > 0 && !cParent) return alert('Select parent for sub-categories');

    try {
      let createdId = '';
      if (cName) {
        const fd = new FormData();
        fd.append('name', cName);
        fd.append('priority', String(cPriority));
        if (cParent) fd.append('parentCategory', cParent);
        if (cFile)   fd.append('image', cFile);
        const res = await api.post('/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        createdId = res.data?.data?._id || res.data?._id || '';
      }

      if (subs.length > 0) {
        const parentId = cParent || createdId;
        if (!parentId) throw new Error('Parent not found');
        await Promise.all(subs.map((s) => {
          const fd = new FormData();
          fd.append('name', s);
          fd.append('priority', '0');
          fd.append('parentCategory', parentId);
          return api.post('/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }));
      }

      setCName(''); setCPriority(0); setCParent(''); setCSubInput('');
      setCShowSub(false); setCFile(null); setCPreview('');
      if (cFileRef.current) cFileRef.current.value = '';
      await load();
      onCategoriesChanged?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────

  const startEdit = (c: Category) => {
    setEditingId(c._id);
    setEName(c.name);
    setEPriority(c.priority || 0);
    setEParent(getParentId(c));
    setESubInput(''); setEShowSub(false);
    setEFile(null); setEPreview(c.image || ''); setERemoveImg(false);
    if (eFileRef.current) eFileRef.current.value = '';
  };

  const cancelEdit = () => {
    setEditingId(null); setEName(''); setEPriority(0); setEParent('');
    setESubInput(''); setEShowSub(false); setEFile(null); setEPreview(''); setERemoveImg(false);
  };

  const handleSave = async () => {
    if (!editingId || !eName) return alert('Name required');
    const subs = eShowSub ? eSubInput.split(',').map((s) => s.trim()).filter(Boolean) : [];
    try {
      const fd = new FormData();
      fd.append('name', eName);
      fd.append('priority', String(ePriority));
      fd.append('parentCategory', eParent);
      if (eRemoveImg) fd.append('icon', '');
      if (eFile)      fd.append('image', eFile);
      await api.patch(`/categories/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (subs.length > 0) {
        await Promise.all(subs.map((s) => {
          const fd2 = new FormData();
          fd2.append('name', s);
          fd2.append('priority', '0');
          fd2.append('parentCategory', editingId);
          return api.post('/categories', fd2, { headers: { 'Content-Type': 'multipart/form-data' } });
        }));
      }
      cancelEdit();
      await load();
      onCategoriesChanged?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
      onCategoriesChanged?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  // ── render row ────────────────────────────────────────────────────────────

  const renderRow = (c: Category, isSubCat = false) => {
    const isEditing = editingId === c._id;
    return (
      <tr key={c._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
        {/* Image */}
        <td className="px-3 py-2.5">
          {isEditing ? (
            <div className="flex items-center gap-2">
              {ePreview && !eRemoveImg ? (
                <img src={ePreview} alt="preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">No</div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors">
                  Browse
                  <input ref={eFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setEFile(f); setERemoveImg(false);
                      setEPreview(f ? URL.createObjectURL(f) : '');
                    }} />
                </label>
                {(ePreview || c.image) && !eRemoveImg && (
                  <button type="button" className="text-xs text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 rounded transition-colors"
                    onClick={() => { setERemoveImg(true); setEFile(null); setEPreview(''); }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ) : c.image ? (
            <img src={c.image} alt={c.name}
              className="w-10 h-10 object-cover rounded-lg border border-slate-200"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No'; }} />
          ) : (
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-center">No</div>
          )}
        </td>

        {/* Name */}
        <td className="px-3 py-2.5">
          {isEditing ? (
            <input className="border px-2 py-1.5 rounded text-sm w-full" value={eName} onChange={(e) => setEName(e.target.value)} />
          ) : (
            <span className="text-sm font-medium text-slate-700">{c.name}</span>
          )}
        </td>

        {/* Parent (only for sub tab) */}
        {isSubCat && (
          <td className="px-3 py-2.5">
            {isEditing ? (
              <select className="border px-2 py-1.5 rounded text-sm" value={eParent} onChange={(e) => setEParent(e.target.value)}>
                <option value="">— Main category —</option>
                {mainCategories.filter((mc) => mc._id !== c._id).map((mc) => (
                  <option key={mc._id} value={mc._id}>{mc.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{nameById(getParentId(c))}</span>
            )}
          </td>
        )}

        {/* Priority */}
        <td className="px-3 py-2.5">
          {isEditing ? (
            <input type="number" className="border px-2 py-1.5 rounded text-sm w-16" value={ePriority} onChange={(e) => setEPriority(Number(e.target.value))} />
          ) : (
            <span className="text-xs text-slate-400">{c.priority ?? 0}</span>
          )}
        </td>

        {/* Add sub-categories (only in edit mode for main cats) */}
        {!isSubCat && isEditing && (
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEShowSub((v) => !v)}
                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors">
                {eShowSub ? 'Hide' : '+ Add Sub-cats'}
              </button>
              {eShowSub && (
                <input className="border px-2 py-1 rounded text-xs flex-1 min-w-[160px]"
                  placeholder="e.g. sabun, oil, shampoo"
                  value={eSubInput} onChange={(e) => setESubInput(e.target.value)} />
              )}
            </div>
          </td>
        )}
        {!isSubCat && !isEditing && <td className="px-3 py-2.5" />}

        {/* Actions */}
        <td className="px-3 py-2.5">
          {isEditing ? (
            <div className="flex gap-1.5">
              <button className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors" onClick={handleSave}>Save</button>
              <button className="px-3 py-1.5 bg-slate-200 text-xs rounded hover:bg-slate-300 transition-colors" onClick={cancelEdit}>Cancel</button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button title="Edit" onClick={() => startEdit(c)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                </svg>
              </button>
              <button title="Delete" onClick={() => handleDelete(c._id)}
                className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                </svg>
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Manage Categories</h3>
            <p className="text-xs text-slate-400 mt-0.5">{mainCategories.length} main · {subCategories.length} sub-categories</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(['main', 'sub'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {tab === 'main' ? `Main (${mainCategories.length})` : `Sub-categories (${subCategories.length})`}
            </button>
          ))}
        </div>

        {/* Create form */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {activeTab === 'main' ? 'Create New Category' : 'Create New Sub-category'}
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <input className="border px-3 py-2 rounded text-sm" placeholder="Name *" value={cName} onChange={(e) => setCName(e.target.value)} />
            <input type="number" className="border px-3 py-2 rounded text-sm w-24" placeholder="Priority" value={cPriority} onChange={(e) => setCPriority(Number(e.target.value))} />

            {/* Parent selector */}
            <select className="border px-3 py-2 rounded text-sm" value={cParent} onChange={(e) => setCParent(e.target.value)}>
              <option value="">
                {activeTab === 'main' ? 'No parent (main category)' : 'Select parent *'}
              </option>
              {mainCategories.map((mc) => (
                <option key={mc._id} value={mc._id}>{mc.name}</option>
              ))}
            </select>

            {/* Sub-categories bulk add (main tab only) */}
            {activeTab === 'main' && (
              <>
                <button type="button" onClick={() => setCShowSub((v) => !v)}
                  className="text-sm px-3 py-2 border rounded hover:bg-slate-100 transition-colors">
                  {cShowSub ? 'Hide' : '+ Sub-cats'}
                </button>
                {cShowSub && (
                  <input className="border px-3 py-2 rounded text-sm min-w-[220px]"
                    placeholder="dal, chawal, atta (comma separated)"
                    value={cSubInput} onChange={(e) => setCSubInput(e.target.value)} />
                )}
              </>
            )}

            {/* Image */}
            <label className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors">
              📷 Image
              <input ref={cFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setCFile(f); setCPreview(f ? URL.createObjectURL(f) : '');
                }} />
            </label>
            {cPreview && <img src={cPreview} alt="preview" className="w-9 h-9 object-cover rounded-lg border border-slate-200" />}

            <button onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors font-medium">
              Create
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 px-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5 font-medium">Image</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  {activeTab === 'sub' && <th className="px-3 py-2.5 font-medium">Parent</th>}
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  {activeTab === 'main' && <th className="px-3 py-2.5 font-medium">Sub-categories</th>}
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'main'
                  ? mainCategories.length === 0
                    ? <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">No categories yet</td></tr>
                    : mainCategories.map((c) => renderRow(c, false))
                  : subCategories.length === 0
                    ? <tr><td colSpan={4} className="py-10 text-center text-slate-400 text-sm">No sub-categories yet</td></tr>
                    : subCategories.map((c) => renderRow(c, true))
                }
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-slate-50 rounded-b-xl flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}