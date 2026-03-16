import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {env} from './env';
import {extractErrorMessage} from '../utils/errors';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 350;

type RetryableConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
};

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const isRetryableError = (error: AxiosError): boolean => {
  const method = String(error.config?.method || 'get').toLowerCase();
  const safeMethod = ['get', 'head', 'options'].includes(method);
  const status = error.response?.status;
  const noResponse = !error.response;
  const serverError = typeof status === 'number' && status >= 500;

  return safeMethod && (noResponse || serverError);
};

let unauthorizedHandler: (() => void) | null = null;

/**
 * SECURITY: httpOnly cookies are handled automatically by axios
 * in React Native - no need to manually set token headers
 * Backend sets httpOnly cookie in login response, axios sends it automatically
 */
let csrfToken: string | null = null;

export const setApiToken = (token: string | null): void => {
  // DEPRECATED: Token is now in httpOnly cookie
  // This function kept for backward compatibility but does nothing
  console.warn('setApiToken is deprecated - token is managed via httpOnly cookies');
};

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  /**
   * SECURITY: withCredentials enables automatic cookie sending
   * httpOnly token cookie will be included in all requests automatically
   */
  withCredentials: true,
});

/**
 * Request interceptor - Add CSRF token for state-changing requests
 */
apiClient.interceptors.request.use((config) => {
  /**
   * SECURITY: CSRF Protection
   * Add XSRF-TOKEN header for POST, PUT, PATCH, DELETE requests
   */
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!isFormData) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

/**
 * Response interceptor - Handle auth errors and retries
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (config && isRetryableError(error)) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        const delay = RETRY_BASE_DELAY_MS * 2 ** (config.__retryCount - 1);
        await sleep(delay);
        return apiClient.request(config);
      }
    }

    /**
     * SECURITY: On 401, trigger logout handler
     * httpOnly cookie will be cleared by backend
     */
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(new Error(extractErrorMessage(error)));
  }
);
