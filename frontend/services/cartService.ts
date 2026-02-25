import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';

const GUEST_SESSION_KEY = '@lakhanmajra_guest_session_id';

export type ServerCartItem = {
  _id?: string;
  product?: string;
  productId?: any;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  unit?: string;
  stock?: number;
};

export type ServerCart = {
  _id?: string;
  items?: ServerCartItem[];
  pricing?: {
    subtotal?: number;
    total?: number;
  };
};

async function getGuestSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;
  const generated = `app_guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(GUEST_SESSION_KEY, generated);
  return generated;
}

async function buildHeaders(includeJson = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';

  const token = await tokenManager.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['x-session-id'] = await getGuestSessionId();
  }

  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders(options.method !== 'GET');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || `Request failed (${response.status})`);
  }

  return json as T;
}

export async function getCartApi(): Promise<ServerCart> {
  const result = await request<{ data?: ServerCart }>('/api/cart', { method: 'GET' });
  return result?.data || { items: [] };
}

export async function addToCartApi(productId: string, quantity = 1): Promise<ServerCart> {
  const result = await request<{ data?: ServerCart }>('/api/cart/add', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
  return result?.data || { items: [] };
}

export async function updateCartQuantityApi(itemId: string, quantity: number): Promise<ServerCart> {
  const result = await request<{ data?: ServerCart }>(`/api/cart/update/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
  return result?.data || { items: [] };
}

export async function removeCartItemApi(itemId: string): Promise<ServerCart> {
  const result = await request<{ data?: ServerCart }>(`/api/cart/remove/${itemId}`, {
    method: 'DELETE',
  });
  return result?.data || { items: [] };
}

export async function clearCartApi(): Promise<ServerCart> {
  const result = await request<{ data?: ServerCart }>('/api/cart/clear', {
    method: 'DELETE',
  });
  return result?.data || { items: [] };
}
