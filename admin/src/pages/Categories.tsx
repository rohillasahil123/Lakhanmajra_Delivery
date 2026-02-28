import React, { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Category = {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  priority?: number;
  parentCategory?: string | { _id?: string; name?: string } | null;
};

export default function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState('');
  const [priority, setPriority] = useState(0);
  const [parentCategory, setParentCategory] = useState('');
  const [subCategoriesInput, setSubCategoriesInput] = useState('');
  const [showCreateSubCategory, setShowCreateSubCategory] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [editParentCategory, setEditParentCategory] = useState('');
  const [editSubCategoriesInput, setEditSubCategoriesInput] = useState('');
  const [showEditSubCategory, setShowEditSubCategory] = useState(false);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [activeList, setActiveList] = useState<'category' | 'subcategory'>('category');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await api.get('/categories');
      const payload = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  useEffect(() => {
    (async () => {
      setPermissions(await getPermissions());
      await load();
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p);

  const getParentCategoryId = (category: Category): string => {
    if (!category.parentCategory) return '';
    if (typeof category.parentCategory === 'string') return category.parentCategory;
    return category.parentCategory._id || '';
  };

  const categoryNameById = (id: string): string => {
    if (!id) return '-';
    return items.find((category) => category._id === id)?.name || 'Unknown';
  };

  const create = async () => {
    const parsedSubCategories = showCreateSubCategory
      ? subCategoriesInput
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    if (!name && parsedSubCategories.length === 0) {
      return alert('Category name ya sub-categories required');
    }

    if (!name && parsedSubCategories.length > 0 && !parentCategory) {
      return alert('Sirf sub-categories add karne ke liye parent category select karein');
    }

    try {
      let createdCategoryId = '';

      if (name) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('priority', String(priority));
        if (parentCategory) formData.append('parentCategory', parentCategory);
        if (createImageFile) formData.append('image', createImageFile);

        const createRes = await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        createdCategoryId = createRes.data?.data?._id || createRes.data?._id || '';
      }

      if (parsedSubCategories.length > 0) {
        const subCategoryParentId = parentCategory || createdCategoryId;
        if (!subCategoryParentId) {
          throw new Error('Sub-category parent not found');
        }

        await Promise.all(
          parsedSubCategories.map((subCategoryName) => {
            const subCategoryFormData = new FormData();
            subCategoryFormData.append('name', subCategoryName);
            subCategoryFormData.append('priority', '0');
            subCategoryFormData.append('parentCategory', subCategoryParentId);
            return api.post('/categories', subCategoryFormData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          })
        );
      }

      setName('');
      setPriority(0);
      setParentCategory('');
      setSubCategoriesInput('');
      setShowCreateSubCategory(false);
      setCreateImageFile(null);
      setCreateImagePreview('');
      if (createFileInputRef.current) createFileInputRef.current.value = '';
      await load();
      if (parsedSubCategories.length > 0) {
        alert(`Category/Sub-categories created (${parsedSubCategories.length} sub-categories)`);
      } else {
        alert('Category created');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c._id);
    setEditName(c.name);
    setEditIcon(c.image || '');
    setEditPriority(c.priority || 0);
    setEditParentCategory(getParentCategoryId(c));
    setEditSubCategoriesInput('');
    setShowEditSubCategory(false);
    setEditRemoveImage(false);
    setEditImageFile(null);
    setEditImagePreview(c.image || '');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const saveEdit = async () => {
    if (!editingId || !editName) return alert('name required');
    const parsedSubCategories = showEditSubCategory
      ? editSubCategoriesInput
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    try {
      const formData = new FormData();
      formData.append('name', editName);
      formData.append('priority', String(editPriority));
      formData.append('parentCategory', editParentCategory);
      if (editRemoveImage) formData.append('icon', '');
      else if (editIcon) formData.append('icon', editIcon);
      if (editImageFile) formData.append('image', editImageFile);

      await api.patch(`/categories/${editingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (parsedSubCategories.length > 0) {
        await Promise.all(
          parsedSubCategories.map((subCategoryName) => {
            const subCategoryFormData = new FormData();
            subCategoryFormData.append('name', subCategoryName);
            subCategoryFormData.append('priority', '0');
            subCategoryFormData.append('parentCategory', editingId);
            return api.post('/categories', subCategoryFormData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          })
        );
      }

      setEditingId(null);
      setEditParentCategory('');
      setEditSubCategoriesInput('');
      setShowEditSubCategory(false);
      setEditRemoveImage(false);
      setEditImageFile(null);
      setEditImagePreview('');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      await load();
      if (parsedSubCategories.length > 0) {
        alert(`Category updated + ${parsedSubCategories.length} sub-categories added`);
      } else {
        alert('Category updated');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
      alert('Category deleted');
    } catch (err: any) {
      console.log(err, "ty")
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const mainCategories = items.filter((category) => !getParentCategoryId(category));
  const subCategories = items.filter((category) => !!getParentCategoryId(category));
  const displayItems = mainCategories.slice((page - 1) * limit, page * limit);
  const totalPages = Math.max(1, Math.ceil(mainCategories.length / limit));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 border rounded text-sm ${activeList === 'category' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300'}`}
            onClick={() => {
              setActiveList('category');
              setPage(1);
            }}
          >
            Main Category
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 border rounded text-sm ${activeList === 'subcategory' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300'}`}
            onClick={() => setActiveList('subcategory')}
          >
            Sub-category
          </button>
        </div>
      </div>

      {hasPerm('categories:create') && (
        <div className="mb-4 bg-white p-4 rounded shadow">
          <div className="flex gap-2 items-center flex-wrap">
            <input className="border px-3 py-2 rounded" placeholder="name" value={name} onChange={e => setName(e.target.value)} />
            <input className="border px-3 py-2 rounded w-28" placeholder="priority" type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} />
            <select
              className="border px-3 py-2 rounded"
              value={parentCategory}
              onChange={e => setParentCategory(e.target.value)}
            >
              <option value="">Main category (no parent)</option>
              {items
                .filter((category) => !getParentCategoryId(category))
                .map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
            </select>
            <button
              type="button"
              className="border border-slate-300 px-3 py-2 rounded text-slate-700"
              onClick={() => setShowCreateSubCategory((prev) => !prev)}
            >
              {showCreateSubCategory ? 'Hide Sub-category' : 'Sub-category'}
            </button>
            {showCreateSubCategory && (
              <input
                className="border px-3 py-2 rounded min-w-[280px]"
                placeholder="Sub-categories (comma separated) e.g. sabun, oil, shampoo"
                value={subCategoriesInput}
                onChange={e => setSubCategoriesInput(e.target.value)}
              />
            )}
            <input
              ref={createFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="border px-3 py-2 rounded"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCreateImageFile(file);
                setCreateImagePreview(file ? URL.createObjectURL(file) : '');
              }}
            />
            <button className="bg-sky-600 text-white px-4 rounded" onClick={create}>Create</button>
          </div>
          {createImagePreview && (
            <div className="mt-3">
              <img src={createImagePreview} alt="category-preview" className="w-16 h-16 object-cover rounded border" />
            </div>
          )}
        </div>
      )}

      {activeList === 'category' && (
      <>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Parent</th>
              <th className="p-3">Priority</th>
              {(hasPerm('categories:update') || hasPerm('categories:delete')) && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayItems.map(c => (
              <tr key={c._id} className="border-b last:border-0">
                <td className="p-3">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-10 h-10 object-cover rounded border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x40?text=No+Img';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-center">No</div>
                  )}
                </td>
                <td className="p-3">
                  {editingId === c._id ? (
                    <input className="border px-2 py-1 rounded" value={editName} onChange={e => setEditName(e.target.value)} />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="p-3">{c.slug ?? '-'}</td>
                <td className="p-3">{categoryNameById(getParentCategoryId(c))}</td>
                <td className="p-3">
                  {editingId === c._id ? (
                    <input className="border px-2 py-1 w-20 rounded" type="number" value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} />
                  ) : (
                    c.priority ?? 0
                  )}
                </td>
                {(hasPerm('categories:update') || hasPerm('categories:delete')) && (
                  <td className="p-3 flex gap-2">
                    {editingId === c._id ? (
                      <>
                        <input
                          className="border px-2 py-1 rounded"
                          placeholder="image url (optional)"
                          value={editIcon}
                          onChange={e => {
                            setEditIcon(e.target.value);
                            setEditRemoveImage(false);
                          }}
                        />
                        <select
                          className="border px-2 py-1 rounded"
                          value={editParentCategory}
                          onChange={e => setEditParentCategory(e.target.value)}
                        >
                          <option value="">Main category (no parent)</option>
                          {items
                            .filter((category) => !getParentCategoryId(category) && category._id !== c._id)
                            .map((category) => (
                              <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="border border-slate-300 px-2 py-1 rounded text-slate-700 text-sm"
                          onClick={() => setShowEditSubCategory((prev) => !prev)}
                        >
                          {showEditSubCategory ? 'Hide Sub-category' : 'Sub-category'}
                        </button>
                        {showEditSubCategory && (
                          <input
                            className="border px-2 py-1 rounded min-w-[260px]"
                            placeholder="Add sub-categories (comma separated)"
                            value={editSubCategoriesInput}
                            onChange={e => setEditSubCategoriesInput(e.target.value)}
                          />
                        )}
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                          className="border px-2 py-1 rounded"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setEditImageFile(file);
                            setEditRemoveImage(false);
                            setEditImagePreview(file ? URL.createObjectURL(file) : '');
                          }}
                        />
                        {editImagePreview && (
                          <img src={editImagePreview} alt="edit-preview" className="w-10 h-10 object-cover rounded border" />
                        )}
                        <button
                          type="button"
                          className="px-2 py-1 border border-red-300 text-red-600 text-sm rounded"
                          onClick={() => {
                            if (!confirm('Remove this image?')) return;
                            setEditRemoveImage(true);
                            setEditIcon('');
                            setEditImageFile(null);
                            setEditImagePreview('');
                            if (editFileInputRef.current) editFileInputRef.current.value = '';
                          }}
                        >
                          Remove image
                        </button>
                        <button className="px-2 py-1 bg-green-600 text-white text-sm rounded" onClick={saveEdit}>Save</button>
                        <button
                          className="px-2 py-1 bg-gray-200 text-sm rounded"
                          onClick={() => {
                            setEditingId(null);
                            setEditParentCategory('');
                            setEditSubCategoriesInput('');
                            setShowEditSubCategory(false);
                            setEditRemoveImage(false);
                            setEditImageFile(null);
                            setEditImagePreview('');
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {hasPerm('categories:update') && (
                          <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={() => startEdit(c)}>Edit</button>
                        )}
                        {hasPerm('categories:delete') && (
                          <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteCategory(c._id)}>Delete</button>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-slate-500">Main Categories: {mainCategories.length}</div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      </>
      )}

      {activeList === 'subcategory' && (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Sub-categories</h3>
        </div>

        <div className="bg-white rounded shadow overflow-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Parent</th>
                <th className="p-3">Priority</th>
                {(hasPerm('categories:update') || hasPerm('categories:delete')) && <th className="p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {subCategories.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>No sub-categories found</td>
                </tr>
              ) : (
                subCategories.map(c => (
                  <tr key={c._id} className="border-b last:border-0">
                    <td className="p-3">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-10 h-10 object-cover rounded border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x40?text=No+Img';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-center">No</div>
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === c._id ? (
                        <input className="border px-2 py-1 rounded" value={editName} onChange={e => setEditName(e.target.value)} />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="p-3">{c.slug ?? '-'}</td>
                    <td className="p-3">{categoryNameById(getParentCategoryId(c))}</td>
                    <td className="p-3">
                      {editingId === c._id ? (
                        <input className="border px-2 py-1 w-20 rounded" type="number" value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} />
                      ) : (
                        c.priority ?? 0
                      )}
                    </td>
                    {(hasPerm('categories:update') || hasPerm('categories:delete')) && (
                      <td className="p-3 flex gap-2">
                        {editingId === c._id ? (
                          <>
                            <input
                              className="border px-2 py-1 rounded"
                              placeholder="image url (optional)"
                              value={editIcon}
                              onChange={e => {
                                setEditIcon(e.target.value);
                                setEditRemoveImage(false);
                              }}
                            />
                            <select
                              className="border px-2 py-1 rounded"
                              value={editParentCategory}
                              onChange={e => setEditParentCategory(e.target.value)}
                            >
                              <option value="">Main category (no parent)</option>
                              {items
                                .filter((category) => !getParentCategoryId(category) && category._id !== c._id)
                                .map((category) => (
                                  <option key={category._id} value={category._id}>{category.name}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">Sub-category image:</span>
                              <input
                                ref={editFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                className="border px-2 py-1 rounded"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setEditImageFile(file);
                                  setEditRemoveImage(false);
                                  setEditImagePreview(file ? URL.createObjectURL(file) : c.image || '');
                                }}
                              />
                              {editImagePreview && (
                                <img src={editImagePreview} alt="edit-preview" className="w-10 h-10 object-cover rounded border" />
                              )}
                              <button
                                type="button"
                                className="px-2 py-1 border border-red-300 text-red-600 text-sm rounded"
                                onClick={() => {
                                  if (!confirm('Remove this image?')) return;
                                  setEditRemoveImage(true);
                                  setEditIcon('');
                                  setEditImageFile(null);
                                  setEditImagePreview('');
                                  if (editFileInputRef.current) editFileInputRef.current.value = '';
                                }}
                              >
                                Remove image
                              </button>
                            </div>
                            <button className="px-2 py-1 bg-green-600 text-white text-sm rounded" onClick={saveEdit}>Save</button>
                            <button
                              className="px-2 py-1 bg-gray-200 text-sm rounded"
                              onClick={() => {
                                setEditingId(null);
                                setEditParentCategory('');
                                setEditSubCategoriesInput('');
                                setShowEditSubCategory(false);
                                setEditRemoveImage(false);
                                setEditImageFile(null);
                                setEditImagePreview('');
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {hasPerm('categories:update') && (
                              <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={() => startEdit(c)}>Edit</button>
                            )}
                            {hasPerm('categories:delete') && (
                              <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteCategory(c._id)}>Delete</button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-sm text-slate-500">Total Sub-categories: {subCategories.length}</div>
      </div>
      )}
    </div>
  );
}

