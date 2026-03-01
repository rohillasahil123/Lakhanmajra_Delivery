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

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setApiToken = (token: string | null): void => {
  authToken = token;
};

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  config.headers['Content-Type'] = 'application/json';
  return config;
});

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

    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(new Error(extractErrorMessage(error)));
  }
);
