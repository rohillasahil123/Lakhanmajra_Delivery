import {Platform} from 'react-native';
import Constants from 'expo-constants';

const parseHostFromUri = (raw: string): string | null => {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  const normalized = input
    .replace(/^exp:\/\//i, 'http://')
    .replace(/^exps:\/\//i, 'https://');

  const withoutProtocol = normalized.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0];
  const candidate = withoutPath.replace(/:\d+$/, '').trim();

  if (!candidate || candidate.toLowerCase() === 'exp') {
    return null;
  }

  return candidate;
};

const resolveExpoHost = (): string | null => {
  const constantsAny = Constants as unknown as {
    expoConfig?: {hostUri?: string};
    expoGoConfig?: {debuggerHost?: string; developer?: {tool?: string}};
    manifest2?: {extra?: {expoClient?: {hostUri?: string}}};
    manifest?: {debuggerHost?: string; hostUri?: string};
  };

  const hostCandidates = [
    constantsAny.expoConfig?.hostUri,
    constantsAny.expoGoConfig?.debuggerHost,
    constantsAny.manifest2?.extra?.expoClient?.hostUri,
    constantsAny.manifest?.debuggerHost,
    constantsAny.manifest?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    if (!candidate || typeof candidate !== 'string') {
      continue;
    }

    const host = parseHostFromUri(candidate);
    if (host) {
      return host;
    }
  }

  return null;
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
