import axios from 'axios';
import {env} from './env';
import {extractErrorMessage} from '../utils/errors';

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
  (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(new Error(extractErrorMessage(error)));
  }
);
