import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDON_WINDOW_STORAGE_KEY = '@lakhanmajra_addon_delivery_window';
const ADDON_WINDOW_MS = 60 * 1000;

export type AddonDeliveryWindow = {
  sourceOrderId: string;
  expiresAt: number;
};

function toExpiryTimestamp(expiresAtIso?: string): number {
  if (!expiresAtIso) return Date.now() + ADDON_WINDOW_MS;
  const parsed = Date.parse(expiresAtIso);
  if (!Number.isFinite(parsed)) return Date.now() + ADDON_WINDOW_MS;
  return parsed;
}

async function saveWindow(window: AddonDeliveryWindow): Promise<void> {
  try {
    await AsyncStorage.setItem(ADDON_WINDOW_STORAGE_KEY, JSON.stringify(window));
  } catch {
    // Ignore persistence errors and keep app flow unblocked.
  }
}

export async function startAddonDeliveryWindow(
  sourceOrderId: string,
  expiresAtIso?: string,
): Promise<AddonDeliveryWindow> {
  const window: AddonDeliveryWindow = {
    sourceOrderId,
    expiresAt: toExpiryTimestamp(expiresAtIso),
  };
  await saveWindow(window);
  return window;
}

export async function getAddonDeliveryWindow(): Promise<AddonDeliveryWindow | null> {
  try {
    const raw = await AsyncStorage.getItem(ADDON_WINDOW_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AddonDeliveryWindow>;
    if (!parsed || typeof parsed.sourceOrderId !== 'string') {
      await clearAddonDeliveryWindow();
      return null;
    }

    const expiry = Number(parsed.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      await clearAddonDeliveryWindow();
      return null;
    }

    return {
      sourceOrderId: parsed.sourceOrderId,
      expiresAt: expiry,
    };
  } catch {
    return null;
  }
}

export async function getAddonDeliveryRemainingMs(): Promise<number> {
  const active = await getAddonDeliveryWindow();
  if (!active) return 0;
  return Math.max(0, active.expiresAt - Date.now());
}

export async function clearAddonDeliveryWindow(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADDON_WINDOW_STORAGE_KEY);
  } catch {
    // Ignore persistence errors.
  }
}
