import {
  useOrders,
  getStatus,
  formatDate,
  formatTime,
  timeAgo,
  PLACEHOLDER_IMAGE,
} from '../hooks/useOrders';
import OrderDetailModal from '../components/orders/OrderDetailModal';

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const m = getStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text} border ${m.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Payment pill ─────────────────────────────────────────────────────────────

function PaymentPill({ method, status }: { method?: string; status?: string }) {
  const isCod = method === 'cod';
  const isPaid = status === 'paid';
  const isFailed = status === 'failed';
  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isCod ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
      >
        {isCod ? '💵 COD' : '💳 Online'}
      </span>
      <div
        className={`text-xs font-medium ${isPaid ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-amber-600'}`}
      >
        {isPaid ? '✓ Paid' : isFailed ? '✗ Failed' : '⏳ Pending'}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
  isActive,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-2 flex items-center gap-1.5 bg-white transition-all ${color} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
      } ${isActive ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.25">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Orders() {
  const {
    items,
    total,
    grandTotal,
    page,
    loading,
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
    totalPages,
  } = useOrders();

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.paymentMethod !== 'all' ||
    filters.today ||
    !!filters.from ||
    !!filters.to;

  return (
    <div className="p-3 space-y-2.5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Orders</h2>
          <p className="text-xs text-slate-400 mt-0.25">{grandTotal} total orders</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live updates
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <StatCard
          label="Total Orders"
          value={grandTotal}
          icon="📦"
          color="border-slate-200"
          onClick={() => {
            setFilter('status', 'all');
            applyFilters();
          }}
          isActive={filters.status === 'all'}
        />
        <StatCard
          label="Pending"
          value={stats.pending || 0}
          icon="⏳"
          color="border-amber-200"
          onClick={() => {
            setFilter('status', 'pending');
            applyFilters();
          }}
          isActive={filters.status === 'pending'}
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed || 0}
          icon="✓"
          color="border-blue-200"
          onClick={() => {
            setFilter('status', 'confirmed');
            applyFilters();
          }}
          isActive={filters.status === 'confirmed'}
        />
        <StatCard
          label="Processing"
          value={stats.processing || 0}
          icon="⚙️"
          color="border-indigo-200"
          onClick={() => {
            setFilter('status', 'processing');
            applyFilters();
          }}
          isActive={filters.status === 'processing'}
        />
        <StatCard
          label="Shipped"
          value={stats.shipped || 0}
          icon="🚴"
          color="border-purple-200"
          onClick={() => {
            setFilter('status', 'shipped');
            applyFilters();
          }}
          isActive={filters.status === 'shipped'}
        />
        <StatCard
          label="Delivered"
          value={stats.delivered || 0}
          icon="✅"
          color="border-emerald-200"
          onClick={() => {
            setFilter('status', 'delivered');
            applyFilters();
          }}
          isActive={filters.status === 'delivered'}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled || 0}
          icon="❌"
          color="border-red-200"
          onClick={() => {
            setFilter('status', 'cancelled');
            applyFilters();
          }}
          isActive={filters.status === 'cancelled'}
        />
        <StatCard
          label="Revenue"
          value={`₹${(stats.revenue || 0).toLocaleString('en-IN')}`}
          icon="💰"
          color="border-green-200"
        />
      </div>

      {/* ── Search + filters ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 space-y-1.5">
        {/* Search row */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
            <input
              className="border border-slate-200 pl-7 pr-3 py-1.5 rounded-lg w-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
              placeholder="Search by order #, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
            />
          </div>
          <button
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors"
            onClick={() => load(1)}
          >
            Search
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Payment filter */}
          <div className="flex gap-0.5">
            {[
              { value: 'all', label: 'All Pay' },
              { value: 'cod', label: '💵 COD' },
              { value: 'online', label: '💳 Online' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter('paymentMethod', opt.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filters.paymentMethod === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-slate-200" />

          {/* Date filters */}
          <button
            onClick={() => setFilter('today', !filters.today)}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors border ${
              filters.today
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            📅 Today
          </button>

          {!filters.today && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                className="border border-slate-200 px-1.5 py-1 rounded-lg text-xs"
                value={filters.from}
                onChange={(e) => setFilter('from', e.target.value)}
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                className="border border-slate-200 px-1.5 py-1 rounded-lg text-xs"
                value={filters.to}
                onChange={(e) => setFilter('to', e.target.value)}
              />
            </div>
          )}

          <button
            onClick={applyFilters}
            className="px-2.5 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            Apply
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Orders table ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading orders...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-2xl mb-1">📭</div>
            <p className="text-slate-500 font-medium text-sm">No orders found</p>
            <p className="text-slate-400 text-xs mt-0.5">Try changing filters or search query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    'Order',
                    'Customer',
                    'Items',
                    'Amount',
                    'Payment',
                    'Status',
                    'Rider',
                    'Time',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((order) => {
                  const firstItem = order.items?.[0];
                  const extraCount = (order.items?.length ?? 0) - 1;
                  const rider = order.assignedRiderId;

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Order # */}
                      <td className="px-2 py-2">
                        <p className="font-mono text-xs font-semibold text-slate-700">
                          #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.25">
                          {formatDate(order.createdAt)}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {order.userId && order.userId.name ? (order.userId.name as string).charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800 leading-tight">
                              {order.userId?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {order.userId?.phone || order.userId?.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={firstItem?.productId?.images?.[0] || PLACEHOLDER_IMAGE}
                            alt={firstItem?.productId?.name || 'Item'}
                            className="w-8 h-8 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          <div>
                            <p className="text-xs text-slate-700 font-medium leading-tight max-w-[100px] truncate">
                              {firstItem?.productId?.name || 'Product'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {extraCount > 0
                                ? `+${extraCount} more`
                                : `Qty: ${firstItem?.quantity ?? 1}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-2 py-2">
                        <p className="font-bold text-slate-800 text-sm">₹{order.totalAmount}</p>
                        <p className="text-xs text-slate-400">
                          +₹{Number(order.deliveryFee ?? 0)} delivery
                        </p>
                      </td>

                      {/* Payment */}
                      <td className="px-2 py-2">
                        <PaymentPill method={order.paymentMethod} status={order.paymentStatus} />
                      </td>

                      {/* Status */}
                      <td className="px-2 py-2">
                        <StatusPill status={order.status} />
                      </td>

                      {/* Rider */}
                      <td className="px-2 py-2">
                        {rider && (
                          <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                              {rider && rider.name ? (rider.name as string).charAt(0).toUpperCase() : 'R'}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-700 leading-tight">
                                {rider.name}
                              </p>
                              {rider.phone && (
                                <p className="text-xs text-slate-400 text-[10px]">{rider.phone}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {!rider && (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <p className="text-xs text-slate-600 font-medium">
                          {formatTime(order.createdAt)}
                        </p>
                        <p className="text-xs text-slate-400">{timeAgo(order.createdAt)}</p>
                      </td>

                      {/* Action */}
                      <td className="px-2 py-2">
                        <button
                          onClick={() => openDetail(order._id)}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of <strong>{total}</strong>{' '}
            orders
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => load(Math.max(1, page - 1))}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← Prev
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p > totalPages || p < 1) return null;
                return (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`w-6 h-6 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => load(Math.min(totalPages, page + 1))}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {(detail || detailLoading) && (
        <OrderDetailModal
          detail={detail}
          loading={detailLoading}
          riders={riders}
          editStatus={editStatus}
          editRider={editRider}
          updating={updating}
          hasPerm={hasPerm}
          onClose={closeDetail}
          onEditStatus={setEditStatus}
          onEditRider={setEditRider}
          onUpdateStatus={updateStatus}
          onAssignRider={assignRider}
        />
      )}
    </div>
  );
}
