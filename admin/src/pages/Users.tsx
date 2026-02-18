import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { getMe, getPermissions } from '../auth';

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type User = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: any;
  isActive?: boolean;
  createdAt?: string;
};

type Role = { _id: string; name: string };
type ModalMode = 'create' | 'edit' | null;

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  roleId: '',
  isActive: true,
};

/* ─────────────────────────────────────────
   ROLE CONFIG
───────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  superadmin: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Super Admin' },
  admin:      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Admin'       },
  manager:    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Manager'     },
  rider:      { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-500',label: 'Rider'       },
  user:       { bg: 'bg-slate-100', text: 'text-slate-600',  dot: 'bg-slate-400',  label: 'User'        },
};

function getRoleConfig(name?: string) {
  if (!name) return null;
  return ROLE_CONFIG[name.toLowerCase()] ?? {
    bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: name,
  };
}

/* ─────────────────────────────────────────
   AVATAR
───────────────────────────────────────── */
const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx]} flex items-center justify-center text-white font-semibold flex-shrink-0 select-none`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────
   ROLE BADGE
───────────────────────────────────────── */
function RoleBadge({ name }: { name?: string }) {
  const cfg = getRoleConfig(name);
  if (!cfg) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────
   THREE-DOT MENU
───────────────────────────────────────── */
function ActionMenu({
  user,
  roles,
  canEdit,
  canDelete,
  canManage,
  canAssignRole,
  onEdit,
  onDelete,
  onToggleActive,
  onChangeRole,
}: {
  user: User;
  roles: Role[];
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
  canAssignRole: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onChangeRole: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowRoles(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setShowRoles(false); }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-slate-600"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-sm">
          {canEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-slate-700 transition"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Details
            </button>
          )}

          {canAssignRole && (
            <div>
              <button
                onClick={() => setShowRoles(!showRoles)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50 text-slate-700 transition"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Assign Role
                </span>
                <svg className={`w-3 h-3 transition-transform ${showRoles ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showRoles && (
                <div className="bg-slate-50 border-t border-b border-slate-100 py-1">
                  {roles.map((r) => {
                    const cfg = getRoleConfig(r.name);
                    const current = (user.roleId?._id || user.roleId) === r._id;
                    return (
                      <button
                        key={r._id}
                        onClick={() => { onChangeRole(r._id); setOpen(false); setShowRoles(false); }}
                        className={`w-full flex items-center gap-2 px-6 py-1.5 text-xs hover:bg-white transition ${current ? 'font-semibold' : 'text-slate-600'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? 'bg-slate-400'}`} />
                        {r.name}
                        {current && <span className="ml-auto text-blue-500">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {canManage && (
            <button
              onClick={() => { onToggleActive(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-slate-700 transition"
            >
              {user.isActive ? (
                <>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Deactivate User
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activate User
                </>
              )}
            </button>
          )}

          {(canEdit || canManage || canAssignRole) && canDelete && (
            <div className="my-1 border-t border-slate-100" />
          )}

          {canDelete && (
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete User
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   USER MODAL (Create / Edit)
───────────────────────────────────────── */
function UserModal({
  mode,
  user,
  roles,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        roleId: user.roleId?._id || user.roleId || '',
        isActive: user.isActive ?? true,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError(null);
  }, [mode, user]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        roleId: form.roleId || undefined,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      if (mode === 'create') {
        await api.post('/admin/users', payload);
      } else {
        await api.patch(`/admin/users/${user!._id}`, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {mode === 'create' ? 'Add New User' : 'Edit User'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'create'
                ? 'Create an account and assign a role'
                : 'Update user details and permissions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-2.5 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5C2.3 17.333 3.262 19 4.8 19z" />
              </svg>
              {error}
            </div>
          )}

          {/* Name */}
          <Field label="Full Name" required>
            <input
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. John Smith"
            />
          </Field>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="john@acme.com"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 0100"
              />
            </Field>
          </div>

          {/* Password */}
          <Field
            label="Password"
            required={mode === 'create'}
            hint={mode === 'edit' ? 'Leave blank to keep current password' : undefined}
          >
            <input
              type="password"
              required={mode === 'create'}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={mode === 'create' ? 'Min. 8 characters' : '••••••••'}
            />
          </Field>

          {/* Role */}
          <Field label="Role">
            <div className="relative">
              <select
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none pr-8"
                value={form.roleId}
                onChange={(e) => set('roleId', e.target.value)}
              >
                <option value="">— Select a role —</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </Field>

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Account Status</p>
              <p className="text-xs text-slate-400">
                {form.isActive ? 'User can sign in' : 'User cannot sign in'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60 shadow-sm"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </span>
              ) : mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   FIELD WRAPPER
───────────────────────────────────────── */
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('all');
  const [userSummary, setUserSummary] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isSuperAdmin = currentRole === 'superadmin';
  const hasPerm = (p: string) => isSuperAdmin || permissions.includes(p);

  const resolveRoleName = (u: User) => {
    if (!u.roleId) return undefined;
    if (typeof u.roleId === 'object') return u.roleId.name;
    return roles.find((r) => r._id === u.roleId)?.name;
  };

  /* ── Toast helper ── */
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Loaders ── */
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
    setTotal(res.data?.total ?? res.data?.data?.total ?? payload.length);
    setPage(pageNum);
  };

  const loadSummary = async () => {
    const res = await api.get('/admin/users/summary');
    setUserSummary(res.data?.data?.summary || {});
  };

  const refresh = async (pageNum = page) => {
    await loadUsers(pageNum);
    await loadSummary();
  };

  /* ── Init ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await getMe();
        const roleName = me.data?.roleId?.name || me.data?.role || null;
        setCurrentRole(roleName);
        const perms = (await getPermissions()) || [];
        setPermissions(perms);

        if (!perms.includes('users:view') && roleName !== 'superadmin') {
          setUsers([me.data]);
          setTotal(1);
          return;
        }

        const rolesRes = await api.get('/admin/roles');
        setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : rolesRes.data || []);
        await loadUsers(1);
        await loadSummary();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Filtered list ── */
  const filteredUsers = useMemo(() => {
    let list = users;
    if (activeRoleFilter !== 'all')
      list = list.filter((u) => resolveRoleName(u)?.toLowerCase() === activeRoleFilter.toLowerCase());
    if (search.trim())
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.includes(search)
      );
    return list;
  }, [users, activeRoleFilter, search, roles]);

  /* ── Actions ── */
  const handleChangeRole = async (userId: string, roleId: string) => {
    try {
      await api.patch(`/auth/users/${userId}/role`, { roleId });
      await refresh();
      showToast('Role updated successfully');
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.patch(`/admin/users/${u._id}`, { isActive: !u.isActive });
      await refresh();
      showToast(u.isActive ? 'User deactivated' : 'User activated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      await refresh();
      showToast('User deleted');
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ── Filter tabs ── */
  const filterTabs = [
    { key: 'all', label: 'All users', count: total },
    ...Object.entries(userSummary).map(([role, count]) => ({
      key: role, label: role.charAt(0).toUpperCase() + role.slice(1), count,
    })),
  ];

  /* ─────── RENDER ─────── */
  return (
    <div className="min-h-screen bg-[#f8f9fa]" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      {/* ── Modal ── */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          user={editingUser}
          roles={roles}
          onClose={() => { setModalMode(null); setEditingUser(null); }}
          onSaved={() => {
            refresh(modalMode === 'create' ? 1 : page);
            showToast(modalMode === 'create' ? 'User created successfully' : 'User updated successfully');
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-slate-800 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Users</h1>
            <p className="text-sm text-slate-400 mt-1">
              {total.toLocaleString()} total accounts across your organisation
            </p>
          </div>

          {hasPerm('users:create') && (
            <button
              onClick={() => { setEditingUser(null); setModalMode('create'); }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          )}
        </div>

        {/* ── Toolbar: Filters + Search ── */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          {/* Role filter tabs */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5 overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRoleFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeRoleFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                  activeRoleFilter === tab.key ? 'bg-blue-500 text-blue-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-60 placeholder:text-slate-300"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
              <svg className="w-8 h-8 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm">Loading users…</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-400">No users found</p>
              <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">User</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Contact</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Role</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => {
                  const roleName = resolveRoleName(u);
                  const roleColor = getRoleConfig(roleName);
                  return (
                    <tr key={u._id} className="group hover:bg-slate-50/70 transition-colors">
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name || '?'} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 leading-none">{u.name}</p>
                            {u.createdAt && (
                              <p className="text-xs text-slate-400 mt-1">
                                Joined {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-600">{u.email || u.phone || '—'}</p>
                        {u.email && u.phone && (
                          <p className="text-xs text-slate-400 mt-0.5">{u.phone}</p>
                        )}
                      </td>

                      {/* Role — inline select */}
                      <td className="px-5 py-3.5">
                        {hasPerm('roles:manage') ? (
                          <div className="relative inline-block">
                            <select
                              className={`appearance-none pl-6 pr-6 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${roleColor?.bg ?? 'bg-slate-100'} ${roleColor?.text ?? 'text-slate-600'}`}
                              value={u.roleId?._id || u.roleId || ''}
                              onChange={(e) => handleChangeRole(u._id, e.target.value)}
                            >
                              <option value="">No role</option>
                              {roles.map((r) => (
                                <option key={r._id} value={r._id}>{r.name}</option>
                              ))}
                            </select>
                            {/* dot */}
                            <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${roleColor?.dot ?? 'bg-slate-400'}`} />
                            {/* chevron */}
                            <svg className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${roleColor?.text ?? 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        ) : (
                          <RoleBadge name={roleName} />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {hasPerm('users:manage') ? (
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <ActionMenu
                          user={u}
                          roles={roles}
                          canEdit={hasPerm('users:edit')}
                          canDelete={hasPerm('users:delete')}
                          canManage={hasPerm('users:manage')}
                          canAssignRole={hasPerm('roles:manage')}
                          onEdit={() => { setEditingUser(u); setModalMode('edit'); }}
                          onDelete={() => handleDelete(u._id)}
                          onToggleActive={() => handleToggleActive(u)}
                          onChangeRole={(roleId) => handleChangeRole(u._id, roleId)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && filteredUsers.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => loadUsers(page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => loadUsers(p as number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                        page === p
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                disabled={page >= totalPages}
                onClick={() => loadUsers(page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}