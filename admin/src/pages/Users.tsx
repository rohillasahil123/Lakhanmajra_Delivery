import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getMe, getPermissions } from '../auth';

type User = { _id: string; name: string; email?: string; phone?: string; roleId?: any };
type Role = { _id: string; name: string; description?: string };
type AuditLog = { _id: string; actorId?: any; action: string; resource: string; resourceId?: string; before?: any; after?: any; createdAt?: string };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [userSummary, setUserSummary] = useState<Record<string, number>>({});
  const [permissions, setPermissions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // create-user form state (superadmin only)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [creating, setCreating] = useState(false);

  // bulk assign
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // audit logs viewer
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadUsers = async (pageNum = 1) => {
    try {
      const res = await api.get(`/admin/users?page=${pageNum}&limit=${limit}`);
      setUsers(res.data?.users || res.data?.data || []);
      setTotal(res.data?.total ?? null);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await getMe();
        const roleName = meRes.data?.roleId?.name || meRes.data?.role || null;
        setCurrentRole(roleName);

        const perms = await getPermissions();
        setPermissions(perms);

        if (perms.includes('users:view')) {
          const [rolesRes, summaryRes] = await Promise.all([
            api.get('/admin/roles'),
            api.get('/admin/users/summary'),
          ]);

          const rolesPayload = rolesRes.data?.data ?? rolesRes.data ?? [];
          setRoles(Array.isArray(rolesPayload) ? rolesPayload : []);

          setUserSummary(summaryRes.data?.data?.summary || {});
          await loadUsers(1);
        } else {
          setUsers([meRes.data]);
          setTotal(1);
          setRoles([]);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p) || currentRole === 'superadmin';

  const reloadRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      const payload = res.data?.data ?? res.data ?? [];
      setRoles(Array.isArray(payload) ? payload : []);
      alert('Roles reloaded (' + (Array.isArray(payload) ? payload.length : 0) + ')');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load roles');
    }
  };

  const changeRole = async (userId: string, roleId: string) => {
    if (!hasPerm('roles:manage')) return alert('Insufficient permission');
    if (!confirm('Change role for this user?')) return;
    try {
      await api.patch(`/auth/users/${userId}/role`, { roleId });
      setUsers((s) => s.map((u) => (u._id === userId ? { ...u, roleId: roles.find((r) => r._id === roleId) } : u)));

      const summaryRes = await api.get('/admin/users/summary');
      setUserSummary(summaryRes.data?.data?.summary || {});

      alert('Role updated');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Role update failed');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Pakka delete karna hai? This is irreversible.')) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      await loadUsers(page);
      setTotal((t) => (t ? t - 1 : null));

      const summaryRes = await api.get('/admin/users/summary');
      setUserSummary(summaryRes.data?.data?.summary || {});

      alert('User deleted');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const toggleActive = async (userId: string, currentlyActive: boolean) => {
    const verb = currentlyActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${verb} this user?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentlyActive });
      if (currentlyActive) {
        await loadUsers(page);
        setTotal((t) => (t ? t - 1 : null));
      }

      const summaryRes = await api.get('/admin/users/summary');
      setUserSummary(summaryRes.data?.data?.summary || {});

      alert('User status changed');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Status update failed');
    }
  };

  const makeAdmin = async (userId: string) => {
    const adminRole = roles.find((r) => r.name === 'admin' || r.name === 'Admin');
    if (!adminRole) return alert('Admin role not available. Reload roles or run seed.');
    await changeRole(userId, adminRole._id);
  };

  const createUser = async () => {
    if (!newName || (!newEmail && !newPhone) || !newPassword) {
      alert('Provide name, (email or phone) and password');
      return;
    }
    setCreating(true);
    try {
      const regRes = await api.post('/auth/register', {
        name: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        password: newPassword,
      });

      const createdId = regRes.data?.user?._id || regRes.data?.user?.id || null;

      if (createdId && newRoleId) {
        await api.patch(`/auth/users/${createdId}/role`, { roleId: newRoleId });
      }

      const [refreshed, summaryRes] = await Promise.all([
        api.get(`/admin/users?page=${page}&limit=${limit}`),
        api.get('/admin/users/summary')
      ]);
      setUsers(refreshed.data?.users || refreshed.data?.data || []);
      setTotal(refreshed.data?.total ?? null);
      setUserSummary(summaryRes.data?.data?.summary || {});

      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewRoleId('');

      alert('User created' + (createdId && newRoleId ? ' and role assigned' : ''));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  // Bulk assign role
  const bulkAssignRole = async () => {
    if (selectedUsers.size === 0 || !bulkRoleId) return alert('Select users and role');
    if (!confirm(`Assign ${roles.find(r => r._id === bulkRoleId)?.name} to ${selectedUsers.size} users?`)) return;

    setBulkAssigning(true);
    try {
      const userIds = Array.from(selectedUsers);
      let success = 0;
      for (const userId of userIds) {
        try {
          await api.patch(`/auth/users/${userId}/role`, { roleId: bulkRoleId });
          success++;
        } catch (e) {
          console.error(e);
        }
      }
      alert(`Assigned role to ${success}/${userIds.length} users`);
      await loadUsers(page);
      setSelectedUsers(new Set());
      setBulkRoleId('');
      setShowBulkModal(false);

      const summaryRes = await api.get('/admin/users/summary');
      setUserSummary(summaryRes.data?.data?.summary || {});
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Bulk assign failed');
    } finally {
      setBulkAssigning(false);
    }
  };

  // Load audit logs
  const viewAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/admin/audit?limit=100');
      setAuditLogs(res.data?.data ?? res.data ?? []);
      setShowAuditModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u._id)));
    }
  };

  const totalPages = Math.ceil((total || 0) / limit);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>

      {hasPerm('users:create') && (
        <div className="mb-4 bg-white p-4 rounded shadow">
          <div className="flex gap-2 items-center">
            <input className="border px-3 py-2 rounded" placeholder="name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="border px-3 py-2 rounded" placeholder="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <input className="border px-3 py-2 rounded" placeholder="phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <input className="border px-3 py-2 rounded" placeholder="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

            {hasPerm('roles:manage') && (
              <select className="border px-3 py-2 rounded" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}>
                <option value="">{roles.length ? 'Select role' : 'No roles available'}</option>
                {roles.length > 0 && roles.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            )}

            <button className="bg-sky-600 text-white px-4 rounded" onClick={createUser} disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
          </div>
          {roles.length === 0 && (
            <div className="mt-2 flex items-center gap-3">
              <div className="text-sm text-amber-600">No roles found — run backend seed or reload.</div>
              <button className="text-slate-700 underline" onClick={reloadRoles}>Reload roles</button>
            </div>
          )}
          <div className="mt-2 text-sm text-slate-500">Tip: create user here then assign role.</div>

          <div className="mt-3 flex gap-3">
            {Object.entries(userSummary).map(([roleName, count]) => (
              <div key={roleName} className="px-3 py-1 bg-slate-100 rounded text-sm">
                <strong className="block">{roleName}</strong>
                <span className="text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk actions toolbar */}
      <div className="mb-4 flex gap-2 items-center">
        {hasPerm('roles:manage') && (
          <>
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm"
              onClick={() => setShowBulkModal(true)}
              disabled={selectedUsers.size === 0}
            >
              Bulk Assign ({selectedUsers.size})
            </button>
          </>
        )}
        {hasPerm('reports:view') && (
          <button
            className="bg-slate-600 text-white px-4 py-2 rounded text-sm"
            onClick={viewAuditLogs}
          >
            Audit Logs
          </button>
        )}
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              {hasPerm('roles:manage') && <th className="p-3"><input type="checkbox" checked={selectedUsers.size === users.length} onChange={toggleSelectAll} /></th>}
              <th className="p-3">Name</th>
              <th className="p-3">Email / Phone</th>
              <th className="p-3">Role</th>
              {(hasPerm('users:update') || hasPerm('users:delete') || hasPerm('roles:manage')) && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(users) ? users : []).map((u) => (
              <tr key={u._id} className="border-b last:border-0">
                {hasPerm('roles:manage') && (
                  <td className="p-3"><input type="checkbox" checked={selectedUsers.has(u._id)} onChange={() => toggleSelectUser(u._id)} /></td>
                )}
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email ?? u.phone}</td>
                <td className="p-3">
                  {hasPerm('roles:manage') ? (
                    <div className="flex items-center gap-2">
                      <select className="border px-2 py-1 rounded" disabled={roles.length === 0} value={u.roleId?._id || ''} onChange={(e) => changeRole(u._id, e.target.value)}>
                        <option value="">{roles.length ? '— select —' : 'No roles'}</option>
                        {roles.length > 0 && roles.map((r) => (
                          <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                      </select>
                      {roles.length === 0 && <button className="text-slate-700 underline text-sm" onClick={reloadRoles}>Reload roles</button>}
                    </div>
                  ) : (
                    u.roleId?.name ?? '—'
                  )}
                </td>

                {(hasPerm('users:update') || hasPerm('users:delete') || hasPerm('roles:manage')) && (
                  <td className="p-3">
                    <div className="flex gap-2 items-center">
                      {hasPerm('roles:manage') && u.roleId?.name !== 'admin' && (
                        <button className="px-2 py-1 bg-amber-400 text-sm rounded" onClick={() => makeAdmin(u._id)}>Make admin</button>
                      )}

                      {hasPerm('users:update') && (
                        <button className="px-2 py-1 bg-slate-100 text-sm rounded" onClick={() => toggleActive(u._id, true)}>Deactivate</button>
                      )}

                      {hasPerm('users:delete') && (
                        <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteUser(u._id)}>Delete</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-slate-500">Total users: {total ?? '—'}</div>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => loadUsers(Math.max(1, page - 1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => loadUsers(Math.min(totalPages, page + 1))} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Bulk Assign Role</h3>
            <p className="text-sm text-slate-600 mb-4">Assigning role to {selectedUsers.size} users</p>
            <select
              className="w-full border px-3 py-2 rounded mb-4"
              value={bulkRoleId}
              onChange={e => setBulkRoleId(e.target.value)}
            >
              <option value="">Select role...</option>
              {roles.map(r => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 border rounded" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
                onClick={bulkAssignRole}
                disabled={bulkAssigning}
              >
                {bulkAssigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-lg">✕</button>
            </div>

            {auditLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-slate-500">No audit logs</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log._id} className="border rounded p-3 bg-slate-50 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <strong>{log.action}</strong>
                        <span className="text-xs text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</span>
                      </div>
                      <div className="text-slate-600">Resource: {log.resource} (ID: {log.resourceId})</div>
                      <div className="text-slate-600">Actor: {log.actorId?.name || 'Unknown'}</div>
                      {log.before && <div className="text-xs text-slate-500 mt-1">Before: {JSON.stringify(log.before).substring(0, 100)}</div>}
                      {log.after && <div className="text-xs text-slate-500">After: {JSON.stringify(log.after).substring(0, 100)}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end border-t pt-3 mt-4">
              <button className="px-4 py-2 border rounded" onClick={() => setShowAuditModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
