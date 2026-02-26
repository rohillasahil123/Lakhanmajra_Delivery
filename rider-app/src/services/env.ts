import {Platform} from 'react-native';
import Constants from 'expo-constants';

const resolveExpoHost = (): string | null => {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  return hostUri.split(':')[0] || null;
};

const expoHost = resolveExpoHost();

const fallbackApiBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
const fallbackSocketBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const envSocketBaseUrl = process.env.EXPO_PUBLIC_SOCKET_BASE_URL?.trim();

const lanApiBaseUrl = expoHost ? `http://${expoHost}:5000/api` : null;
const lanSocketBaseUrl = expoHost ? `http://${expoHost}:5000` : null;

const API_BASE_URL = envApiBaseUrl || lanApiBaseUrl || fallbackApiBaseUrl;
const SOCKET_BASE_URL = envSocketBaseUrl || lanSocketBaseUrl || fallbackSocketBaseUrl;

type AppEnv = {
  API_BASE_URL: string;
  SOCKET_BASE_URL: string;
};

const ensureValue = (key: keyof AppEnv, value: string | undefined): string => {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env: AppEnv = {
  API_BASE_URL: ensureValue('API_BASE_URL', API_BASE_URL),
  SOCKET_BASE_URL: ensureValue('SOCKET_BASE_URL', SOCKET_BASE_URL),
};
