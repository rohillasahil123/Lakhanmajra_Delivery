import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveExpoHost(): string | null {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  return hostUri.split(':')[0] || null;
}

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const expoHost = resolveExpoHost();
const lanBaseUrl = expoHost ? `http://${expoHost}:5000` : null;
const localFallbackBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const API_BASE_URL = envBaseUrl || lanBaseUrl || localFallbackBaseUrl;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    GET_USER: '/api/auth/user',
    GET_PERMISSIONS: '/api/auth/permissions',
  },
  CATEGORIES: '/api/categories',
  PRODUCTS: '/api/products',
  CART: '/api/cart',
  ORDERS: '/api/orders',
};

// Create a complete URL
export const getEndpoint = (endpoint: string): string => `${API_BASE_URL}${endpoint}`;
