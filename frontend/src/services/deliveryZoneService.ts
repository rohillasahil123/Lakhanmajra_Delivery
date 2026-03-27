import { API_BASE_URL } from '@/config/api';

export type DeliveryZone = {
  id: string;
  key: string;
  name: string;
  city: string;
  state: string;
  pincodes: string[];
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  active: boolean;
};

export async function getActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const response = await fetch(`${API_BASE_URL}/delivery-zones/active`, { method: 'GET' });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Failed to load delivery zones (${response.status})`);
  }
  const data = json?.data;
  return Array.isArray(data) ? (data as DeliveryZone[]) : [];
}

