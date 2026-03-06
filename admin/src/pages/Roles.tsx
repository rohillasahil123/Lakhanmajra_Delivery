import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';

type Permission = { _id: string; name: string; description?: string };
type Role = { _id: string; name: string; description?: string; permissions?: Permission[] };
type ApiError = { response?: { data?: { message?: string } } };
type UpdatePayload = {
  name?: string;
  description?: string;
  permissionIds?: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Group permissions by module (products, orders, users, etc.)
const groupPermissions = (perms: Permission[]) => {
  const groups: Record<string, Permission[]> = {};
  perms.forEach((p) => {
    const module = p.name.split(':')[0] || 'other';
    if (!groups[module]) groups[module] = [];
    groups[module].push(p);
  });
  return groups;
};

const MODULE_ICONS: Record<string, string> = {
  products: '📦',
  categories: '📂',
  orders: '🧾',
  users: '👤',
  riders: '🚴',
  roles: '🛡',
  reports: '📊',
  other: '⚙️',
};

const compareModuleEntries = (
  first: [string, unknown],
  second: [string, unknown]
): number => first[0].localeCompare(second[0], undefined, {sensitivity: 'base'});

const ROLE_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
];

// ─── Create Role Modal ────────────────────────────────────────────────────────

function CreateRoleModal({
  availablePermissions, onCreate, onClose,
}: {
  availablePermissions: Permission[];
  onCreate: (name: string, desc: string, permIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groups = groupPermissions(availablePermissions);

  const toggle = (id: string) =>
    setPerms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(name.trim(), desc.trim(), perms);
      onClose();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to create role';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-slate-800 text-lg">Create New Role</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="roleName" className="text-xs text-slate-500 mb-1 block font-medium">
                Role Name *
              </label>
              <input
                id="roleName"
                className="border border-slate-200 px-3 py-2.5 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                placeholder="e.g. Manager, Vendor..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="roleDescription" className="text-xs text-slate-500 mb-1 block font-medium">
                Description
              </label>
              <input
                id="roleDescription"
                className="border border-slate-200 px-3 py-2.5 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                placeholder="What can this role do?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {/* Permissions grouped by module */}
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-2 block font-medium uppercase tracking-wide">
                Permissions ({perms.length} selected)
              </label>
              <div className="space-y-3">
                {Object.entries(groups).sort(compareModuleEntries).map(([module, modulePerms]) => (
                  <div key={module} className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span>{MODULE_ICONS[module] || '⚙️'}</span>
                        <span className="text-xs font-semibold text-slate-600 capitalize">{module}</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        onClick={() => {
                          const allSelected = modulePerms.every((p) => perms.includes(p._id));
                          if (allSelected) {
                            setPerms((prev) => prev.filter((id) => !modulePerms.find((p) => p._id === id)));
                          } else {
                            setPerms((prev) => [...new Set([...prev, ...modulePerms.map((p) => p._id)])]);
                          }
                        }}>
                        {modulePerms.every((p) => perms.includes(p._id)) ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="px-3 py-2 flex flex-wrap gap-2">
                      {modulePerms.map((p) => (
                        <label
                          key={p._id}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                            perms.includes(p._id)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={perms.includes(p._id)}
                            onChange={() => toggle(p._id)}
                          />
                          {p.name.split(':')[1] || p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>isko
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
            <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-300 transition-colors" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Role Detail Modal ────────────────────────────────────────────────────────

function RoleDetailModal({
  role,
  colorIdx,
  availablePermissions,
  hasPerm,
  onClose,
  onUpdate,
  onDelete,
}: {
  role: Role;
  colorIdx: number;
  availablePermissions: Permission[];
  hasPerm: (p: string) => boolean;
  onClose: () => void;
  onUpdate: (roleId: string, updates: UpdatePayload) => Promise<void>;
  onDelete: (roleId: string) => Promise<void>;
}) {
  const c = ROLE_COLORS[colorIdx % ROLE_COLORS.length];
  const groups = groupPermissions(availablePermissions);

  const [editName, setEditName] = useState(role.name);
  const [editDesc, setEditDesc] = useState(role.description || '');
  const [editPerms, setEditPerms] = useState<string[]>(role.permissions?.map((p) => p._id) || []);
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (id: string) =>
    setEditPerms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSave = async () => {
    if (!editName.trim()) {
      setError('Name required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onUpdate(role._id, {
        name: editName.trim(),
        description: editDesc.trim(),
        permissionIds: editPerms,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to update role';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const loadUsers = async () => {
    if (usersLoaded) return;
    try {
      const res = await api.get(`/admin/roles/${role._id}/users`);
      const payload = res.data?.data ?? res.data ?? { users: [] };
      setUsers((payload as { users: any[] }).users || []);
      setUsersLoaded(true);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
      setUsersLoaded(true);
    }
  };

  const handleTabChange = (tab: 'permissions' | 'users') => {
    setActiveTab(tab);
    if (tab === 'users') {
      void loadUsers();
    }
  };

  const rolePermIds = new Set(role.permissions?.map((p) => p._id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-5 rounded-t-2xl ${c.bg} border-b ${c.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold ${c.icon}`}>
                {(role.name || '?')[0].toUpperCase()}
              </div>
              <div>
                {isEditing ? (
                  <input
                    className="border border-slate-300 px-2 py-1 rounded-lg text-sm font-semibold w-40 bg-white"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  <h3 className="font-bold text-slate-800 text-lg leading-tight capitalize">{role.name}</h3>
                )}
                {isEditing ? (
                  <input
                    className="border border-slate-300 px-2 py-1 rounded-lg text-xs mt-1 w-56 bg-white"
                    placeholder="Description..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">{role.description || 'No description'}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-500 transition-colors"
              type="button"
              aria-label="Close">
              ✕
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="bg-white/70 rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-lg font-bold text-slate-800">{role.permissions?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Permissions</p>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-lg font-bold text-slate-800">{usersLoaded ? users.length : '—'}</p>
              <p className="text-xs text-slate-500">Users</p>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-lg font-bold text-slate-800">{Object.keys(groups).length}</p>
              <p className="text-xs text-slate-500">Modules</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b">
          {(['permissions', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-3">
              {Object.entries(groups).sort(compareModuleEntries).map(([module, modulePerms]) => {
                const grantedInRole   = modulePerms.filter((p) => rolePermIds.has(p._id));
                const selectedInEdit  = modulePerms.filter((p) => editPerms.includes(p._id));
                const displayPerms    = isEditing ? modulePerms : grantedInRole;
                if (!isEditing && grantedInRole.length === 0) return null;

                  return (
                    <div key={module} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span>{MODULE_ICONS[module] || '⚙️'}</span>
                          <span className="text-xs font-semibold text-slate-600 capitalize">{module}</span>
                          <span className="text-xs text-slate-400">
                            {isEditing
                              ? `${selectedInEdit.length}/${modulePerms.length}`
                              : `${grantedInRole.length}`}
                          </span>
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                            onClick={() => {
                              const allSel = modulePerms.every((p) => editPerms.includes(p._id));
                              if (allSel) {
                                setEditPerms((prev) =>
                                  prev.filter((id) => !modulePerms.find((p) => p._id === id))
                                );
                              } else {
                                setEditPerms((prev) => [
                                  ...new Set([...prev, ...modulePerms.map((p) => p._id)]),
                                ]);
                              }
                            }}>
                            {modulePerms.every((p) => editPerms.includes(p._id)) ? 'None' : 'All'}
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2 flex flex-wrap gap-2">
                        {(isEditing ? modulePerms : grantedInRole).map((p) => {
                          const active = isEditing ? editPerms.includes(p._id) : true;
                          const action = p.name.split(':')[1] || p.name;
                          return isEditing ? (
                            <label
                              key={p._id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                                active
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              }`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={active}
                                onChange={() => togglePerm(p._id)}
                              />
                              {action}
                            </label>
                          ) : (
                            <span
                              key={p._id}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${c.icon} ${c.border}`}>
                              {action}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {!isEditing && (!role.permissions || role.permissions.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No permissions assigned to this role
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              {!usersLoaded ? (
                <div className="py-8 text-center text-slate-400 text-sm">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">👤</div>
                  <p className="text-slate-500 text-sm">No users assigned to this role</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email || u.phone || '—'}</p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          {hasPerm('roles:manage') ? (
            isEditing ? (
              <div className="flex gap-2 w-full">
                <button
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-300 transition-colors"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(role.name);
                    setEditDesc(role.description || '');
                    setEditPerms(role.permissions?.map((p) => p._id) || []);
                    setError('');
                  }}>
                  Cancel
                </button>
                <button
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex-1"
                  onClick={handleSave}
                  disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm hover:bg-red-100 transition-colors"
                  onClick={async () => {
                    // eslint-disable-next-line no-alert
                    if (confirm(`Delete role "${role.name}"?`)) {
                      await onDelete(role._id);
                      onClose();
                    }
                  }}>
                  Delete
                </button>
                <button
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-300 transition-colors ml-auto"
                  onClick={onClose}>
                  Close
                </button>
                <button
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 font-medium transition-colors"
                  onClick={() => setIsEditing(true)}>
                  ✏️ Edit Role
                </button>
              </div>
            )
          ) : (
            <button
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm ml-auto"
              onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────════════════

function RoleCard({
  role,
  colorIdx,
  onClick,
}: {
  role: Role;
  colorIdx: number;
  onClick: () => void;
}) {
  const c = ROLE_COLORS[colorIdx % ROLE_COLORS.length];
  const groups = groupPermissions(role.permissions || []);
  const modules = Object.keys(groups);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-150 hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] ${c.bg} ${c.border}`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold ${c.icon}`}>
          {(role.name || '?')[0].toUpperCase()}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.icon} border ${c.border}`}>
          {role.permissions?.length ?? 0} perms
        </span>
      </div>

      {/* Name + desc */}
      <h3 className="font-bold text-slate-800 text-base capitalize leading-tight">{role.name}</h3>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">
        {role.description || 'No description'}
      </p>

      {/* Module pills */}
      {modules.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {modules.slice(0, 4).map((mod) => (
            <span
              key={mod}
              className="inline-flex items-center gap-0.5 text-xs text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
              {MODULE_ICONS[mod] || '⚙️'} {mod}
            </span>
          ))}
          {modules.length > 4 && (
            <span className="text-xs text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
              +{modules.length - 4} more
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">Click to manage →</p>
    </button>
  );
}

// ─── Main Page ────────────────────────────════════════════════════════════════

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<{ role: Role; idx: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasPerm = (p: string) => permissions.includes(p);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/roles');
      const payload = res.data?.data ?? res.data ?? [];
      setRoles(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [permsRes] = await Promise.all([api.get('/admin/permissions')]);
        const perms = permsRes.data?.data ?? permsRes.data ?? [];
        setAllPerms(Array.isArray(perms) ? perms : []);
        setPermissions(await getPermissions());
        await load();
      } catch (err) {
        console.error('Failed to load permissions or roles:', err);
      }
    })();
  }, []);

  const handleCreate = async (name: string, desc: string, permIds: string[]) => {
    const res = await api.post('/admin/roles', {
      name,
      description: desc,
      ...(permIds.length ? { permissionIds: permIds } : {}),
    });
    const created = res.data?.data ?? res.data;
    setRoles((r) => [created, ...r]);
  };

  const handleUpdate = async (roleId: string, updates: UpdatePayload) => {
    const res = await api.patch(`/admin/roles/${roleId}`, updates);
    const updated = res.data?.data ?? res.data;
    setRoles((r) => r.map((x) => (x._id === updated._id ? updated : x)));
    // refresh selected role too
    setSelectedRole((prev) =>
      prev && prev.role._id === updated._id ? { ...prev, role: updated } : prev
    );
  };

  const handleDelete = async (roleId: string) => {
    await api.delete(`/admin/roles/${roleId}`);
    setRoles((r) => r.filter((x) => x._id !== roleId));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Roles & Permissions</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {roles.length} roles · {allPerms.length} permissions available
          </p>
        </div>
        {hasPerm('roles:manage') && (
          <button
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            onClick={() => setShowCreate(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Role
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading roles...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🛡</div>
          <p className="text-slate-500 font-medium">No roles created yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Create a role to assign permissions to users</p>
          {hasPerm('roles:manage') && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors"
              onClick={() => setShowCreate(true)}>
              + Create First Role
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {roles.map((role, idx) => (
            <RoleCard
              key={role._id}
              role={role}
              colorIdx={idx}
              onClick={() => setSelectedRole({ role, idx })}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateRoleModal
          availablePermissions={allPerms}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Role detail modal */}
      {selectedRole && (
        <RoleDetailModal
          role={selectedRole.role}
          colorIdx={selectedRole.idx}
          availablePermissions={allPerms}
          hasPerm={hasPerm}
          onClose={() => setSelectedRole(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}