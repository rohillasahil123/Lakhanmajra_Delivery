import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';

const PUSH_TOKEN_KEY = '@lakhanmajra_expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getProjectId = (): string | null => {
  const fromExpoConfig = (Constants.expoConfig as any)?.extra?.eas?.projectId;
  const fromEasConfig = (Constants.easConfig as any)?.projectId;
  return fromExpoConfig || fromEasConfig || null;
};

const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
  const token = await tokenManager.getToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const registerDeviceForPush = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const headers = await getAuthHeaders();
    if (!headers) return null;

    const existing = await Notifications.getPermissionsAsync();
    let permission = existing.status;

    if (permission !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      permission = asked.status;
    }

    if (permission !== 'granted') {
      return null;
    }

    const projectId = getProjectId();
    if (!projectId) {
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResponse?.data?.trim();
    if (!expoPushToken) return null;

    await fetch(`${API_BASE_URL}/api/notifications/device-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expoPushToken }),
    });

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoPushToken);

    return expoPushToken;
  } catch {
    return null;
  }
};

const getStoredPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const unregisterDeviceForPush = async (expoPushToken: string): Promise<void> => {
  if (!expoPushToken?.trim()) return;

  const headers = await getAuthHeaders();
  if (!headers) return;

  try {
    await fetch(`${API_BASE_URL}/api/notifications/device-token`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ expoPushToken: expoPushToken.trim() }),
    });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // best-effort cleanup
  }
};

export const unregisterCurrentDeviceForPush = async (): Promise<void> => {
  const token = await getStoredPushToken();
  if (!token) return;
  await unregisterDeviceForPush(token);
};
