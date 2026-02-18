import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import { formatCurrency, debounce } from '../utils/helpers';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import type { Product, Category } from '../types';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [search, setSearch] = useState('');
  
  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    stock: '',
    categoryId: '',
    unit: 'piece',
    images: '',
  });

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, search]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [permsRes, catsRes] = await Promise.all([
        getPermissions(),
        api.get('/categories')
      ]);

      setPermissions(permsRes);
      
      const apiCats = catsRes.data?.data ?? catsRes.data ?? [];
      const defaultCategories: Category[] = [
        { _id: '65c9f1a4a3d2f9b00000001', name: 'Grocery', isActive: true, order: 1 },
        { _id: '65c9f1a4a3d2f9b00000002', name: 'Dairy & Breakfast', isActive: true, order: 2 },
        { _id: '65c9f1a4a3d2f9b00000003', name: 'Snacks & Branded Foods', isActive: true, order: 3 },
        { _id: '65c9f1a4a3d2f9b00000004', name: 'Staples', isActive: true, order: 4 },
        { _id: '65c9f1a4a3d2f9b00000005', name: 'Beverages', isActive: true, order: 5 },
        { _id: '65c9f1a4a3d2f9b00000006', name: 'Household Essentials', isActive: true, order: 6 },
        { _id: '65c9f1a4a3d2f9b00000007', name: 'Personal Care', isActive: true, order: 7 },
      ];
      
      setCategories(Array.isArray(apiCats) ? [...defaultCategories, ...apiCats] : defaultCategories);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const searchParam = search ? `&q=${search}` : '';
      const res = await api.get(`/products?page=${page}&limit=${limit}${searchParam}`);
      const data = res.data?.data ?? res.data;
      setProducts(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const handleSearch = debounce((value: string) => {
    setSearch(value);
    setPage(1);
  }, 500);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      discountPrice: '',
      stock: '',
      categoryId: '',
      unit: 'piece',
      images: '',
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() || '',
      stock: product.stock?.toString() || '',
      categoryId: typeof product.categoryId === 'object' ? product.categoryId._id : product.categoryId || '',
      unit: product.unit || 'piece',
      images: product.images?.join(', ') || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      discountPrice: '',
      stock: '',
      categoryId: '',
      unit: 'piece',
      images: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      alert('Name, price, and category are required');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        stock: formData.stock ? Number(formData.stock) : undefined,
        categoryId: formData.categoryId,
        unit: formData.unit,
        images: formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      await loadProducts();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const getCategoryName = (product: Product): string => {
    if (!product.categoryId) return '—';
    if (typeof product.categoryId === 'object') return product.categoryId.name;
    const cat = categories.find(c => c._id === product.categoryId);
    return cat?.name || '—';
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loading size="lg" text="Loading products..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        {hasPerm('products:create') && (
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            onChange={(e) => handleSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Unit</th>
                {(hasPerm('products:update') || hasPerm('products:delete')) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-t hover:bg-gray-50 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{getCategoryName(product)}</span>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(product.discountPrice || product.price)}
                      </p>
                      {product.discountPrice && (
                        <p className="text-sm text-gray-500 line-through">
                          {formatCurrency(product.price)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      (product.stock || 0) > 10 ? 'badge-success' : 
                      (product.stock || 0) > 0 ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {product.stock || 0}
                    </span>
                  </td>
                  <td className="text-gray-600">{product.unit || 'piece'}</td>
                  {(hasPerm('products:update') || hasPerm('products:delete')) && (
                    <td>
                      <div className="flex items-center gap-2">
                        {hasPerm('products:update') && (
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPerm('products:delete') && (
                          <button
                            onClick={() => deleteProduct(product._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} products
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="btn btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="btn btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Create Product'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Fresh Milk 1L"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Product description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Price
              </label>
              <input
                type="number"
                value={formData.discountPrice}
                onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="input"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input"
              >
                <option value="piece">Piece</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="l">Liter (L)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="pack">Pack</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URLs (comma-separated)
              </label>
              <textarea
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                className="input"
                rows={2}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button onClick={closeModal} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn btn-primary">
              {editingProduct ? 'Update' : 'Create'} Product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
