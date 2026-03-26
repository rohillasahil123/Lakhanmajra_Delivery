/**
 * Product Type Definitions
 * Represents product structure from backend
 */

export interface Product {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  mrp?: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images?: string[];
  categoryId: string | Category;
  subcategoryId?: string | null;
  category?: Category;
  parentCategory?: string | Category;
  stock: number;
  sku?: string;
  rating?: number;
  reviews?: number;
  badges?: string[];
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  tags?: string[];
  unit?: string;
  quantity?: number | string;
}

export interface Category {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  icon?: string;
  parentCategory?: string | Category;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  color?: string;
}

export interface ProductFilter {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  skip?: number;
  sortBy?: 'price' | 'rating' | 'newest' | 'popular';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  hasMore: boolean;
  limit: number;
  skip: number;
}
