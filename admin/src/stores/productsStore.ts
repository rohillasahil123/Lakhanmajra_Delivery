import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '@/api/client';
import { sanitizeError } from '@/utils/errorHandler';

export interface ProductVariant {
  _id?: string;
  label: string;
  price: number;
  mrp: number;
  discount?: number;
  stock: number;
  isDefault?: boolean;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  categoryId: { _id: string; name: string };
  variants: ProductVariant[];
  image?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsState {
  products: IProduct[];
  filteredProducts: IProduct[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  selectedCategory: string | null;
  searchQuery: string;
  sortBy: 'price' | 'name' | 'createdAt' | '-createdAt';
  
  // Pagination
  currentPage: number;
  limit: number;
  total: number;
  
  // Actions
  setProducts: (products: IProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filter actions
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'price' | 'name' | 'createdAt' | '-createdAt') => void;
  setPagination: (page: number, limit: number) => void;
  
  // Async actions
  fetchProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
  }) => Promise<void>;
  
  createProduct: (productData: FormData) => Promise<IProduct>;
  updateProduct: (id: string, productData: FormData | Partial<IProduct>) => Promise<IProduct>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStatus: (id: string, isActive: boolean) => Promise<void>;
  
  // Filter helpers
  applyFilters: () => void;
  resetFilters: () => void;
  clearCache: () => void;
}

export const useProductsStore = create<ProductsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      products: [],
      filteredProducts: [],
      isLoading: false,
      error: null,
      
      selectedCategory: null,
      searchQuery: '',
      sortBy: 'createdAt',
      
      currentPage: 1,
      limit: 20,
      total: 0,

      // Setters
      setProducts: (products) => {
        set({ products }, false, 'setProducts');
        get().applyFilters();
      },
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setError: (error) => set({ error }, false, 'setError'),

      // Filter setters
      setSelectedCategory: (category) => {
        set({ selectedCategory: category }, false, 'setSelectedCategory');
        get().applyFilters();
      },
      setSearchQuery: (query) => {
        set({ searchQuery: query }, false, 'setSearchQuery');
        get().applyFilters();
      },
      setSortBy: (sort) => {
        set({ sortBy: sort }, false, 'setSortBy');
        get().applyFilters();
      },
      setPagination: (page, limit) => {
        set({ currentPage: page, limit }, false, 'setPagination');
      },

      // Apply client-side filters and sorting
      applyFilters: () => {
        const { products, selectedCategory, searchQuery, sortBy } = get();
        
        let filtered = [...products];

        // Filter by category
        if (selectedCategory) {
          filtered = filtered.filter(
            (p) => p.categoryId?._id === selectedCategory
          );
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.description?.toLowerCase().includes(query) ||
              p.tags?.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        // Sort
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'price':
              return (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0);
            case 'name':
              return a.name.localeCompare(b.name);
            case '-createdAt':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'createdAt':
            default:
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
        });

        set({ filteredProducts: filtered, total: filtered.length }, false, 'applyFilters');
      },

      resetFilters: () => {
        set({
          selectedCategory: null,
          searchQuery: '',
          sortBy: 'createdAt',
          currentPage: 1,
        }, false, 'resetFilters');
        get().applyFilters();
      },

      // Async: Fetch products
      fetchProducts: async (params = {}) => {
        try {
          set({ isLoading: true, error: null });

          const queryParams = {
            page: params.page || get().currentPage,
            limit: params.limit || get().limit,
            ...(params.category && { category: params.category }),
            ...(params.search && { search: params.search }),
            ...(params.sort && { sort: params.sort }),
          };

          const response = await api.get('/products', { params: queryParams });
          
          if (response.data?.data) {
            set({
              products: response.data.data,
              total: response.data.total || response.data.data.length,
              currentPage: queryParams.page,
            });
            get().applyFilters();
          }
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage, products: [], filteredProducts: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Create product
      createProduct: async (productData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.post('/products', productData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (response.data?.data) {
            const newProduct = response.data.data;
            set({ products: [newProduct, ...get().products] });
            get().applyFilters();
            return newProduct;
          }
          
          throw new Error('No data in response');
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Update product
      updateProduct: async (id, productData) => {
        try {
          set({ isLoading: true, error: null });
          const isFormData = productData instanceof FormData;
          
          const response = await api.patch(`/products/${id}`, productData, {
            ...(isFormData && { headers: { 'Content-Type': 'multipart/form-data' } }),
          });
          
          if (response.data?.data) {
            const updatedProduct = response.data.data;
            set({
              products: get().products.map((p) => (p._id === id ? updatedProduct : p)),
            });
            get().applyFilters();
            return updatedProduct;
          }
          
          throw new Error('No data in response');
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Delete product
      deleteProduct: async (id) => {
        try {
          set({ isLoading: true, error: null });
          await api.delete(`/products/${id}`);
          set({ products: get().products.filter((p) => p._id !== id) });
          get().applyFilters();
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Toggle product status
      toggleProductStatus: async (id, isActive) => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.patch(`/products/${id}/status`, { isActive });
          
          if (response.data?.data) {
            const updatedProduct = response.data.data;
            set({
              products: get().products.map((p) => (p._id === id ? updatedProduct : p)),
            });
            get().applyFilters();
          }
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Cache: Clear all
      clearCache: () => {
        set({
          products: [],
          filteredProducts: [],
          selectedCategory: null,
          searchQuery: '',
          sortBy: 'createdAt',
          currentPage: 1,
          total: 0,
          error: null,
        }, false, 'clearCache');
      },
    }),
    { name: 'ProductsStore' }
  )
);
