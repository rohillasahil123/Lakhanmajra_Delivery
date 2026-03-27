import { Request, Response } from 'express';
import DeliveryZone from '../models/deliveryZone.model';
import { getActiveDeliveryZones } from '../services/deliveryZone.service';

export async function listActiveZones(_req: Request, res: Response): Promise<void> {
  const zones = await getActiveDeliveryZones();
  res.status(200).json({
    success: true,
    data: zones.map((z) => ({
      id: String(z._id),
      key: z.key,
      name: z.name,
      city: z.city,
      state: z.state,
      pincodes: z.pincodes,
      center: z.center,
      radiusMeters: z.radiusMeters,
      active: z.active,
    })),
  });
}

type ZonePayload = {
  key?: string;
  name?: string;
  active?: boolean;
  city?: string;
  state?: string;
  pincodes?: string[];
  center?: { latitude?: number; longitude?: number };
  radiusMeters?: number;
};

function normalizeKey(key: unknown): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normalizePins(pins: unknown): string[] {
  if (!Array.isArray(pins)) return [];
  return pins
    .map((p) => String(p || '').trim())
    .map((p) => {
      const match = p.match(/\b(\d{6})\b/);
      const extracted = match?.[1];
      return extracted ? extracted : p;
    })
    .filter((p) => /^\d{6}$/.test(p));
}

export async function adminListZones(_req: Request, res: Response): Promise<void> {
  const zones = await DeliveryZone.find({}).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: zones });
}

export async function adminCreateZone(req: Request, res: Response): Promise<void> {
  const body = (req.body || {}) as ZonePayload;
  const key = normalizeKey(body.key);

  const name = String(body.name || '').trim();
  const city = String(body.city || '').trim();
  const state = String(body.state || '').trim();
  const pincodes = normalizePins(body.pincodes);
  const latitude = Number(body.center?.latitude);
  const longitude = Number(body.center?.longitude);
  const radiusMeters = Number(body.radiusMeters);

  if (!key || !name || !city || !state) {
    res.status(400).json({ message: 'key, name, city, state are required' });
    return;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ message: 'center.latitude and center.longitude are required' });
    return;
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters < 50) {
    res.status(400).json({ message: 'radiusMeters must be >= 50' });
    return;
  }

  const zone = await DeliveryZone.create({
    key,
    name,
    city,
    state,
    pincodes,
    center: { latitude, longitude },
    radiusMeters,
    active: body.active !== false,
  });

  res.status(201).json({ success: true, data: zone });
}

export async function adminUpdateZone(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id || '').trim();
  const body = (req.body || {}) as ZonePayload;

  const updates: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.city === 'string' && body.city.trim()) updates.city = body.city.trim();
  if (typeof body.state === 'string' && body.state.trim()) updates.state = body.state.trim();
  if (Array.isArray(body.pincodes)) updates.pincodes = normalizePins(body.pincodes);
  if (typeof body.radiusMeters === 'number' && Number.isFinite(body.radiusMeters))
    updates.radiusMeters = body.radiusMeters;

  if (body.center && (body.center.latitude !== undefined || body.center.longitude !== undefined)) {
    const latitude = Number(body.center.latitude);
    const longitude = Number(body.center.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ message: 'center.latitude and center.longitude must be numbers' });
      return;
    }
    updates.center = { latitude, longitude };
  }

  const zone = await DeliveryZone.findByIdAndUpdate(id, updates, { new: true });
  if (!zone) {
    res.status(404).json({ message: 'Zone not found' });
    return;
  }
  res.status(200).json({ success: true, data: zone });
}

export async function adminDeleteZone(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id || '').trim();
  const zone = await DeliveryZone.findByIdAndDelete(id);
  if (!zone) {
    res.status(404).json({ message: 'Zone not found' });
    return;
  }
  res.status(200).json({ success: true });
}

