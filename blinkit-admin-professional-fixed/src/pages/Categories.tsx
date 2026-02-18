import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import type { Category } from '../types';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', image: '', order: '' });

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permsRes, catsRes] = await Promise.all([getPermissions(), api.get('/categories')]);
      setPermissions(permsRes);
      const apiCats = catsRes.data?.data ?? catsRes.data ?? [];
      const defaultCats: Category[] = [
        { _id: '65c9f1a4a3d2f9b00000001', name: 'Grocery', isActive: true, order: 1 },
        { _id: '65c9f1a4a3d2f9b00000002', name: 'Dairy & Breakfast', isActive: true, order: 2 },
        { _id: '65c9f1a4a3d2f9b00000003', name: 'Snacks & Branded Foods', isActive: true, order: 3 },
        { _id: '65c9f1a4a3d2f9b00000004', name: 'Staples', isActive: true, order: 4 },
        { _id: '65c9f1a4a3d2f9b00000005', name: 'Beverages', isActive: true, order: 5 },
        { _id: '65c9f1a4a3d2f9b00000006', name: 'Household Essentials', isActive: true, order: 6 },
        { _id: '65c9f1a4a3d2f9b00000007', name: 'Personal Care', isActive: true, order: 7 },
      ];
      setCategories(Array.isArray(apiCats) ? [...defaultCats, ...apiCats] : defaultCats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '', order: '' });
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ 
      name: cat.name, 
      description: cat.description || '', 
      image: cat.image || '', 
      order: cat.order?.toString() || '' 
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '', order: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Category name is required');
      return;
    }
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        image: formData.image || undefined,
        order: formData.order ? Number(formData.order) : undefined,
      };
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      await loadData();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save category');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loading size="lg" text="Loading categories..." /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Organize your products by categories</p>
        </div>
        {hasPerm('categories:create') && (
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Category</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat._id} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{cat.name}</h3>
                {cat.description && <p className="text-sm text-gray-600 mt-1">{cat.description}</p>}
              </div>
              {(hasPerm('categories:update') || hasPerm('categories:delete')) && (
                <div className="flex items-center gap-2">
                  {hasPerm('categories:update') && (
                    <button onClick={() => openEditModal(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPerm('categories:delete') && (
                    <button onClick={() => deleteCategory(cat._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={`badge ${cat.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                {cat.isActive !== false ? 'Active' : 'Inactive'}
              </span>
              {cat.order && <span className="text-gray-500">Order: {cat.order}</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Create Category'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., Beverages" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Category description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
            <input type="text" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="input" placeholder="https://example.com/image.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value })} className="input" placeholder="1" />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button onClick={closeModal} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn-primary">{editingCategory ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;
