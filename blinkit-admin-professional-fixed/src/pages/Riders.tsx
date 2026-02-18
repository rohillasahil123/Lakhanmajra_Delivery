import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Edit2, Trash2, MapPin, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import { formatDateTime, debounce } from '../utils/helpers';
import Loading from '../components/Loading';
import type { Rider } from '../types';

const Riders: React.FC = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [search, setSearch] = useState('');

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadRiders();
  }, [page, search]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const perms = await getPermissions();
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRiders = async () => {
    try {
      const searchParam = search ? `&q=${search}` : '';
      const res = await api.get(`/admin/users?role=rider&page=${page}&limit=${limit}${searchParam}`);
      const data = res.data?.data ?? res.data;
      setRiders(Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      console.error('Failed to load riders:', err);
    }
  };

  const handleSearch = debounce((value: string) => {
    setSearch(value);
    setPage(1);
  }, 500);

  const deleteRider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rider?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      await loadRiders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete rider');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loading size="lg" text="Loading riders..." /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Riders</h1>
          <p className="text-gray-600 mt-1">Manage your delivery team</p>
        </div>
        {hasPerm('users:create') && (
          <button className="btn btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" /><span>Add Rider</span>
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search riders..." onChange={(e) => handleSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {riders.map((rider) => (
          <div key={rider._id} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blinkit-yellow to-blinkit-green flex items-center justify-center text-white font-bold">
                  {rider.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rider.name}</h3>
                  <p className="text-sm text-gray-600">{rider.email || rider.phone}</p>
                </div>
              </div>
              {(hasPerm('users:update') || hasPerm('users:delete')) && (
                <div className="flex items-center gap-1">
                  {hasPerm('users:update') && (
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPerm('users:delete') && (
                    <button onClick={() => deleteRider(rider._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`badge ${rider.isAvailable ? 'badge-success' : 'badge-warning'}`}>
                  {rider.isAvailable ? 'Available' : 'Busy'}
                </span>
              </div>
              {rider.vehicle && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium">{rider.vehicle}</span>
                </div>
              )}
              {rider.completedOrders !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-medium">{rider.completedOrders} orders</span>
                </div>
              )}
              {rider.rating !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Rating</span>
                  <span className="font-medium">⭐ {rider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {riders.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No riders found</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} riders
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary disabled:opacity-50">Previous</button>
            <span className="px-4 py-2 text-gray-700">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn btn-secondary disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Riders;
