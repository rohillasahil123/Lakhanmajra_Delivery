import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── Auto-detect Expo LAN host (works with Expo Go on physical device) ─────────
function resolveExpoHost(): string | null {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] || null;
}

// ── Priority order for resolving API base URL ─────────────────────────────────
// 1. EXPO_PUBLIC_API_BASE_URL in .env        ← manually set, highest priority
// 2. Auto-detected Expo LAN IP               ← works automatically with Expo Go
// 3. Android emulator localhost alias        ← 10.0.2.2 maps to host machine
// 4. iOS simulator localhost                 ← plain localhost works on iOS sim

const envBaseUrl      = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const expoHost        = resolveExpoHost();
const lanBaseUrl      = expoHost ? `http://${expoHost}:5000` : null;
const fallbackBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const API_BASE_URL = envBaseUrl || lanBaseUrl || fallbackBaseUrl;

// ── MinIO public URL for image loading ───────────────────────────────────────
// Same IP logic: use env var if set, otherwise derive from API host
const envMinioUrl  = process.env.EXPO_PUBLIC_MINIO_URL?.trim();
const minioHost    = expoHost ? `http://${expoHost}:9000` : null;
const minioFallback = Platform.OS === 'android' ? 'http://10.0.2.2:9000' : 'http://localhost:9000';

export const MINIO_BASE_URL = envMinioUrl || minioHost || minioFallback;

export function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('file:')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `${MINIO_BASE_URL.replace(/\/$/, '')}/${trimmed.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(trimmed);
    const shouldSwapHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'minio';

    if (!shouldSwapHost) return trimmed;

    return `${MINIO_BASE_URL.replace(/\/$/, '')}${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

console.log('🌐 API_BASE_URL:', API_BASE_URL);
console.log('🗂️  MINIO_BASE_URL:', MINIO_BASE_URL);

// ── API Endpoints ─────────────────────────────────────────────────────────────
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER:        '/api/auth/register',
    LOGIN:           '/api/auth/login',
    LOGOUT:          '/api/auth/logout',
    GET_USER:        '/api/auth/user',
    GET_PERMISSIONS: '/api/auth/permissions',
  },
  CATEGORIES: '/api/categories',
  PRODUCTS:   '/api/products',
  CART:       '/api/cart',
  ORDERS:     '/api/orders',
};

export const getEndpoint = (endpoint: string): string => `${API_BASE_URL}${endpoint}`;