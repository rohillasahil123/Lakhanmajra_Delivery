import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { getMe, getPermissions } from '../auth';

/* ================= TYPES ================= */

type User = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: any;
  isActive?: boolean;
};

type Role = {
  _id: string;
  name: string;
};

/* ================= COMPONENT ================= */

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const [userSummary, setUserSummary] = useState<Record<string, number>>({});

  /* ================= PERMISSION ================= */

  const isSuperAdmin = currentRole === 'superadmin';

  const hasPerm = (p: string) =>
    isSuperAdmin || permissions.includes(p);

  const resolveRoleName = (u: User) => {
    if (!u.roleId) return undefined;
    if (typeof u.roleId === 'object') return u.roleId.name;
    return roles.find((r) => r._id === u.roleId)?.name;
  };

  /* ================= LOADERS ================= */

  const loadUsers = async (pageNum = 1) => {
    const res = await api.get(`/admin/users?page=${pageNum}&limit=${limit}`);

    const payload = Array.isArray(res.data?.users)
      ? res.data.users
      : Array.isArray(res.data?.data?.users)
      ? res.data.data.users
      : Array.isArray(res.data?.data)
      ? res.data.data
      : [];

    setUsers(payload);
    setTotal(
      res.data?.total ??
        res.data?.data?.total ??
        payload.length
    );
    setPage(pageNum);
  };

  const loadSummary = async () => {
    const res = await api.get('/admin/users/summary');
    setUserSummary(res.data?.data?.summary || {});
  };

  /* ================= INIT ================= */

  useEffect(() => {
    (async () => {
      const me = await getMe();
      const roleName =
        me.data?.roleId?.name || me.data?.role || null;

      setCurrentRole(roleName);

      const perms = (await getPermissions()) || [];
      setPermissions(perms);

      // 🔥 SUPERADMIN ALWAYS ALLOWED
      if (!perms.includes('users:view') && roleName !== 'superadmin') {
        setUsers([me.data]);
        setTotal(1);
        return;
      }

      const rolesRes = await api.get('/admin/roles');
      setRoles(
        Array.isArray(rolesRes.data?.data)
          ? rolesRes.data.data
          : rolesRes.data || []
      );

      await loadUsers(1);
      await loadSummary();
    })();
  }, []);

  /* ================= FILTER ================= */

  const filteredUsers = useMemo(() => {
    if (!activeRoleFilter) return users;
    return users.filter(
      (u) =>
        resolveRoleName(u)?.toLowerCase() ===
        activeRoleFilter.toLowerCase()
    );
  }, [users, activeRoleFilter, roles]);

  /* ================= ACTIONS ================= */

  const changeRole = async (id: string, roleId: string) => {
    await api.patch(`/auth/users/${id}/role`, { roleId });
    await loadUsers(page);
    await loadSummary();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete user permanently?')) return;
    await api.delete(`/auth/users/${id}`);
    await loadUsers(page);
    await loadSummary();
  };

  /* ================= UI ================= */

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>

      {/* ROLE FILTER */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <button
          onClick={() => setActiveRoleFilter(null)}
          className={`px-4 py-2 border rounded ${
            !activeRoleFilter
              ? 'bg-sky-600 text-white'
              : 'bg-white'
          }`}
        >
          All
        </button>

        {Object.entries(userSummary).map(([role, count]) => (
          <button
            key={role}
            onClick={() => setActiveRoleFilter(role)}
            className={`px-4 py-2 border rounded ${
              activeRoleFilter === role
                ? 'bg-sky-600 text-white'
                : 'bg-white'
            }`}
          >
            <div className="font-semibold">{role}</div>
            <div className="text-sm">{count}</div>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full table-auto">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email / Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u._id} className="border-b">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email ?? u.phone}</td>
                <td className="p-3">{resolveRoleName(u) ?? '—'}</td>
                <td className="p-3 flex gap-2">
                  {hasPerm('roles:manage') && (
                    <select
                      className="border px-2 py-1"
                      value={u.roleId?._id || u.roleId || ''}
                      onChange={(e) =>
                        changeRole(u._id, e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {hasPerm('users:delete') && (
                    <button
                      className="bg-red-600 text-white px-2"
                      onClick={() => deleteUser(u._id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex justify-between">
        <div>Total users: {filteredUsers.length}</div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => loadUsers(page - 1)}
          >
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => loadUsers(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
