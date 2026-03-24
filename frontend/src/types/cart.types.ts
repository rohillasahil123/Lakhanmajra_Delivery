/**
 * Cart Type Definitions
 * Represents shopping cart structure
 */

import { Product } from './product.types';

export interface CartItem {
  productId: string;
  product?: Product;
  quantity: number;
  addedAt?: string;
  price?: number;
  image?: string;
  name?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
  lastUpdated?: string;
}

export interface CartAddPayload {
  productId: string;
  quantity: number;
}

export interface CartUpdatePayload {
  productId: string;
  quantity: number;
}

export interface CartSyncPayload {
  items: CartItem[];
}

export interface CartSyncResponse {
  items: CartItem[];
  synced: boolean;
  message?: string;
}

export interface CartLocalState {
  items: CartItem[];
  initialized: boolean;
  lastSyncTime?: number;
  isDirty: boolean;
}
