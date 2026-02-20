// API Configuration
// Change API_BASE_URL based on your environment:
// - For Expo Go on mobile: Use your machine's IP (e.g., http://192.168.x.x:5000)
// - For web/simulator: Use http://localhost:5000

// Your machine IP: 192.168.1.13
// This allows the phone to connect to your backend server

export const API_BASE_URL = 'http://192.168.1.13:5000';

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
