/**
 * Order Type Definitions
 * Represents order structure from backend
 */

import { Product } from './product.types';
import { User } from './auth.types';

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type RiderStatus = 'Assigned' | 'Accepted' | 'Picked' | 'OutForDelivery' | 'Delivered' | 'Rejected';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface OrderItem {
  _id?: string;
  productId: string | Product;
  name?: string;
  image?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  total?: number;
}

export interface Order {
  _id?: string;
  id?: string;
  userId?: string | User;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount?: number;
  tax?: number;
  total: number;
  status: OrderStatus;
  riderStatus?: RiderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  deliveryAddress: string;
  deliveryCoordinates?: {
    latitude: number;
    longitude: number;
  };
  deliveryInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderLocation?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface OrderRow extends Order {
  // Alias for compatibility with existing code
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  skip?: number;
}

export interface OrderResponse {
  order: Order;
  message?: string;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  limit: number;
  skip: number;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  deliveryAddress: string;
  deliveryCoordinates: {
    latitude: number;
    longitude: number;
  };
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  deliveryInstructions?: string;
  notes?: string;
}
