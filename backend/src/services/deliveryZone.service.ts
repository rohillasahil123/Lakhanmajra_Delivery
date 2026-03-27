import DeliveryZone, { IDeliveryZone } from '../models/deliveryZone.model';

export type ShippingAddressLike = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

const DEFAULT_ZONE: {
  key: string;
  name: string;
  city: string;
  state: string;
  pincodes: string[];
  center: { latitude: number; longitude: number };
  radiusMeters: number;
} = {
  key: 'lakhan_majra',
  name: 'Lakhan Majra',
  city: 'Rohtak',
  state: 'Haryana',
  pincodes: ['124001'],
  center: { latitude: 28.8964, longitude: 76.1739 },
  radiusMeters: 7000,
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  // Haversine formula on a sphere (Earth radius ~6371km)
  const R = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePincode(value: unknown): string {
  const raw = normalizeText(value);
  const match = raw.match(/\b(\d{6})\b/);
  const extracted = match?.[1];
  return extracted ? extracted : raw;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

async function ensureDefaultZoneExists(): Promise<void> {
  const existing = await DeliveryZone.findOne({ key: DEFAULT_ZONE.key })
    .select('_id')
    .lean<{ _id: unknown } | null>();
  if (existing) return;

  await DeliveryZone.create({
    ...DEFAULT_ZONE,
    active: true,
  });
}

export async function getActiveDeliveryZones(): Promise<IDeliveryZone[]> {
  await ensureDefaultZoneExists();
  return DeliveryZone.find({ active: true }).sort({ name: 1 });
}

export async function findMatchingZoneForAddress(
  address: ShippingAddressLike
): Promise<IDeliveryZone | null> {
  await ensureDefaultZoneExists();

  const pincode = normalizePincode(address.pincode);
  const city = normalizeText(address.city).toLowerCase();
  const state = normalizeText(address.state).toLowerCase();
  const latitude = address.latitude;
  const longitude = address.longitude;

  const zones = await DeliveryZone.find({ active: true }).lean<IDeliveryZone[]>();

  // 1) Prefer geo match when coordinates exist
  if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
    const point = { latitude, longitude };
    const geoMatched = zones.find((z) => {
      const dist = haversineDistanceMeters(point, {
        latitude: z.center.latitude,
        longitude: z.center.longitude,
      });
      return dist <= Number(z.radiusMeters || 0);
    });
    if (geoMatched) return geoMatched as unknown as IDeliveryZone;
  }

  // 2) Fallback to pincode + city/state match
  if (pincode) {
    const pinMatched = zones.find((z) => {
      const pins = Array.isArray(z.pincodes) ? z.pincodes : [];
      if (!pins.includes(pincode)) return false;
      const zCity = String(z.city || '').trim().toLowerCase();
      const zState = String(z.state || '').trim().toLowerCase();
      if (city && zCity && city !== zCity) return false;
      if (state && zState && state !== zState) return false;
      return true;
    });
    if (pinMatched) return pinMatched as unknown as IDeliveryZone;
  }

  return null;
}

