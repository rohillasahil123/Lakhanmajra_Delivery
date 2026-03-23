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
 * - Request timeout: 30 seconds to prevent hanging requests
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout to prevent request hanging
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending httpOnly cookies with requests
});

/**
 * CSRF Protection: Read XSRF token from cookie and validate it
 * This ensures all state-changing requests include a valid CSRF token for verification
 * 
 * SECURITY VALIDATIONS:
 * - Token must exist and be a non-empty string
 * - Token must not contain special characters that could indicate injection
 * - Returns null if token is invalid (client will proceed without it, backend will reject)
 */
const getCsrfToken = (): string | null => {
  try {
    if (!document.cookie) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ CSRF: No cookies available');
      }
      return null;
    }

    const cookieName = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (const cookie of cookieArray) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(cookieName)) {
        const token = trimmedCookie.substring(cookieName.length).trim();
        
        // SECURITY: Validate token format
        // CSRF tokens should be alphanumeric with hyphens (UUID-like format typically)
        if (!token || !/^[a-zA-Z0-9\-]+$/.test(token)) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ CSRF: Token found but invalid format', {
              length: token?.length || 0,
              hasSpecialChars: token ? !/^[a-zA-Z0-9\-]+$/.test(token) : false,
            });
          }
          return null;
        }

        // Token should be reasonable length (32-256 chars for typical UUID/token formats)
        if (token.length < 32 || token.length > 256) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ CSRF: Token length out of bounds', {
              length: token.length,
            });
          }
          return null;
        }

        return token;
      }
    }

    if (import.meta.env.DEV) {
      console.warn('⚠️ CSRF: Token not found in cookies');
    }
    return null;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('❌ CSRF: Error parsing XSRF token', err);
    }
    return null;
  }
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
    } else {
      // Log warning: state-changing request without CSRF token
      // Backend will reject this request
      console.warn('⚠️ CSRF: No valid token for state-changing request', {
        method: config.method,
        url: config.url,
      });
    }
  }
  
  return config;
});

/**
 * Response interceptor - Handle authentication errors and CSRF failures
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const errorMsg = error?.response?.data?.message || error?.message || '';

    // 401 means session expired - redirect to login
    if (status === 401) {
      console.warn('⚠️ Session expired, redirecting to login');
      globalThis.location.href = '/login';
      return Promise.reject(error);
    }

    // 403 might be CSRF failure - log it
    if (status === 403) {
      if (errorMsg.toLowerCase().includes('csrf') || errorMsg.toLowerCase().includes('token')) {
        console.error('❌ CSRF validation failed', {
          message: errorMsg,
          url: error?.config?.url,
        });
      }
      return Promise.reject(error);
    }

    // Network errors
    if (!error?.response) {
      console.error('❌ Network error or no response from server', {
        message: error?.message,
        code: error?.code,
      });
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;

