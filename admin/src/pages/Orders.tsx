/// <reference types="vite/client" />

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "../api/client";
import { getPermissions } from "../auth";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  productId?: { name?: string; images?: string[] };
  quantity?: number;
  price?: number;
};

type ShippingAddress = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

type RiderLocation = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string;
};

type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: "cod" | "online";
  paymentStatus?: "pending" | "paid" | "failed";
  status: string;
  userId?: { _id?: string; name?: string; email?: string; phone?: string };
  assignedRiderId?: { _id?: string; name?: string };
  shippingAddress?: ShippingAddress;
  riderLocation?: RiderLocation;
  items?: OrderItem[];
  createdAt?: string;
};

type OrderDetail = Order & {
  timeline?: Array<{ timestamp: string; status: string; message?: string }>;
};

type Rider = {
  _id: string;
  name: string;
};

type FilterState = {
  status: string;
  paymentMethod: string;
  from: string;
  to: string;
  today: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/48x48?text=No+Img";
const MAP_REFRESH_INTERVAL_MS = 10_000;
const RIDERS_LIMIT = 100;
const PAGE_LIMIT = 20;

const getApiBase = (): string => {
  try {
    return (
      ((import.meta as { env?: { VITE_API_URL?: string } }).env
        ?.VITE_API_URL as string) || "http://localhost:5000/api"
    );
  } catch {
    return "http://localhost:5000/api";
  }
};

const API_BASE = getApiBase();

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const resolveOrdersList = (payload: unknown): Order[] => {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.orders)) return p.orders as Order[];
  const nested = p.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.orders)) return nested.orders as Order[];
  return [];
};

const resolveTotal = (payload: unknown, fallback: number): number => {
  if (!payload || typeof payload !== "object") return fallback;
  const p = payload as Record<string, unknown>;
  if (typeof p.total === "number") return p.total;
  const nested = p.data as Record<string, unknown> | undefined;
  if (nested && typeof nested.total === "number") return nested.total;
  return fallback;
};

const resolveRidersList = (data: unknown): Rider[] => {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.users)) return d.users as Rider[];
  if (Array.isArray(data)) return data as Rider[];
  return [];
};

const formatDate = (value?: string, fallback = "—"): string => {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value?: string, fallback = "—"): string => {
  if (!value) return fallback;
  return new Date(value).toLocaleString();
};

const hasValidCoords = (lat?: number, lng?: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng);

const getDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildOsmEmbedUrl = (lat: number, lng: number, tick: number): string => {
  const delta = 0.01;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}` +
    `&layer=mapnik&marker=${lat}%2C${lng}&refresh=${tick}`
  );
};

const readFilterParams = (params: URLSearchParams): FilterState => ({
  status: params.get("status") || "all",
  paymentMethod: params.get("paymentMethod") || "all",
  from: params.get("from") || "",
  to: params.get("to") || "",
  today: params.get("today") === "1" || params.get("today") === "true",
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProductCell: React.FC<{ order: Order }> = ({ order }) => {
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  if (!hasItems) return <span>—</span>;

  const primary = order.items![0];
  const extra =
    order.items!.length > 1
      ? `+${order.items!.length - 1} more item(s)`
      : `Qty: ${primary?.quantity ?? 1}`;

  return (
    <div className="flex items-center gap-2">
      <img
        src={primary?.productId?.images?.[0] || PLACEHOLDER_IMAGE}
        alt={primary?.productId?.name || "Product"}
        className="w-10 h-10 object-cover rounded border border-slate-200"
        onError={(e) => {
          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
        }}
      />
      <div>
        <div className="font-medium">
          {primary?.productId?.name || "Product"}
        </div>
        <div className="text-slate-500">{extra}</div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let cls = "bg-yellow-100 text-yellow-800";
  if (status === "delivered") cls = "bg-green-100 text-green-800";
  else if (status === "cancelled") cls = "bg-red-100 text-red-800";
  return (
    <span className={`px-2 py-1 rounded text-sm ${cls}`}>{status}</span>
  );
};

const DeliveryBadge: React.FC<{ status: string }> = ({ status }) => {
  const delivered = status === "delivered";
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${
        delivered
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {delivered ? "Delivered" : "Pending"}
    </span>
  );
};

interface RiderMapProps {
  riderLocation: RiderLocation;
  shippingAddress?: ShippingAddress;
}

const RiderMap: React.FC<RiderMapProps> = ({
  riderLocation,
  shippingAddress,
}) => {
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    setCountdown(10);
    const cdTimer = setInterval(
      () => setCountdown((p) => (p <= 1 ? 10 : p - 1)),
      1000,
    );
    const refreshTimer = setInterval(
      () => setTick((p) => p + 1),
      MAP_REFRESH_INTERVAL_MS,
    );
    return () => {
      clearInterval(cdTimer);
      clearInterval(refreshTimer);
    };
  }, [riderLocation.latitude, riderLocation.longitude]);

  const rLat = Number(riderLocation.latitude);
  const rLng = Number(riderLocation.longitude);
  const sLat = Number(shippingAddress?.latitude);
  const sLng = Number(shippingAddress?.longitude);
  const hasDestination = hasValidCoords(sLat, sLng);

  return (
    <div className="text-xs text-slate-700 mt-2 space-y-1">
      <div>
        Rider Location: {rLat.toFixed(5)}, {rLng.toFixed(5)}
      </div>
      <div>
        Updated At: {formatDateTime(riderLocation.timestamp, "just now")}
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 underline"
      >
        Open Live Location in Maps
      </a>

      <div className="mt-3 rounded border border-slate-200 overflow-hidden bg-white">
        <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-medium text-green-700">
            ● Live map auto-refresh
          </span>
          <span className="text-slate-600">Refreshing in {countdown}s</span>
        </div>
        <iframe
          title="Rider Live Map"
          src={buildOsmEmbedUrl(rLat, rLng, tick)}
          className="w-full h-56"
          loading="lazy"
        />
      </div>

      {hasDestination && (
        <>
          <div className="text-xs text-slate-700">
            Rider → Customer Distance:{" "}
            <strong>
              {getDistanceKm(rLat, rLng, sLat, sLng).toFixed(2)} km
            </strong>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${rLat},${rLng}&destination=${sLat},${sLng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            Open Rider → Customer Route
          </a>
        </>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Order[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(() =>
    readFilterParams(searchParams),
  );

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editStatus, setEditStatus] = useState("");
  const [editRider, setEditRider] = useState("");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [updating, setUpdating] = useState(false);

  const hasPerm = useCallback(
    (p: string) => permissions.includes(p),
    [permissions],
  );

  // ── Helpers ──────────────────────────────────────────────────────────────

  const upsertOrderRow = useCallback((incoming: Order) => {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r._id === incoming._id);
      if (idx === -1) return [incoming, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...incoming };
      return next;
    });
    setDetail((prev) => {
      if (!prev || prev._id !== incoming._id) return prev;
      return { ...prev, ...incoming };
    });
  }, []);

  const buildQuery = useCallback(
    (pageNum: number): string => {
      const q = new URLSearchParams();
      q.set("page", String(pageNum));
      q.set("limit", String(PAGE_LIMIT));
      if (search.trim()) q.set("q", search.trim());
      if (filters.status !== "all") q.set("status", filters.status);
      if (filters.paymentMethod !== "all")
        q.set("paymentMethod", filters.paymentMethod);
      if (filters.today) {
        q.set("today", "1");
      } else {
        if (filters.from) q.set("from", filters.from);
        if (filters.to) q.set("to", filters.to);
      }
      return q.toString();
    },
    [search, filters],
  );

  // ── Data fetching ─────────────────────────────────────────────────────────

  const load = useCallback(
    async (pageNum = 1) => {
      try {
        const res = await api.get(`/admin/orders?${buildQuery(pageNum)}`);
        const payload = res.data?.data ?? res.data;
        const list = resolveOrdersList(payload);
        setItems(list);
        setTotal(resolveTotal(payload, list.length));
        setPage(pageNum);
      } catch (err) {
        console.error(err);
        setItems([]);
      }
    },
    [buildQuery],
  );

  // ── Initialise ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [perms, ridersRes] = await Promise.all([
          getPermissions(),
          api.get(`/admin/users?role=rider&limit=${RIDERS_LIMIT}`),
        ]);
        if (cancelled) return;
        setPermissions(perms);
        const riderData = ridersRes.data?.data ?? ridersRes.data;
        setRiders(resolveRidersList(riderData));
        await load(1);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketBase = API_BASE.replace(/\/api\/?$/, "");
    const socket: Socket = io(socketBase, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("admin:orderUpdated", (payload: { order?: Order }) => {
      const incoming = payload?.order;
      if (!incoming?._id) return;
      upsertOrderRow(incoming);
    });

    return () => {
      socket.disconnect();
    };
  }, [upsertOrderRow]);

  // ── Sync filters from URL ─────────────────────────────────────────────────

  useEffect(() => {
    setFilters(readFilterParams(searchParams));
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    load(1);
  }, [filters, load]);

  // ── Filter actions ────────────────────────────────────────────────────────

  const setFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    
    if (filters.status === "all") {
      params.delete("status");
    } else {
      params.set("status", filters.status);
    }

    if (filters.paymentMethod === "all") {
      params.delete("paymentMethod");
    } else {
      params.set("paymentMethod", filters.paymentMethod);
    }

    if (filters.today) {
      params.set("today", "1");
      params.delete("from");
      params.delete("to");
    } else {
      params.delete("today");
      if (filters.from) params.set("from", filters.from);
      else params.delete("from");
      if (filters.to) params.set("to", filters.to);
      else params.delete("to");
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      paymentMethod: "all",
      from: "",
      to: "",
      today: false,
    });
    const params = new URLSearchParams(searchParams);
    ["status", "paymentMethod", "today", "from", "to"].forEach((k) =>
      params.delete(k),
    );
    setSearchParams(params);
  };

  // ── Detail modal ──────────────────────────────────────────────────────────

  const showOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      const order: OrderDetail = res.data?.data ?? res.data;
      setDetail(order);
      setEditStatus(order.status || "");
      setEditRider(order.assignedRiderId?._id || "");
      setShowDetail(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load order detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!detail || !editStatus) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${detail._id}/status`, {
        status: editStatus,
      });
      alert("Status updated");
      await load(page);
      setShowDetail(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Update failed";
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  const assignRider = async () => {
    if (!detail || !editRider) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${detail._id}/assign`, {
        riderId: editRider,
      });
      alert("Rider assigned");
      await load(page);
      setShowDetail(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Assign failed";
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const riderHasCoords = hasValidCoords(
    detail?.riderLocation?.latitude,
    detail?.riderLocation?.longitude,
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Orders</h2>
      </div>

      {/* Search bar */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border px-3 py-2 rounded flex-1"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button
          className="bg-slate-600 text-white px-4 rounded"
          onClick={() => load(1)}
        >
          Search
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center bg-white p-3 rounded shadow-sm border">
        <select
          className="border px-3 py-2 rounded"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
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
          value={filters.paymentMethod}
          onChange={(e) => setFilter("paymentMethod", e.target.value)}
        >
          <option value="all">All Payments</option>
          <option value="cod">COD</option>
          <option value="online">Online</option>
        </select>

        <label className="text-sm flex items-center gap-2 px-2">
          <input
            type="checkbox"
            checked={filters.today}
            onChange={(e) => setFilter("today", e.target.checked)}
          />
          <span>Today only</span>
        </label>

        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={filters.from}
          onChange={(e) => setFilter("from", e.target.value)}
          disabled={filters.today}
        />
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={filters.to}
          onChange={(e) => setFilter("to", e.target.value)}
          disabled={filters.today}
        />

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={applyFilters}
        >
          Apply
        </button>
        <button
          className="bg-slate-200 text-slate-700 px-4 py-2 rounded"
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      {/* Orders table */}
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
              <tr
                key={order._id}
                className="border-b last:border-0 hover:bg-slate-50"
              >
                <td className="p-3">
                  {order.orderNumber || order._id.substring(0, 8)}
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">
                    {order.userId?.name || "Unknown user"}
                  </div>
                  <div className="text-slate-500">
                    {order.userId?.phone || order.userId?.email || "—"}
                  </div>
                </td>
                <td className="p-3 text-sm">
                  <ProductCell order={order} />
                </td>
                <td className="p-3">₹{order.totalAmount}</td>
                <td className="p-3 text-sm">
                  <div className="font-semibold uppercase">
                    {order.paymentMethod || "cod"}
                  </div>
                  <div className="text-slate-500">
                    Delivery: ₹{Number(order.deliveryFee ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Status: {order.paymentStatus || "pending"}
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="p-3">
                  <DeliveryBadge status={order.status} />
                </td>
                <td className="p-3 text-sm">{formatDate(order.createdAt)}</td>
                <td className="p-3">
                  {hasPerm("orders:view") && (
                    <button
                      className="text-blue-600 text-sm"
                      onClick={() => showOrderDetail(order._id)}
                      disabled={detailLoading}
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Detail modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold">
                Order #{detail.orderNumber || detail._id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-lg"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                {/* Order summary */}
                <div className="mb-4 p-3 bg-slate-50 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>User:</strong>{" "}
                      {detail.userId?.name || "Unknown user"}
                    </div>
                    <div>
                      <strong>Amount:</strong> ₹{detail.totalAmount}
                    </div>
                    <div>
                      <strong>Payment:</strong>{" "}
                      {String(detail.paymentMethod || "cod").toUpperCase()} (
                      {detail.paymentStatus || "pending"})
                    </div>
                    <div>
                      <strong>Delivery Fee:</strong> ₹
                      {Number(detail.deliveryFee ?? 0)}
                    </div>
                    <div>
                      <strong>Status:</strong> {detail.status}
                    </div>
                    <div>
                      <strong>Delivery:</strong>{" "}
                      {detail.status === "delivered"
                        ? "Completed"
                        : "In Progress"}
                    </div>
                    <div>
                      <strong>Date:</strong> {formatDateTime(detail.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Items list */}
                {detail.items && detail.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Items</h4>
                    <ul className="text-sm space-y-2 bg-slate-50 p-3 rounded">
                      {detail.items.map((item, i) => (
                        <li key={`${detail._id}-item-${i}`} className="flex items-center gap-3">
                          <img
                            src={
                              item.productId?.images?.[0] || PLACEHOLDER_IMAGE
                            }
                            alt={item.productId?.name || "Product"}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                PLACEHOLDER_IMAGE;
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {item.productId?.name || "Unknown"}
                            </div>
                            <div>
                              {item.quantity} × ₹{item.price} = ₹
                              {Number(item.quantity ?? 0) *
                                Number(item.price ?? 0)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Assign rider */}
                {hasPerm("orders:assign") && (
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
                        {updating ? "Assigning..." : "Assign"}
                      </button>
                    </div>

                    {detail.assignedRiderId && (
                      <div className="text-xs text-slate-600 mt-2">
                        Current: {detail.assignedRiderId.name}
                      </div>
                    )}

                    {riderHasCoords && detail.riderLocation ? (
                      <RiderMap
                        riderLocation={detail.riderLocation}
                        shippingAddress={detail.shippingAddress}
                      />
                    ) : (
                      <div className="text-xs text-slate-500 mt-2">
                        Live rider location not available yet.
                      </div>
                    )}
                  </div>
                )}

                {/* Update status */}
                {hasPerm("orders:update") && (
                  <div className="mb-4 p-3 bg-green-50 rounded">
                    <h4 className="font-semibold mb-2 text-sm">
                      Update Status
                    </h4>
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
                        {updating ? "Updating..." : "Update"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end border-t pt-3">
                  <button
                    className="px-4 py-2 border rounded text-sm"
                    onClick={() => setShowDetail(false)}
                  >
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