import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/client';
import { getPermissions } from '../auth';

type OrderItem = {
  productId?: { name?: string; images?: string[] };
  quantity?: number;
  price?: number;
};

type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: 'cod' | 'online';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  status: string;
  userId?: { _id?: string; name?: string; email?: string; phone?: string };
  assignedRiderId?: { _id?: string; name?: string };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  riderLocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    timestamp?: string;
  };
  items?: OrderItem[];
  createdAt?: string;
};

type OrderDetail = Order & { timeline?: Array<{ timestamp: string; status: string; message?: string }> };

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/48x48?text=No+Img';

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Order[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('paymentMethod') || 'all');
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
  const [toDate, setToDate] = useState(searchParams.get('to') || '');
  const [todayOnly, setTodayOnly] = useState(searchParams.get('today') === '1' || searchParams.get('today') === 'true');

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapRefreshTick, setMapRefreshTick] = useState(0);
  const [mapRefreshCountdown, setMapRefreshCountdown] = useState(10);

  const [editStatus, setEditStatus] = useState('');
  const [editRider, setEditRider] = useState('');
  const [riders, setRiders] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);

  const hasPerm = (p: string) => permissions.includes(p);

  const hasValidCoords = (latitude?: number, longitude?: number): boolean => {
    return Number.isFinite(latitude) && Number.isFinite(longitude);
  };

  const toRadians = (value: number): number => (value * Math.PI) / 180;

  const getDistanceKm = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): number => {
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(toLat - fromLat);
    const deltaLng = toRadians(toLng - fromLng);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(fromLat)) *
        Math.cos(toRadians(toLat)) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const buildOsmEmbedUrl = (latitude: number, longitude: number, refreshTick: number): string => {
    const delta = 0.01;
    const left = longitude - delta;
    const right = longitude + delta;
    const top = latitude + delta;
    const bottom = latitude - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}&refresh=${refreshTick}`;
  };

  useEffect(() => {
    if (!showDetail) return;

    const riderLat = detail?.riderLocation?.latitude;
    const riderLng = detail?.riderLocation?.longitude;
    const hasRiderCoords = hasValidCoords(riderLat, riderLng);
    if (!hasRiderCoords) return;

    setMapRefreshCountdown(10);

    const countdownTimer = setInterval(() => {
      setMapRefreshCountdown((prev) => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);

    const refreshTimer = setInterval(() => {
      setMapRefreshTick((prev) => prev + 1);
    }, 10000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(refreshTimer);
    };
  }, [showDetail, detail?.riderLocation?.latitude, detail?.riderLocation?.longitude]);

  const upsertOrderRow = (incoming: Order) => {
    setItems((prev) => {
      const index = prev.findIndex((row) => row._id === incoming._id);
      if (index === -1) {
        return [incoming, ...prev];
      }

      const next = [...prev];
      next[index] = { ...next[index], ...incoming };
      return next;
    });

    setDetail((prev) => {
      if (!prev || prev._id !== incoming._id) return prev;
      return { ...prev, ...incoming };
    });
  };

  const load = async (pageNum = 1) => {
    try {
      const query = new URLSearchParams();
      query.set('page', String(pageNum));
      query.set('limit', String(limit));
      if (search.trim()) query.set('q', search.trim());
      if (statusFilter && statusFilter !== 'all') query.set('status', statusFilter);
      if (paymentFilter && paymentFilter !== 'all') query.set('paymentMethod', paymentFilter);
      if (todayOnly) query.set('today', '1');
      if (!todayOnly && fromDate) query.set('from', fromDate);
      if (!todayOnly && toDate) query.set('to', toDate);

      const res = await api.get(`/admin/orders?${query.toString()}`);
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload?.orders)
        ? payload.orders
        : Array.isArray(payload?.data?.orders)
        ? payload.data.orders
        : [];

      const resolvedTotal =
        typeof payload?.total === 'number'
          ? payload.total
          : typeof payload?.data?.total === 'number'
          ? payload.data.total
          : list.length;

      setItems(list);
      setTotal(resolvedTotal);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        const ridersRes = await api.get('/admin/users?role=rider&limit=100');
        const riderData = ridersRes.data?.data ?? ridersRes.data;
        setRiders(Array.isArray(riderData?.users) ? riderData.users : Array.isArray(riderData) ? riderData : []);
        await load(1);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';
    const socketBase = apiBase.replace(/\/api\/?$/, '');

    const socket = io(socketBase, {
      transports: ['websocket'],
      auth: { token },
    });

    const handleOrderUpdate = (payload: { order?: Order }) => {
      const incoming = payload?.order;
      if (!incoming || !incoming._id) return;
      upsertOrderRow(incoming);
    };

    socket.on('admin:orderUpdated', handleOrderUpdate);

    return () => {
      socket.off('admin:orderUpdated', handleOrderUpdate);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const status = searchParams.get('status') || 'all';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const today = searchParams.get('today') === '1' || searchParams.get('today') === 'true';

    setStatusFilter(status);
    setPaymentFilter(paymentMethod);
    setFromDate(from);
    setToDate(to);
    setTodayOnly(today);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    load(1);
  }, [statusFilter, paymentFilter, fromDate, toDate, todayOnly]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    else params.delete('status');

    if (paymentFilter && paymentFilter !== 'all') params.set('paymentMethod', paymentFilter);
    else params.delete('paymentMethod');

    if (todayOnly) {
      params.set('today', '1');
      params.delete('from');
      params.delete('to');
    } else {
      params.delete('today');
      if (fromDate) params.set('from', fromDate);
      else params.delete('from');
      if (toDate) params.set('to', toDate);
      else params.delete('to');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setFromDate('');
    setToDate('');
    setTodayOnly(false);

    const params = new URLSearchParams(searchParams);
    params.delete('status');
    params.delete('paymentMethod');
    params.delete('today');
    params.delete('from');
    params.delete('to');
    setSearchParams(params);
  };

  const showOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      const order = res.data?.data ?? res.data;
      setDetail(order);
      setEditStatus(order.status || '');
      setEditRider(order.assignedRiderId?._id || '');
      setShowDetail(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load order detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!detail || !editStatus) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${detail._id}/status`, { status: editStatus });
      alert('Status updated');
      await load(page);
      setShowDetail(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const assignRider = async () => {
    if (!detail || !editRider) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${detail._id}/assign`, { riderId: editRider });
      alert('Rider assigned');
      await load(page);
      setShowDetail(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Assign failed');
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Orders</h2>
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
        <button className="bg-slate-600 text-white px-4 rounded" onClick={() => load(1)}>
          Search
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center bg-white p-3 rounded shadow-sm border">
        <select
          className="border px-3 py-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          className="border px-3 py-2 rounded"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="all">All Payments</option>
          <option value="cod">COD</option>
          <option value="online">Online</option>
        </select>

        <label className="text-sm flex items-center gap-2 px-2">
          <input
            type="checkbox"
            checked={todayOnly}
            onChange={(e) => setTodayOnly(e.target.checked)}
          />
          Today only
        </label>

        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          disabled={todayOnly}
        />
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          disabled={todayOnly}
        />

        <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={applyFilters}>
          Apply
        </button>
        <button className="bg-slate-200 text-slate-700 px-4 py-2 rounded" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Products</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Delivery</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((order) => (
              <tr key={order._id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-3">{order.orderNumber || order._id.substring(0, 8)}</td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{order.userId?.name || 'Unknown user'}</div>
                  <div className="text-slate-500">{order.userId?.phone || order.userId?.email || '—'}</div>
                </td>
                <td className="p-3 text-sm">
                  {order.items && order.items.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={order.items[0]?.productId?.images?.[0] || PLACEHOLDER_IMAGE}
                        alt={order.items[0]?.productId?.name || 'Product'}
                        className="w-10 h-10 object-cover rounded border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      <div>
                        <div className="font-medium">{order.items[0]?.productId?.name || 'Product'}</div>
                        <div className="text-slate-500">
                          {order.items.length > 1
                            ? `+${order.items.length - 1} more item(s)`
                            : `Qty: ${order.items[0]?.quantity || 1}`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3">₹{order.totalAmount}</td>
                <td className="p-3 text-sm">
                  <div className="font-semibold uppercase">{order.paymentMethod || 'cod'}</div>
                  <div className="text-slate-500">Delivery: ₹{Number(order.deliveryFee ?? 0)}</div>
                  <div className="text-xs text-slate-500">Status: {order.paymentStatus || 'pending'}</div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {order.status === 'delivered' ? 'Delivered' : 'Pending'}
                  </span>
                </td>
                <td className="p-3 text-sm">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</td>
                <td className="p-3">
                  {hasPerm('orders:view') && (
                    <button className="text-blue-600 text-sm" onClick={() => showOrderDetail(order._id)} disabled={detailLoading}>
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-slate-500">Total: {total}</div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => load(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showDetail && detail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold">Order #{detail.orderNumber || detail._id.substring(0, 8)}</h3>
              <button onClick={() => setShowDetail(false)} className="text-lg">
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-slate-50 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>User:</strong> {detail.userId?.name || 'Unknown user'}
                    </div>
                    <div>
                      <strong>Amount:</strong> ₹{detail.totalAmount}
                    </div>
                    <div>
                      <strong>Payment:</strong> {String(detail.paymentMethod || 'cod').toUpperCase()} ({detail.paymentStatus || 'pending'})
                    </div>
                    <div>
                      <strong>Delivery Fee:</strong> ₹{Number(detail.deliveryFee ?? 0)}
                    </div>
                    <div>
                      <strong>Status:</strong> {detail.status}
                    </div>
                    <div>
                      <strong>Delivery:</strong> {detail.status === 'delivered' ? 'Completed' : 'In Progress'}
                    </div>
                    <div>
                      <strong>Date:</strong> {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>

                {detail.items && detail.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Items</h4>
                    <ul className="text-sm space-y-2 bg-slate-50 p-3 rounded">
                      {detail.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <img
                            src={item.productId?.images?.[0] || PLACEHOLDER_IMAGE}
                            alt={item.productId?.name || 'Product'}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          <div>
                            <div className="font-medium">{item.productId?.name || 'Unknown'}</div>
                            <div>
                              {item.quantity} × ₹{item.price} = ₹{Number(item.quantity || 0) * Number(item.price || 0)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasPerm('orders:assign') && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <h4 className="font-semibold mb-2 text-sm">Assign Rider</h4>
                    <div className="flex gap-2 items-center">
                      <select
                        className="border px-3 py-2 rounded text-sm flex-1"
                        value={editRider}
                        onChange={(e) => setEditRider(e.target.value)}
                      >
                        <option value="">Select rider...</option>
                        {riders.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                        onClick={assignRider}
                        disabled={updating}
                      >
                        {updating ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                    {detail.assignedRiderId && <div className="text-xs text-slate-600 mt-2">Current: {detail.assignedRiderId.name}</div>}

                    {typeof detail.riderLocation?.latitude === 'number' && typeof detail.riderLocation?.longitude === 'number' ? (
                      <div className="text-xs text-slate-700 mt-2 space-y-1">
                        <div>
                          Rider Location: {Number(detail.riderLocation.latitude).toFixed(5)}, {Number(detail.riderLocation.longitude).toFixed(5)}
                        </div>
                        <div>
                          Updated At:{' '}
                          {detail.riderLocation.timestamp
                            ? new Date(detail.riderLocation.timestamp).toLocaleString()
                            : 'just now'}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${detail.riderLocation.latitude},${detail.riderLocation.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline"
                        >
                          Open Live Location in Maps
                        </a>

                        {hasValidCoords(detail.riderLocation?.latitude, detail.riderLocation?.longitude) && (
                          <div className="mt-3 rounded border border-slate-200 overflow-hidden bg-white">
                            <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between text-xs">
                              <span className="font-medium text-green-700">● Live map auto-refresh</span>
                              <span className="text-slate-600">Refreshing in {mapRefreshCountdown}s</span>
                            </div>
                            <iframe
                              title="Rider Live Map"
                              src={buildOsmEmbedUrl(
                                Number(detail.riderLocation.latitude),
                                Number(detail.riderLocation.longitude),
                                mapRefreshTick
                              )}
                              className="w-full h-56"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {hasValidCoords(detail.riderLocation?.latitude, detail.riderLocation?.longitude) &&
                        hasValidCoords(detail.shippingAddress?.latitude, detail.shippingAddress?.longitude) ? (
                          <>
                            <div className="text-xs text-slate-700">
                              Rider → Customer Distance:{' '}
                              <strong>
                                {getDistanceKm(
                                  Number(detail.riderLocation.latitude),
                                  Number(detail.riderLocation.longitude),
                                  Number(detail.shippingAddress.latitude),
                                  Number(detail.shippingAddress.longitude)
                                ).toFixed(2)} km
                              </strong>
                            </div>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${detail.riderLocation?.latitude},${detail.riderLocation?.longitude}&destination=${detail.shippingAddress?.latitude},${detail.shippingAddress?.longitude}&travelmode=driving`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 underline"
                            >
                              Open Rider → Customer Route
                            </a>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mt-2">Live rider location not available yet.</div>
                    )}
                  </div>
                )}

                {hasPerm('orders:update') && (
                  <div className="mb-4 p-3 bg-green-50 rounded">
                    <h4 className="font-semibold mb-2 text-sm">Update Status</h4>
                    <div className="flex gap-2 items-center">
                      <select
                        className="border px-3 py-2 rounded text-sm flex-1"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                        onClick={updateStatus}
                        disabled={updating}
                      >
                        {updating ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end border-t pt-3">
                  <button className="px-4 py-2 border rounded text-sm" onClick={() => setShowDetail(false)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
