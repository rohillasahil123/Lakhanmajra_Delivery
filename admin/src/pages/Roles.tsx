import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Permission = { _id: string; name: string; description?: string };
type Role = { _id: string; name: string; description?: string; permissions?: Permission[] };

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const load = async () => {
    try {
      const res = await api.get('/admin/roles');
      const payload = res.data?.data ?? res.data ?? [];
      setRoles(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [permsRes] = await Promise.all([api.get('/admin/permissions')]);
        const perms = permsRes.data?.data ?? permsRes.data ?? [];
        setAvailablePermissions(Array.isArray(perms) ? perms : []);
        setPermissions(await getPermissions());
        await load();
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const hasPerm = (p: string) => permissions.includes(p);

  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [roleUsersMap, setRoleUsersMap] = useState<Record<string, any[]>>({});
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const togglePerm = (id: string) => {
    setSelectedPerms((s) => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  };

  const create = async () => {
    try {
      const payload: any = { name, description: desc };
      if (selectedPerms.length) payload.permissionIds = selectedPerms;
      const res = await api.post('/admin/roles', payload);
      const created = res.data?.data ?? res.data;
      setRoles((r) => [created, ...r]);
      setName('');
      setDesc('');
      setSelectedPerms([]);
      alert('Role created');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Create failed');
    }
  };

  const updateRole = async (roleId: string, updates: { name?: string; description?: string; permissionIds?: string[] }) => {
    try {
      const res = await api.patch(`/admin/roles/${roleId}`, updates);
      const updated = res.data?.data ?? res.data;
      setRoles((r) => r.map(x => x._id === updated._id ? updated : x));
      alert('Role updated');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Update failed');
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('Delete this role? This cannot be undone')) return;
    try {
      await api.delete(`/admin/roles/${roleId}`);
      setRoles((r) => r.filter(x => x._id !== roleId));
      alert('Role deleted');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const fetchUsersForRole = async (roleId: string) => {
    try {
      const res = await api.get(`/admin/roles/${roleId}/users`);
      const payload = res.data?.data ?? res.data ?? { users: [] };
      return payload.users || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Roles & Permissions</h2>

      {hasPerm('roles:manage') && (
        <div className="mb-4 bg-white p-4 rounded shadow">
          <div className="flex gap-2">
            <input className="border px-3 py-2 rounded flex-1" placeholder="role name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border px-3 py-2 rounded flex-2" placeholder="description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <button className="bg-sky-600 text-white px-4 rounded" onClick={create}>Create</button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 max-h-40 overflow-auto">
            {availablePermissions.map(p => (
              <label key={p._id} className="text-sm inline-flex items-center gap-2">
                <input type="checkbox" checked={selectedPerms.includes(p._id)} onChange={() => togglePerm(p._id)} />
                <span className="capitalize">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-auto">
        <ul>
          {roles.map((r) => (
            <li key={r._id} className="border-b p-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {editingRoleId === r._id ? (
                    <div className="space-y-2">
                      <input className="border px-2 py-1 w-1/3 rounded" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <input className="border px-2 py-1 w-2/3 rounded" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async () => {
                          await updateRole(r._id, { name: editName, description: editDesc });
                          setEditingRoleId(null);
                        }}>Save</button>
                        <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setEditingRoleId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-sm text-slate-500">{r.description}</div>
                      <div className="mt-2 text-xs text-slate-600">Permissions: { (r.permissions || []).map((p:any) => p.name).join(', ') || '—' }</div>
                    </>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {hasPerm('roles:manage') && (
                      <>
                        <button className="px-2 py-1 bg-indigo-600 text-white text-sm rounded" onClick={() => { setEditingRoleId(r._id); setEditName(r.name); setEditDesc(r.description || ''); }}>Edit</button>
                        <button className="px-2 py-1 bg-slate-100 text-sm rounded" onClick={async () => {
                          const expand = expandedRole === r._id ? null : r._id;
                          setExpandedRole(expand);
                          if (expand) {
                            const users = await fetchUsersForRole(r._id);
                            setRoleUsersMap(m => ({ ...m, [r._id]: users }));
                          }
                        }}>{expandedRole === r._id ? 'Hide users' : 'Show users'}</button>
                        <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteRole(r._id)}>Delete</button>
                      </>
                    )}
                  </div>

                  {hasPerm('roles:manage') && (
                    <div className="text-xs">Edit permissions</div>
                  )}

                  {hasPerm('roles:manage') && (
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-auto mt-2">
                      {availablePermissions.map(p => (
                        <label key={p._id} className="text-sm inline-flex items-center gap-2">
                          <input type="checkbox" defaultChecked={(r.permissions || []).some((rp:any) => rp._id === p._id)} onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            const current = r.permissions?.map((x:any)=>x._id) || [];
                            const next = checked ? [...current, p._id] : current.filter((id:any)=>id !== p._id);
                            updateRole(r._id, { permissionIds: next });
                          }} />
                          <span className="capitalize">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {expandedRole === r._id && (
                <div className="mt-3 bg-slate-50 p-3 rounded">
                  <div className="text-sm font-medium mb-2">Users with role "{r.name}"</div>
                  <div className="space-y-2">
                    {(roleUsersMap[r._id] || []).length === 0 ? (
                      <div className="text-sm text-slate-500">No users assigned</div>
                    ) : (
                      (roleUsersMap[r._id] || []).map((u:any) => (
                        <div key={u._id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email ?? u.phone}</div>
                          </div>
                          <div className="text-sm text-slate-500">{u.isActive ? 'Active' : 'Inactive'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
