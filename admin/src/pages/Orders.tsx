import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Order = { _id: string; orderNumber?: string; totalAmount: number; status: string; userId?: any; createdAt?: string };
type OrderDetail = Order & { items?: any[]; user?: any; assignedRider?: any; timeline?: any[] };

export default function Orders() {
  const [items, setItems] = useState<Order[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // edit states
  const [editStatus, setEditStatus] = useState('');
  const [editRider, setEditRider] = useState('');
  const [riders, setRiders] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);

  const load = async (pageNum = 1) => {
    try {
      const res = await api.get(`/orders?page=${pageNum}&limit=${limit}${search ? `&q=${search}` : ''}`);
      const data = res.data?.data ?? res.data;
      setItems(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setTotal(data?.total ?? 0);
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
        // Load riders for assignment
        const ridersRes = await api.get('/admin/users?role=rider&limit=100');
        setRiders(ridersRes.data?.data ?? ridersRes.data ?? []);
        await load(1);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p);

  const showOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      const order = res.data?.data ?? res.data;
      setDetail(order);
      setEditStatus(order.status || '');
      setEditRider(order.assignedRider?._id || '');
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
      const res = await api.patch(`/orders/${detail._id}/status`, { status: editStatus });
      alert('Status updated');
      setDetail(res.data?.data ?? detail);
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
      const res = await api.patch(`/orders/${detail._id}/assign`, { riderId: editRider });
      alert('Rider assigned');
      setDetail(res.data?.data ?? detail);
      await load(page);
      setShowDetail(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Assign failed');
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

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
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          onKeyDown={e => e.key === 'Enter' && load(1)}
        />
        <button className="bg-slate-600 text-white px-4 rounded" onClick={() => load(1)}>Search</button>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o._id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-3">{o.orderNumber || o._id.substring(0, 8)}</td>
                <td className="p-3">₹{o.totalAmount}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    o.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3 text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                <td className="p-3">
                  {hasPerm('orders:view') && (
                    <button
                      className="text-blue-600 text-sm"
                      onClick={() => showOrderDetail(o._id)}
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
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold">Order #{detail.orderNumber || detail._id.substring(0, 8)}</h3>
              <button onClick={() => setShowDetail(false)} className="text-lg">✕</button>
            </div>

            {detailLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                {/* Order Info */}
                <div className="mb-4 p-3 bg-slate-50 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>User:</strong> {detail.user?.name || detail.userId}</div>
                    <div><strong>Amount:</strong> ₹{detail.totalAmount}</div>
                    <div><strong>Status:</strong> {detail.status}</div>
                    <div><strong>Date:</strong> {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</div>
                  </div>
                </div>

                {/* Items */}
                {detail.items && detail.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Items</h4>
                    <ul className="text-sm space-y-1 bg-slate-50 p-3 rounded">
                      {detail.items.map((item, i) => (
                        <li key={i}>{item.productId?.name || 'Unknown'} × {item.quantity} @ ₹{item.price}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline */}
                {detail.timeline && detail.timeline.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      {detail.timeline.map((entry, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-xs text-slate-500 min-w-fit">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          <p className="text-slate-700">{entry.status} {entry.message ? `- ${entry.message}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rider Assignment */}
                {hasPerm('orders:assign') && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <h4 className="font-semibold mb-2 text-sm">Assign Rider</h4>
                    <div className="flex gap-2 items-center">
                      <select
                        className="border px-3 py-2 rounded text-sm flex-1"
                        value={editRider}
                        onChange={e => setEditRider(e.target.value)}
                      >
                        <option value="">Select rider...</option>
                        {riders.map(r => (
                          <option key={r._id} value={r._id}>{r.name}</option>
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
                    {detail.assignedRider && (
                      <div className="text-xs text-slate-600 mt-2">Current: {detail.assignedRider.name}</div>
                    )}
                  </div>
                )}

                {/* Status Update */}
                {hasPerm('orders:update') && (
                  <div className="mb-4 p-3 bg-green-50 rounded">
                    <h4 className="font-semibold mb-2 text-sm">Update Status</h4>
                    <div className="flex gap-2 items-center">
                      <select
                        className="border px-3 py-2 rounded text-sm flex-1"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="out_for_delivery">Out for Delivery</option>
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
