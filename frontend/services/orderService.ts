import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';

export type ShippingAddress = {
  street: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderItem = {
  productId?: any;
  quantity: number;
  price: number;
};

export type OrderRow = {
  _id: string;
  totalAmount: number;
  status: string;
  createdAt?: string;
  items?: OrderItem[];
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

export async function createOrderApi(shippingAddress: ShippingAddress): Promise<OrderRow> {
  const result = await request<{ order?: OrderRow; data?: OrderRow }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ shippingAddress }),
  });
  return (result.order || result.data) as OrderRow;
}

export async function getMyOrdersApi(): Promise<OrderRow[]> {
  const result = await request<any>('/api/orders', { method: 'GET' });
  if (Array.isArray(result)) return result as OrderRow[];
  if (Array.isArray(result?.data)) return result.data as OrderRow[];
  if (Array.isArray(result?.orders)) return result.orders as OrderRow[];
  return [];
}
