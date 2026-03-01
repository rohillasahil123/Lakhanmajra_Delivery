import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {AuthSession} from '../types/rider';

const SESSION_KEY = 'rider_session_v1';

const isValidAuthSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.accessToken === 'string' &&
    !!candidate.rider &&
    typeof candidate.rider.id === 'string' &&
    typeof candidate.rider.role === 'string'
  );
};

const secureStoreAvailable = async (): Promise<boolean> => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const sessionStorage = {
  async save(session: AuthSession): Promise<void> {
    const serialized = JSON.stringify(session);
    if (await secureStoreAvailable()) {
      await SecureStore.setItemAsync(SESSION_KEY, serialized);
      return;
    }
    await AsyncStorage.setItem(SESSION_KEY, serialized);
  },

  async get(): Promise<AuthSession | null> {
    const raw =
      (await secureStoreAvailable())
        ? await SecureStore.getItemAsync(SESSION_KEY)
        : await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (isValidAuthSession(parsed)) {
        return parsed;
      }
      await this.clear();
      return null;
    } catch {
      await this.clear();
      return null;
    }
  },

  async clear(): Promise<void> {
    if (await secureStoreAvailable()) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return;
    }
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};
