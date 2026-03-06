import React, { useEffect, useState } from "react";
import {
  OrderDetail, Rider,
  getStatus, formatDateTime, formatDate, formatTime, timeAgo,
  hasValidCoords, getDistanceKm, buildOsmEmbedUrl,
  PLACEHOLDER_IMAGE, STATUS_META,
} from "../../hooks/useOrders";

interface Props {
  detail: OrderDetail | null;
  loading: boolean;
  riders: Rider[];
  editStatus: string;
  editRider: string;
  updating: boolean;
  hasPerm: (p: string) => boolean;
  onClose: () => void;
  onEditStatus: (s: string) => void;
  onEditRider:  (r: string) => void;
  onUpdateStatus: () => Promise<void>;
  onAssignRider:  () => Promise<void>;
}

// ─── Live map with auto-refresh ───────────────────────────────────────────────

function LiveMap({ riderLocation, shippingAddress }: {
  riderLocation: { latitude?: number; longitude?: number; timestamp?: string };
  shippingAddress?: { latitude?: number; longitude?: number };
}) {
  const [tick, setTick] = useState(0);
  const [cd,   setCd]   = useState(10);
  useEffect(() => {
    const t1 = setInterval(() => setTick((p) => p + 1), 10_000);
    const t2 = setInterval(() => setCd((p) => (p <= 1 ? 10 : p - 1)), 1_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const rLat = Number(riderLocation.latitude);
  const rLng = Number(riderLocation.longitude);
  const sLat = Number(shippingAddress?.latitude);
  const sLng = Number(shippingAddress?.longitude);
  const hasDest = hasValidCoords(sLat, sLng);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" /> Live Location
        </span>
        <span className="text-slate-400">Refresh in {cd}s</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <iframe
          title="Rider Live Map"
          src={buildOsmEmbedUrl(rLat, rLng, tick)}
          className="w-full h-52"
          loading="lazy"
        />
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <a href={`https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
          📍 Open in Maps
        </a>
        {hasDest && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Distance: <strong>{getDistanceKm(rLat, rLng, sLat, sLng).toFixed(2)} km</strong>
            </span>
            <span className="text-slate-300">|</span>
            <a href={`https://www.google.com/maps/dir/?api=1&origin=${rLat},${rLng}&destination=${sLat},${sLng}&travelmode=driving`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
              🛣 Route
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const m = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text} border ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span>{icon}</span>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function OrderDetailModal({
  detail, loading, riders,
  editStatus, editRider, updating,
  hasPerm, onClose,
  onEditStatus, onEditRider,
  onUpdateStatus, onAssignRider,
}: Props) {

  if (!detail && !loading) return null;

  const riderHasCoords = hasValidCoords(
    detail?.riderLocation?.latitude,
    detail?.riderLocation?.longitude,
  );

  const subtotal = detail?.items?.reduce(
    (s, i) => s + (Number(i.quantity ?? 0) * Number(i.price ?? 0)), 0,
  ) ?? 0;

  const statusList = Object.keys(STATUS_META);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                #{detail?.orderNumber || detail?._id?.slice(-8).toUpperCase() || "———"}
              </h3>
              {detail && <StatusPill status={detail.status} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {detail ? `${formatDate(detail.createdAt)} · ${formatTime(detail.createdAt)} · ${timeAgo(detail.createdAt)}` : "Loading..."}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading order details...</p>
            </div>
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* ── Customer + Address ── */}
            <Section title="Customer & Delivery" icon="👤">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Customer</p>
                  <p className="font-semibold text-slate-800">{detail.userId?.name || "Unknown"}</p>
                  <p className="text-slate-500 text-xs">{detail.userId?.phone || detail.userId?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Delivery Address</p>
                  {detail.shippingAddress ? (
                    <div className="text-slate-700 text-xs leading-relaxed">
                      {[
                        detail.shippingAddress.street,
                        detail.shippingAddress.city,
                        detail.shippingAddress.state,
                        detail.shippingAddress.pincode,
                      ].filter(Boolean).join(", ") || "—"}
                    </div>
                  ) : <span className="text-slate-400 text-xs">No address</span>}
                </div>
              </div>
            </Section>

            {/* ── Items ── */}
            <Section title={`Items (${detail.items?.length ?? 0})`} icon="🛍">
              {detail.items && detail.items.length > 0 ? (
                <div className="space-y-3">
                  {detail.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <img
                        src={item.productId?.images?.[0] || PLACEHOLDER_IMAGE}
                        alt={item.productId?.name || "Product"}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">
                          {item.productId?.name || "Unknown Product"}
                        </p>
                        {item.variantId?.label && (
                          <p className="text-xs text-slate-400">{item.variantId.label}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {item.quantity} × ₹{item.price}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          ₹{(Number(item.quantity ?? 0) * Number(item.price ?? 0)).toFixed(2)}
                        </p>
                        {item.mrp && item.price && item.mrp > item.price && (
                          <p className="text-xs text-slate-400 line-through">₹{Number(item.quantity ?? 0) * item.mrp}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Bill summary */}
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery</span><span>₹{Number(detail.deliveryFee ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-200 pt-1 mt-1">
                      <span>Total</span><span>₹{detail.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : <p className="text-slate-400 text-sm">No items found</p>}
            </Section>

            {/* ── Payment ── */}
            <Section title="Payment" icon="💳">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Method</p>
                  <span className={`text-sm font-bold uppercase ${detail.paymentMethod === "online" ? "text-blue-600" : "text-orange-600"}`}>
                    {detail.paymentMethod === "online" ? "💳 Online" : "💵 COD"}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`text-sm font-bold ${
                    detail.paymentStatus === "paid" ? "text-emerald-600" :
                    detail.paymentStatus === "failed" ? "text-red-600" : "text-amber-600"
                  }`}>
                    {detail.paymentStatus === "paid" ? "✅ Paid" :
                     detail.paymentStatus === "failed" ? "❌ Failed" : "⏳ Pending"}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Total</p>
                  <p className="text-sm font-bold text-slate-800">₹{detail.totalAmount}</p>
                </div>
              </div>
            </Section>

            {/* ── Rider ── */}
            <Section title="Rider & Delivery" icon="🚴">
              {/* Current rider info */}
              {detail.assignedRiderId ? (
                <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-sm flex-shrink-0">
                    {(detail.assignedRiderId.name || "R")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{detail.assignedRiderId.name}</p>
                    <p className="text-xs text-slate-500">{(detail.assignedRiderId as any).phone || "—"}</p>
                  </div>
                  <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">Assigned</span>
                </div>
              ) : (
                <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-700 flex items-center gap-2">
                  ⚠️ No rider assigned yet
                </div>
              )}

              {/* Assign rider */}
              {hasPerm("orders:assign") && (
                <div className="flex gap-2">
                  <select
                    className="border border-slate-200 px-3 py-2 rounded-xl text-sm flex-1 bg-white"
                    value={editRider}
                    onChange={(e) => onEditRider(e.target.value)}>
                    <option value="">Select rider to assign...</option>
                    {riders.map((r) => <option key={r._id} value={r._id}>{r.name}{r.phone ? ` · ${r.phone}` : ""}</option>)}
                  </select>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    onClick={onAssignRider} disabled={updating || !editRider}>
                    {updating ? "..." : "Assign"}
                  </button>
                </div>
              )}

              {/* Live map */}
              {riderHasCoords && detail.riderLocation ? (
                <LiveMap riderLocation={detail.riderLocation} shippingAddress={detail.shippingAddress} />
              ) : (
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                  📍 Live location not available yet
                </p>
              )}

              {/* Last location timestamp */}
              {detail.riderLocation?.timestamp && (
                <p className="text-xs text-slate-400 mt-1">
                  Last updated: {formatDateTime(detail.riderLocation.timestamp)}
                </p>
              )}
            </Section>

            {/* ── Update status ── */}
            {hasPerm("orders:update") && (
              <Section title="Update Order Status" icon="✏️">
                {/* Visual status stepper */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {statusList.map((s, idx) => {
                    const m = getStatus(s);
                    const isCurrent = detail.status === s;
                    const isDone = statusList.indexOf(detail.status) > idx;
                    return (
                      <React.Fragment key={s}>
                        <button
                          onClick={() => onEditStatus(s)}
                          className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isCurrent
                              ? `${m.bg} ${m.text} border-2 ${m.border} shadow-sm`
                              : editStatus === s
                              ? `${m.bg} ${m.text} border ${m.border}`
                              : isDone
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCurrent || editStatus === s ? m.dot : isDone ? "bg-emerald-400" : "bg-slate-300"}`} />
                          {m.label}
                        </button>
                        {idx < statusList.length - 1 && (
                          <div className={`flex-shrink-0 w-4 h-px ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <select
                    className="border border-slate-200 px-3 py-2 rounded-xl text-sm flex-1 bg-white"
                    value={editStatus}
                    onChange={(e) => onEditStatus(e.target.value)}>
                    {statusList.map((s) => (
                      <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                    ))}
                  </select>
                  <button
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                    onClick={onUpdateStatus}
                    disabled={updating || editStatus === detail.status}>
                    {updating ? "Saving..." : "Update"}
                  </button>
                </div>
              </Section>
            )}

            {/* ── Timeline ── */}
            {detail.timeline && detail.timeline.length > 0 && (
              <Section title="Order Timeline" icon="🕐">
                <div className="space-y-3">
                  {[...detail.timeline].reverse().map((t, i) => {
                    const m = getStatus(t.status);
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${m.dot}`} />
                          {i < detail.timeline!.length - 1 && <div className="flex-1 w-px bg-slate-200 mt-1" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${m.text}`}>{m.label}</span>
                            <span className="text-xs text-slate-400">{timeAgo(t.timestamp)}</span>
                          </div>
                          {t.message && <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>}
                          <p className="text-xs text-slate-400">{formatDateTime(t.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

          </div>
        ) : null}

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-2xl">
          <button
            className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-300 transition-colors"
            onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}