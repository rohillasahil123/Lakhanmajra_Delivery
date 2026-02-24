import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Rider = { _id: string; name: string; email?: string; phone?: string; roleId?: any; isActive?: boolean };
type Role = { _id: string; name: string };

export default function Riders() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [roles, setRoles] = useState<Role[]>([]);

  // create form
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

  const loadRiders = async (pageNum = 1) => {
    try {
      const res = await api.get(`/admin/users?role=rider&page=${pageNum}&limit=${limit}`);
      const data = res.data?.data ?? res.data;
      const riderRows = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setRiders(riderRows);
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

  const hasPerm = (p: string) => permissions.includes(p);

  const createRider = async () => {
    if (!newName || (!newEmail && !newPhone) || !newPassword) return alert('name, (email or phone), password required');
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

      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
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
    setEditName('');
    setEditEmail('');
    setEditPhone('');
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

  const totalPages = Math.ceil((total || 0) / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Riders</h2>
      </div>

      {hasPerm('users:create') && (
        <div className="mb-4 bg-white p-4 rounded shadow">
          <div className="flex gap-2 items-center mb-3">
            <input
              className="border px-3 py-2 rounded"
              placeholder="name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="phone"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded"
              placeholder="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <button
              className="bg-sky-600 text-white px-4 rounded"
              onClick={createRider}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Rider'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email / Phone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r._id} className="border-b last:border-0">
                {editingId === r._id ? (
                  <>
                    <td className="p-3"><input className="border px-2 py-1 rounded w-full" value={editName} onChange={e => setEditName(e.target.value)} /></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <input className="border px-2 py-1 rounded flex-1" placeholder="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        <input className="border px-2 py-1 rounded flex-1" placeholder="phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                      </div>
                    </td>
                    <td className="p-3">{r.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button className="px-2 py-1 bg-green-600 text-white text-sm rounded" onClick={() => saveEdit(r._id)} disabled={editUpdating}>Save</button>
                        <button className="px-2 py-1 bg-slate-300 text-sm rounded" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.email ?? r.phone}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {hasPerm('users:update') && (
                          <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={() => startEdit(r)}>Edit</button>
                        )}
                        {hasPerm('users:update') && (
                          <button
                            className="px-2 py-1 bg-amber-600 text-white text-sm rounded"
                            onClick={() => toggleActive(r._id, r.isActive ?? true)}
                          >
                            {r.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        {hasPerm('users:delete') && (
                          <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteRider(r._id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </>
                )}
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
            onClick={() => loadRiders(Math.max(1, page - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => loadRiders(Math.min(totalPages, page + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
