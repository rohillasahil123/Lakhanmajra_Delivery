import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type RiderProfile = {
  fullName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  otpCode?: string;
  aadhaarNumber?: string;
  aadhaarFrontImage?: string;
  aadhaarBackImage?: string;
  liveSelfieImage?: string;
  dlNumber?: string;
  dlExpiryDate?: string;
  dlFrontImage?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  rcFrontImage?: string;
  insuranceImage?: string;
};

type Rider = { _id: string; name: string; email?: string; phone?: string; roleId?: any; isActive?: boolean; riderProfile?: RiderProfile };
type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
type RiderWithKyc = Rider & {
  kycStatus?: KycStatus;
  kycRejectReason?: string;
};
type Role = { _id: string; name: string };

const riderKycFields: Array<keyof RiderProfile> = [
  'fullName',
  'dateOfBirth',
  'phoneNumber',
  'otpCode',
  'aadhaarNumber',
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlNumber',
  'dlExpiryDate',
  'dlFrontImage',
  'vehicleNumber',
  'vehicleType',
  'rcFrontImage',
  'insuranceImage',
];

const getKycCompletion = (rider: Rider): number => {
  const profile = rider.riderProfile;
  if (!profile) return 0;

  const completeCount = riderKycFields.filter((field) => {
    const value = profile[field];
    return typeof value === 'string' && value.trim().length > 0;
  }).length;

  return Math.round((completeCount / riderKycFields.length) * 100);
};

const AVATAR_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#009688',
  '#3F51B5', '#E91E63', '#00BCD4', '#FF9800', '#607D8B',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Riders() {
  const [riders, setRiders] = useState<RiderWithKyc[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'incomplete' | KycStatus>('all');

  // create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUpdating, setEditUpdating] = useState(false);
  const [reviewingKycId, setReviewingKycId] = useState<string | null>(null);

  const loadRiders = async (pageNum = 1, status: 'all' | 'incomplete' | KycStatus = kycFilter) => {
    try {
      const res = await api.get(`/admin/users/rider-kyc?status=${status}&page=${pageNum}&limit=${limit}`);
      const data = res.data?.data ?? res.data;
      const riderRows = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setRiders(riderRows as RiderWithKyc[]);
      setTotal(data?.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setRiders([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setPermissions(await getPermissions());
        const rolesRes = await api.get('/admin/roles');
        const rolesPayload = rolesRes.data?.data ?? rolesRes.data ?? [];
        setRoles(Array.isArray(rolesPayload) ? rolesPayload : []);
        await loadRiders(1);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    loadRiders(1, kycFilter).catch(() => {});
  }, [kycFilter]);

  const filteredRiders = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return riders;
    }

    return riders.filter((rider) => {
      const kycCompletion = getKycCompletion(rider);
      const kycStatus = rider.kycStatus || 'not_submitted';
      const kycCompletionLabel = kycCompletion === 100 ? 'complete' : 'incomplete';
      const kycSearchText = [
        kycStatus,
        kycCompletionLabel,
        `${kycCompletion}%`,
        kycCompletion === 100 ? 'approved' : 'pending',
        kycStatus === 'not_submitted' ? 'not submitted' : '',
      ]
        .join(' ')
        .toLowerCase();

      const name = String(rider.name || '').toLowerCase();
      const email = String(rider.email || '').toLowerCase();
      const phone = String(rider.phone || '').toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        kycSearchText.includes(query)
      );
    });
  }, [riders, searchText]);

  const hasPerm = (p: string) => permissions.includes(p);

  const createRider = async () => {
    if (!newName || (!newEmail && !newPhone) || !newPassword)
      return alert('name, (email or phone), password required');
    setCreating(true);
    try {
      const regRes = await api.post('/auth/register', {
        name: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        password: newPassword,
      });
      const riderId = regRes.data?.user?._id || regRes.data?.user?.id;
      const riderRole = roles.find(r => r.name === 'rider' || r.name === 'Rider');
      if (riderId && riderRole) {
        await api.patch(`/auth/users/${riderId}/role`, { roleId: riderRole._id });
      }
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewPassword('');
      await loadRiders(1);
      alert('Rider created');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (rider: Rider) => {
    setEditingId(rider._id);
    setEditName(rider.name);
    setEditEmail(rider.email || '');
    setEditPhone(rider.phone || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName(''); setEditEmail(''); setEditPhone('');
  };

  const saveEdit = async (riderId: string) => {
    if (!editName) return alert('name required');
    setEditUpdating(true);
    try {
      await api.patch(`/admin/users/${riderId}`, {
        name: editName,
        email: editEmail || undefined,
        phone: editPhone || undefined,
      });
      await loadRiders(page);
      cancelEdit();
      alert('Rider updated');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    } finally {
      setEditUpdating(false);
    }
  };

  const deleteRider = async (riderId: string) => {
    if (!confirm('Delete this rider?')) return;
    try {
      await api.delete(`/auth/users/${riderId}`);
      await loadRiders(page);
      alert('Rider deleted');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const toggleActive = async (riderId: string, currentlyActive: boolean) => {
    const verb = currentlyActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${verb} this rider?`)) return;
    try {
      await api.patch(`/admin/users/${riderId}/status`, { isActive: !currentlyActive });
      await loadRiders(page);
      alert('Rider status changed');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Status update failed');
    }
  };

  const reviewKyc = async (riderId: string, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = prompt('Reject reason (required):', 'Document not clear') || '';
      if (!reason.trim()) {
        alert('Reject reason required');
        return;
      }
    }

    try {
      setReviewingKycId(riderId);
      await api.patch(`/admin/users/${riderId}/kyc-review`, {
        status,
        reason: reason.trim() || undefined,
      });
      await loadRiders(page);
      alert(status === 'approved' ? 'KYC approved' : 'KYC rejected');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'KYC review failed');
    } finally {
      setReviewingKycId(null);
    }
  };

  const renderKycStatusBadge = (status?: KycStatus) => {
    const normalized = status || 'not_submitted';
    const className =
      normalized === 'approved'
        ? 'bg-emerald-100 text-emerald-700'
        : normalized === 'pending'
        ? 'bg-amber-100 text-amber-700'
        : normalized === 'rejected'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-slate-100 text-slate-700';

    const label =
      normalized === 'approved'
        ? 'Approved'
        : normalized === 'pending'
        ? 'Incomplete'
        : normalized === 'rejected'
        ? 'Rejected'
        : 'Not Submitted';

    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>{label}</span>;
  };

  const totalPages = Math.ceil((total || 0) / limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400 mb-0.5">{total ?? 0} riders found</p>
          <h2 className="text-2xl font-semibold text-slate-800">Riders</h2>
        </div>
        {hasPerm('users:create') && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm font-medium"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Rider
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[480px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Create Rider</h3>
            <div className="flex flex-col gap-3">
              <input className="border px-3 py-2 rounded text-sm" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className="border px-3 py-2 rounded text-sm" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              <input className="border px-3 py-2 rounded text-sm" placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <input className="border px-3 py-2 rounded text-sm" placeholder="Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 text-sm"
                onClick={() => { createRider(); setShowCreateModal(false); }}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Rider'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="w-full sm:max-w-sm border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Search rider by name, phone, email"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="w-full sm:w-56 border border-slate-300 rounded px-3 py-2 text-sm bg-white"
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value as 'all' | 'incomplete' | KycStatus)}
        >
          <option value="all">All KYC</option>
          <option value="incomplete">Incomplete</option>
          <option value="approved">Complete (Approved)</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="border-b">
            <tr className="text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">KYC</th>
              <th className="px-5 py-3 font-medium">KYC Review</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRiders.map((r) => {
              const avatarColor = getAvatarColor(r.name);
              const initials = getInitials(r.name);
              const kycCompletion = getKycCompletion(r);
              const kycComplete = kycCompletion === 100;
              const kycStatus = r.kycStatus || 'not_submitted';

              return (
                <tr key={r._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  {editingId === r._id ? (
                    <>
                      <td className="px-5 py-3">
                        <input className="border px-2 py-1 rounded w-full text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <input className="border px-2 py-1 rounded flex-1 text-sm" placeholder="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                          <input className="border px-2 py-1 rounded flex-1 text-sm" placeholder="phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">rider</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${kycComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {kycComplete ? 'Complete (100%)' : `Incomplete (${kycCompletion}%)`}
                        </span>
                      </td>
                      <td className="px-5 py-3">{renderKycStatusBadge(kycStatus)}</td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${r.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700" onClick={() => saveEdit(r._id)} disabled={editUpdating}>Save</button>
                          <button className="px-3 py-1 bg-slate-200 text-sm rounded hover:bg-slate-300" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* USER column — avatar + name + email */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-sm leading-tight">{r.name}</div>
                            {r.email && <div className="text-xs text-slate-400 mt-0.5">{r.email}</div>}
                          </div>
                        </div>
                      </td>

                      {/* PHONE column */}
                      <td className="px-5 py-3 text-sm text-slate-600">{r.phone ?? '—'}</td>

                      {/* ROLE column — colored badge */}
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          rider
                        </span>
                      </td>

                      {/* KYC column */}
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${kycComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {kycComplete ? 'Complete (100%)' : `Incomplete (${kycCompletion}%)`}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {renderKycStatusBadge(kycStatus)}
                          {kycStatus === 'rejected' && r.kycRejectReason ? (
                            <span className="text-xs text-rose-600">{r.kycRejectReason}</span>
                          ) : null}
                        </div>
                      </td>

                      {/* STATUS column — dot + text */}
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${r.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* ACTIONS — icon buttons */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {hasPerm('users:update') && (
                            <button
                              title="Edit"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              onClick={() => startEdit(r)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                              </svg>
                            </button>
                          )}
                          {hasPerm('users:update') && (
                            <button
                              title={r.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded transition-colors ${r.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                              onClick={() => toggleActive(r._id, r.isActive ?? true)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                              </svg>
                            </button>
                          )}
                          {hasPerm('users:update') && kycStatus === 'pending' && (
                            <button
                              title="Approve KYC"
                              className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              onClick={() => reviewKyc(r._id, 'approved')}
                              disabled={reviewingKycId === r._id}
                            >
                              ✓
                            </button>
                          )}
                          {hasPerm('users:update') && kycStatus === 'pending' && (
                            <button
                              title="Reject KYC"
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              onClick={() => reviewKyc(r._id, 'rejected')}
                              disabled={reviewingKycId === r._id}
                            >
                              ✕
                            </button>
                          )}
                          {hasPerm('users:delete') && (
                            <button
                              title="Delete"
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => deleteRider(r._id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {filteredRiders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">No riders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-slate-400">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button
            disabled={page === 1}
            onClick={() => loadRiders(Math.max(1, page - 1), kycFilter)}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm"
          >
            Prev
          </button>
          <span className="px-2 text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => loadRiders(Math.min(totalPages, page + 1), kycFilter)}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}