import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

type Zone = {
  _id: string;
  key: string;
  name: string;
  active: boolean;
  city: string;
  state: string;
  pincodes: string[];
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  createdAt?: string;
  updatedAt?: string;
};

type ZoneDraft = {
  key: string;
  name: string;
  active: boolean;
  city: string;
  state: string;
  pincodesText: string;
  centerLat: string;
  centerLng: string;
  radiusMeters: string;
};

const emptyDraft = (): ZoneDraft => ({
  key: '',
  name: '',
  active: true,
  city: 'Rohtak',
  state: 'Haryana',
  pincodesText: '124001',
  centerLat: '28.8964',
  centerLng: '76.1739',
  radiusMeters: '7000',
});

function parsePins(text: string): string[] {
  return text
    .split(/[,|\n|\s]+/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const m = v.match(/\b(\d{6})\b/);
      return m ? m[1] : v;
    })
    .filter((v) => /^\d{6}$/.test(v));
}

export default function DeliveryZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ZoneDraft>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/delivery-zones');
      const data = (res.data?.data ?? []) as Zone[];
      setZones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(() => zones.filter((z) => z.active).length, [zones]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setError(null);
  };

  const startEdit = (z: Zone) => {
    setEditingId(z._id);
    setDraft({
      key: z.key,
      name: z.name,
      active: Boolean(z.active),
      city: z.city,
      state: z.state,
      pincodesText: (z.pincodes || []).join(', '),
      centerLat: String(z.center?.latitude ?? ''),
      centerLng: String(z.center?.longitude ?? ''),
      radiusMeters: String(z.radiusMeters ?? ''),
    });
    setError(null);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        key: draft.key.trim(),
        name: draft.name.trim(),
        active: Boolean(draft.active),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincodes: parsePins(draft.pincodesText),
        center: {
          latitude: Number(draft.centerLat),
          longitude: Number(draft.centerLng),
        },
        radiusMeters: Number(draft.radiusMeters),
      };

      if (editingId) {
        await api.patch(`/admin/delivery-zones/${editingId}`, payload);
      } else {
        await api.post('/admin/delivery-zones', payload);
      }

      await load();
      startCreate();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this delivery zone? This cannot be undone.')) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/admin/delivery-zones/${id}`);
      await load();
      if (editingId === id) startCreate();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Delivery Zones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Active zones: <strong>{activeCount}</strong> · Orders are allowed only inside active zones.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            + New Zone
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Zones</div>
            <div className="text-xs text-slate-400">{zones.length} total</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Key', 'Active', 'Pins', 'Radius', ''].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {zones.map((z) => (
                  <tr key={z._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2">
                      <div className="text-sm font-semibold text-slate-800">{z.name}</div>
                      <div className="text-xs text-slate-400">
                        {z.city}, {z.state}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{z.key}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          z.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {z.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {(z.pincodes || []).slice(0, 2).join(', ')}
                      {(z.pincodes || []).length > 2 ? ` +${(z.pincodes || []).length - 2}` : ''}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {(z.radiusMeters || 0).toLocaleString('en-IN')} m
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                        onClick={() => startEdit(z)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ml-2 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                        onClick={() => onDelete(z._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {zones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                      {loading ? 'Loading…' : 'No zones found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-700">
              {editingId ? 'Edit Zone' : 'Create Zone'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Tip: keep radius big enough to cover the whole village boundary.
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Name</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Lakhan Majra"
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Key</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                  value={draft.key}
                  onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                  placeholder="lakhan_majra"
                  disabled={Boolean(editingId)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">City</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="Rohtak"
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">State</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  placeholder="Haryana"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <div className="text-xs font-semibold text-slate-600">Pincodes (comma/space separated)</div>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none font-mono"
                value={draft.pincodesText}
                onChange={(e) => setDraft((d) => ({ ...d, pincodesText: e.target.value }))}
                placeholder="124001"
              />
              <div className="text-xs text-slate-400">
                Parsed pincodes: {parsePins(draft.pincodesText).join(', ') || '—'}
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Center Lat</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                  value={draft.centerLat}
                  onChange={(e) => setDraft((d) => ({ ...d, centerLat: e.target.value }))}
                  placeholder="28.8964"
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Center Lng</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                  value={draft.centerLng}
                  onChange={(e) => setDraft((d) => ({ ...d, centerLng: e.target.value }))}
                  placeholder="76.1739"
                />
              </label>
              <label className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Radius (meters)</div>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                  value={draft.radiusMeters}
                  onChange={(e) => setDraft((d) => ({ ...d, radiusMeters: e.target.value }))}
                  placeholder="7000"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              Active (orders allowed in this zone)
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Zone'}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
                onClick={startCreate}
                disabled={saving}
              >
                Reset
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Note: This affects customer app and backend order validation immediately.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

