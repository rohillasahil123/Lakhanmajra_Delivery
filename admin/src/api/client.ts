import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

/**
 * API Client configured for httpOnly cookie-based authentication
 * 
 * SECURITY: 
 * - Token stored in httpOnly cookie (set by backend)
 * - Sent automatically via withCredentials
 * - Not accessible to JavaScript (immune to XSS)
 * - Frontend cannot modify or access the token
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending httpOnly cookies with requests
});

/**
 * CSRF Protection: Read XSRF token from cookie and add to request headers
 * This ensures all state-changing requests include CSRF token for verification
 */
const getCsrfToken = (): string | null => {
  const name = 'XSRF-TOKEN=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split('; ');
  
  for (let cookie of cookieArray) {
    if (cookie.startsWith(name)) {
      return cookie.substring(name.length);
    }
  }
  return null;
};

/**
 * Request interceptor - Add CSRF token for state-changing requests
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Cookies with credentials=true are sent automatically
  
  /**
   * CSRF Protection: Add XSRF-TOKEN header for state-changing methods
   * GET and HEAD requests don't need CSRF protection
   */
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});

/**
 * Response interceptor - Handle authentication errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If session expires (401), redirect to login
    // Backend clears the cookie, frontend redirects
    if (error.response?.status === 401) {
      globalThis.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
