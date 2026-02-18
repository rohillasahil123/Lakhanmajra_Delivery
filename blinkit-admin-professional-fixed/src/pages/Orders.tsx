import React, { useEffect, useState } from 'react';
import { Search, Eye, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import { formatCurrency, formatDateTime, getOrderStatusColor } from '../utils/helpers';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import type { Order } from '../types';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedRider, setSelectedRider] = useState('');

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [permsRes, ridersRes] = await Promise.all([
        getPermissions(),
        api.get('/admin/users?role=rider&limit=100')
      ]);
      setPermissions(permsRes);
      setRiders(ridersRes.data?.data ?? ridersRes.data ?? []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get(`/orders?page=${page}&limit=${limit}`);
      const data = res.data?.data ?? res.data;
      setOrders(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const viewOrderDetails = async (orderId: string) => {
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      const order = res.data?.data ?? res.data;
      setSelectedOrder(order);
      setStatusUpdate(order.status || '');
      setSelectedRider(order.assignedRider?._id || '');
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const updateStatus = async () => {
    if (!selectedOrder || !statusUpdate) return;
    try {
      await api.patch(`/orders/${selectedOrder._id}/status`, { status: statusUpdate });
      await loadOrders();
      setShowDetailModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const assignRider = async () => {
    if (!selectedOrder || !selectedRider) return;
    try {
      await api.patch(`/orders/${selectedOrder._id}/assign`, { riderId: selectedRider });
      await loadOrders();
      setShowDetailModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign rider');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loading size="lg" text="Loading orders..." /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all customer orders</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="font-medium">{order.orderNumber || order._id.slice(-6)}</td>
                  <td>{typeof order.userId === 'object' ? order.userId.name : '—'}</td>
                  <td className="font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <span className={`badge ${getOrderStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">{formatDateTime(order.createdAt || '')}</td>
                  <td>
                    <button
                      onClick={() => viewOrderDetails(order._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <div className="text-center py-12"><p className="text-gray-500">No orders found</p></div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} orders
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary disabled:opacity-50">
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn btn-secondary disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Order Details" size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-semibold">{selectedOrder.orderNumber || selectedOrder._id.slice(-6)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-semibold">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Status</p>
                <span className={`badge ${getOrderStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="text-sm">{formatDateTime(selectedOrder.createdAt || '')}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Update Status</h3>
              <select value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)} className="input mb-3">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="assigned">Assigned</option>
                <option value="picked">Picked</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button onClick={updateStatus} className="btn btn-primary w-full">Update Status</button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Assign Rider</h3>
              <select value={selectedRider} onChange={(e) => setSelectedRider(e.target.value)} className="input mb-3">
                <option value="">Select rider</option>
                {riders.map((rider) => (
                  <option key={rider._id} value={rider._id}>{rider.name}</option>
                ))}
              </select>
              <button onClick={assignRider} className="btn btn-primary w-full">Assign Rider</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
