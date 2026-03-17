/// <reference types="vite/client" />
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../api/client';
import { getPermissions } from '../auth';
import { logErrorSafely, sanitizeError } from '../utils/errorHandler';
import {
  sanitizeFormInput,
  sanitizeSearchQuery,
} from '../utils/sanitize';

export type OrderItem = {
  productId?: { _id?: string; name?: string; images?: string[] };
  variantId?: { label?: string };
  quantity?: number;
  price?: number;
  mrp?: number;
};

export type ShippingAddress = {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

export type RiderLocation = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string;
};

export type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: 'cod' | 'online';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  status: string;
  userId?: { _id?: string; name?: string; email?: string; phone?: string };
  assignedRiderId?: { _id?: string; name?: string; phone?: string };
  shippingAddress?: ShippingAddress;
  riderLocation?: RiderLocation;
  items?: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type OrderDetail = Order & {
  timeline?: Array<{ timestamp: string; status: string; message?: string }>;
};

export type Rider = { _id: string; name: string; phone?: string };

export type FilterState = {
  status: string;
  paymentMethod: string;
  from: string;
  to: string;
  today: boolean;
};

export const PAGE_LIMIT = 20;
export const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/48x48?text=No';

export const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    border: 'border-amber-200',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200',
  },
  shipped: {
    label: 'Shipped',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    border: 'border-purple-200',
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400',
    border: 'border-red-200',
  },
};

export const getStatus = (s: string) =>
  STATUS_META[s] ?? {
    label: s,
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  };

export const formatDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export const formatTime = (v?: string) =>
  v
    ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

export const formatDateTime = (v?: string) =>
  v
    ? new Date(v).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

export const timeAgo = (v?: string): string => {
  if (!v) return '—';
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const hasValidCoords = (lat?: number, lng?: number) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) !== 0;

export const getDistanceKm = (fLat: number, fLng: number, tLat: number, tLng: number): number => {
  const R = 6371,
    r = (v: number) => (v * Math.PI) / 180;
  const dLat = r(tLat - fLat),
    dLng = r(tLng - fLng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(r(fLat)) * Math.cos(r(tLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const buildOsmEmbedUrl = (lat: number, lng: number, tick: number) => {
  const d = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}&refresh=${tick}`;
};

const getApiBase = (): string => {
  try {
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
  } catch {
    return 'http://localhost:5000/api';
  }
};

const resolveOrders = (p: unknown): Order[] => {
  if (!p || typeof p !== 'object') return [];
  const d = p as any;
  if (Array.isArray(d.orders)) return d.orders;
  if (Array.isArray(d.data?.orders)) return d.data.orders;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d)) return d;
  return [];
};

const resolveTotal = (p: unknown, fb: number): number => {
  if (!p || typeof p !== 'object') return fb;
  const d = p as any;
  return typeof d.total === 'number'
    ? d.total
    : typeof d.data?.total === 'number'
      ? d.data.total
      : fb;
};

const resolveRiders = (d: unknown): Rider[] => {
  if (!d || typeof d !== 'object') return [];
  const r = d as any;
  return Array.isArray(r.users) ? r.users : Array.isArray(d) ? (d as Rider[]) : [];
};

const readFilterParams = (p: URLSearchParams): FilterState => ({
  status: p.get('status') || 'all',
  paymentMethod: p.get('paymentMethod') || 'all',
  from: p.get('from') || '',
  to: p.get('to') || '',
  today: p.get('today') === '1',
});

export function useOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Order[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(() => readFilterParams(searchParams));
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editRider, setEditRider] = useState('');
  const [updating, setUpdating] = useState(false);

  const hasPerm = useCallback((p: string) => permissions.includes(p), [permissions]);

  const buildQuery = useCallback(
    (pageNum: number) => {
      const q = new URLSearchParams();
      q.set('page', String(pageNum));
      q.set('limit', String(PAGE_LIMIT));
      /**
       * SECURITY: Sanitize search and filter parameters before building query
       */
      if (search.trim()) q.set('q', sanitizeSearchQuery(search.trim(), 100));
      if (filters.status !== 'all') q.set('status', sanitizeFormInput(filters.status, 50));
      if (filters.paymentMethod !== 'all') q.set('paymentMethod', sanitizeFormInput(filters.paymentMethod, 50));
      if (filters.today) {
        q.set('today', '1');
      } else {
        if (filters.from) q.set('from', sanitizeFormInput(filters.from, 20));
        if (filters.to) q.set('to', sanitizeFormInput(filters.to, 20));
      }
      return q.toString();
    },
    [search, filters]
  );

  const load = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/admin/orders?${buildQuery(pageNum)}`);
        const payload = res.data?.data ?? res.data;
        const list = resolveOrders(payload);
        setItems(list);
        setTotal(resolveTotal(payload, list.length));
        setPage(pageNum);
      } catch (err) {
        const sanitized = sanitizeError(err);
        logErrorSafely('loadOrders', err);
        setError(sanitized.userMessage);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [perms, rRes] = await Promise.all([
          getPermissions(),
          api.get(`/admin/users?role=rider&limit=100`),
        ]);
        if (cancelled) return;
        setPermissions(perms);
        setRiders(resolveRiders(rRes.data?.data ?? rRes.data));
        setError(null);
        await load(1);
      } catch (err) {
        const sanitized = sanitizeError(err);
        logErrorSafely('initializeOrders', err);
        setError(sanitized.userMessage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const base = getApiBase().replace(/\/api\/?$/, '');
    const socket: Socket = io(base, { transports: ['websocket'], auth: { token } });
    socket.on('admin:orderUpdated', (payload: { order?: Order }) => {
      const incoming = payload?.order;
      if (!incoming?._id) return;
      setItems((prev) => {
        const idx = prev.findIndex((r) => r._id === incoming._id);
        if (idx === -1) return [incoming, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...incoming };
        return next;
      });
      setDetail((prev) => (prev?._id === incoming._id ? { ...prev, ...incoming } : prev));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setFilters(readFilterParams(searchParams));
    setPage(1);
  }, [searchParams]);
  useEffect(() => {
    load(1);
  }, [filters]);

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const applyFilters = () => {
    const p = new URLSearchParams(searchParams);
    filters.status !== 'all' ? p.set('status', filters.status) : p.delete('status');
    filters.paymentMethod !== 'all'
      ? p.set('paymentMethod', filters.paymentMethod)
      : p.delete('paymentMethod');
    if (filters.today) {
      p.set('today', '1');
      p.delete('from');
      p.delete('to');
    } else {
      p.delete('today');
      filters.from ? p.set('from', filters.from) : p.delete('from');
      filters.to ? p.set('to', filters.to) : p.delete('to');
    }
    setSearchParams(p);
  };

  const clearFilters = () => {
    setFilters({ status: 'all', paymentMethod: 'all', from: '', to: '', today: false });
    const p = new URLSearchParams(searchParams);
    ['status', 'paymentMethod', 'today', 'from', 'to'].forEach((k) => p.delete(k));
    setSearchParams(p);
  };

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setError(null);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      const order = res.data?.data ?? res.data;
      setDetail(order);
      setEditStatus(order.status || '');
      setEditRider(order.assignedRiderId?._id || '');
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('openOrderDetail', err);
      setError(sanitized.userMessage);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const updateStatus = async () => {
    if (!detail || !editStatus) return;
    /**
     * SECURITY: Sanitize status value before sending to backend
     */
    const sanitizedStatus = sanitizeFormInput(editStatus, 50);
    if (!sanitizedStatus) {
      setError('Invalid status');
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/admin/orders/${detail._id}/status`, { status: sanitizedStatus });
      await load(page);
      setDetail((prev) => (prev ? { ...prev, status: sanitizedStatus } : prev));
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('updateOrderStatus', err);
      setError(sanitized.userMessage);
    } finally {
      setUpdating(false);
    }
  };

  const assignRider = async () => {
    if (!detail || !editRider) return;
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/admin/orders/${detail._id}/assign`, { riderId: editRider });
      await load(page);
      const assigned = riders.find((r) => r._id === editRider);
      setDetail((prev) => (prev ? { ...prev, assignedRiderId: assigned as any } : prev));
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('assignOrderRider', err);
      setError(sanitized.userMessage);
    } finally {
      setUpdating(false);
    }
  };

  const stats = {
    total,
    revenue: items.reduce((s, o) => s + (o.totalAmount || 0), 0),
    pending: items.filter((o) => o.status === 'pending').length,
    confirmed: items.filter((o) => o.status === 'confirmed').length,
    shipped: items.filter((o) => o.status === 'shipped').length,
    delivered: items.filter((o) => o.status === 'delivered').length,
    cancelled: items.filter((o) => o.status === 'cancelled').length,
    cod: items.filter((o) => o.paymentMethod === 'cod').length,
    online: items.filter((o) => o.paymentMethod === 'online').length,
  };

  return {
    items,
    total,
    page,
    loading,
    error,
    search,
    setSearch,
    filters,
    setFilter,
    applyFilters,
    clearFilters,
    riders,
    stats,
    detail,
    detailLoading,
    openDetail,
    closeDetail,
    editStatus,
    setEditStatus,
    editRider,
    setEditRider,
    updating,
    updateStatus,
    assignRider,
    hasPerm,
    load,
    totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)),
  };
}
