import { useCallback } from 'react';
import { useProductsStore } from '../stores/productsStore';
import { sanitizeFormInput, sanitizeSearchQuery, sanitizeNumber } from '../utils/sanitize';
import { sanitizeError } from '../utils/errorHandler';

export type ProductVariant = {
  _id?: string;
  clientKey?: string;
  label: string;
  price: string;
  mrp: string;
  discount: string;
  stock: string;
  unit?: string;
  unitType?: string;
  isDefault?: boolean;
};

export type Product = {
  _id: string;
  name: string;
  price: number;
  mrp?: number;
  discount?: number;
  stock?: number;
  unit?: string;
  unitType?: string;
  images?: string[];
  isActive?: boolean;
  categoryId?: string | { _id?: string; name?: string } | null;
  subcategoryId?: string | { _id?: string; name?: string } | null;
  variants?: ProductVariant[];
  description?: string;
  tags?: string;
};

export type Category = {
  _id: string;
  name: string;
  parentCategory?: string | { _id?: string } | null;
};

/**
 * Custom hook for product management
 * Delegates to Zustand global store to prevent re-fetching on navigation
 */
export const useProducts = () => {
  const store = useProductsStore();
  const { 
    products, 
    filteredProducts, 
    loading, 
    error,
    createProduct: storeCreateProduct,
    updateProduct: storeUpdateProduct,
    deleteProduct: storeDeleteProduct,
    toggleProductStatus: storeToggleStatus,
    fetchProducts: storeFetchProducts,
    applyFilters,
  } = store;

  const fetchProducts = useCallback(async (): Promise<void> => {
    if (products.length === 0) {
      await storeFetchProducts();
    }
  }, [products.length, storeFetchProducts]);

  const createProduct = useCallback(
    async (data: Record<string, any>): Promise<Product> => {
      try {
        const sanitizedData = {
          name: sanitizeFormInput(String(data.name || ''), 200),
          description: sanitizeFormInput(String(data.description || ''), 1000),
          price: sanitizeNumber(Number(data.price || 0), 0, 999999),
          mrp: sanitizeNumber(Number(data.mrp || data.price || 0), 0, 999999),
          discount: sanitizeNumber(Number(data.discount || 0), 0, 100),
          stock: sanitizeNumber(Number(data.stock || 0), 0, 999999),
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          variants: data.variants,
        };

        const newProduct = await storeCreateProduct(sanitizedData);
        return newProduct;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeCreateProduct]
  );

  const updateProduct = useCallback(
    async (id: string, data: Record<string, any>): Promise<Product> => {
      try {
        const sanitizedData: Record<string, any> = {};

        if (data.name !== undefined) sanitizedData.name = sanitizeFormInput(String(data.name), 200);
        if (data.description !== undefined) sanitizedData.description = sanitizeFormInput(String(data.description), 1000);
        if (data.price !== undefined) sanitizedData.price = sanitizeNumber(Number(data.price), 0, 999999);
        if (data.mrp !== undefined) sanitizedData.mrp = sanitizeNumber(Number(data.mrp), 0, 999999);
        if (data.discount !== undefined) sanitizedData.discount = sanitizeNumber(Number(data.discount), 0, 100);
        if (data.stock !== undefined) sanitizedData.stock = sanitizeNumber(Number(data.stock), 0, 999999);
        if (data.categoryId !== undefined) sanitizedData.categoryId = data.categoryId;
        if (data.subcategoryId !== undefined) sanitizedData.subcategoryId = data.subcategoryId;
        if (data.variants !== undefined) sanitizedData.variants = data.variants;

        const updatedProduct = await storeUpdateProduct(id, sanitizedData);
        return updatedProduct;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeUpdateProduct]
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<string> => {
      try {
        await storeDeleteProduct(id);
        return id;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeDeleteProduct]
  );

  const toggleStatus = useCallback(
    async (id: string, isActive: boolean): Promise<Product> => {
      try {
        const updatedProduct = await storeToggleStatus(id, isActive);
        return updatedProduct;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeToggleStatus]
  );

  const filterBySortCategory = useCallback(
    (sortKey: 'name' | 'price' | 'stock' | null, categoryId: string | null = null) => {
      applyFilters({ sortBy: sortKey, categoryFilter: categoryId });
    },
    [applyFilters]
  );

  const filterBySearch = useCallback(
    (query: string) => {
      applyFilters({ searchQuery: sanitizeSearchQuery(query) });
    },
    [applyFilters]
  );

  return {
    products: filteredProducts.length > 0 ? filteredProducts : products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleStatus,
    filterBySortCategory,
    filterBySearch,
  };
};