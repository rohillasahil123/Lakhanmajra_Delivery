// User Types
export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: Role | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Role Types
export interface Role {
  _id: string;
  name: string;
  permissions?: string[];
  description?: string;
}

// Product Types
export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stock?: number;
  categoryId?: Category | string;
  images?: string[];
  unit?: string;
  isActive?: boolean;
  createdAt?: string;
}

// Category Types
export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  order?: number;
}

// Order Types
export interface Order {
  _id: string;
  orderNumber?: string;
  userId?: User | string;
  items?: OrderItem[];
  totalAmount: number;
  deliveryFee?: number;
  discount?: number;
  status: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  assignedRider?: User | string;
  deliveryAddress?: Address;
  timeline?: TimelineEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: Product | string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TimelineEvent {
  status: OrderStatus;
  timestamp: string;
  message?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked'
  | 'delivered'
  | 'cancelled';

// Rider Types
export interface Rider extends User {
  vehicle?: string;
  licenseNumber?: string;
  isAvailable?: boolean;
  currentOrders?: number;
  completedOrders?: number;
  rating?: number;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalOrders: number;
  ordersInRange: number;
  revenue: number;
  ordersToday: number;
  pendingOrders: number;
  activeUsers: number;
  ordersByDay?: { date: string; orders: number }[];
  revenueByDay?: { date: string; revenue: number }[];
  statusBreakdown?: { status: string; count: number }[];
  topProducts?: { name: string; qty: number }[];
  riderPerformance?: { name: string; delivered: number }[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
