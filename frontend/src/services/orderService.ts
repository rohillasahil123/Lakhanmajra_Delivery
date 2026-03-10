import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';

export type ShippingAddress = {
  street: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
};

export type OrderEligibility = {
  cancelledOrdersCount: number;
  requiresAdvancePayment: boolean;
  codAllowed: boolean;
  advanceAmount: number;
};

export type OrderItem = {
  productId?: any;
  quantity: number;
  price: number;
};

export type OrderRow = {
  _id: string;
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: 'cod' | 'online';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  status: string;
  createdAt?: string;
  items?: OrderItem[];
  assignedRiderId?: {
    _id?: string;
    name?: string;
    phone?: string;
  } | null;
  riderLocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    timestamp?: string;
  } | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenManager.getToken();
  if (!token) throw new Error('Please login first');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(await authHeaders()),
      ...(options.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Request failed (${response.status})`);
  }

  return json as T;
}

export async function createOrderApi(payload: {
  shippingAddress: ShippingAddress;
  paymentMethod?: 'cod' | 'online';
  advancePaid?: boolean;
}): Promise<OrderRow> {
  const result = await request<{ order?: OrderRow; data?: OrderRow }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return (result.order || result.data) as OrderRow;
}

export async function getOrderEligibilityApi(): Promise<OrderEligibility> {
  const result = await request<{ data?: OrderEligibility }>('/api/orders/eligibility', { method: 'GET' });
  return (
    result?.data || {
      cancelledOrdersCount: 0,
      requiresAdvancePayment: false,
      codAllowed: true,
      advanceAmount: 20,
    }
  );
}

export async function getMyOrdersApi(): Promise<OrderRow[]> {
  const result = await request<any>('/api/orders', { method: 'GET' });
  if (Array.isArray(result)) return result as OrderRow[];
  if (Array.isArray(result?.data)) return result.data as OrderRow[];
  if (Array.isArray(result?.orders)) return result.orders as OrderRow[];
  return [];
}

export async function cancelMyOrderApi(orderId: string): Promise<OrderRow> {
  const result = await request<{ order?: OrderRow; data?: OrderRow }>(`/api/orders/${orderId}/cancel`, {
    method: 'PATCH',
  });
  return (result.order || result.data) as OrderRow;
}
