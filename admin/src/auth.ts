import api from './api/client';

export const login = async (identifier: string, password: string) => {
  const res = await api.post('/auth/login', { identifier, password });
  // backend returns token in data.token (standard)
  const token = res.data?.token || res.data?.data?.token;
  if (token) localStorage.setItem('token', token);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getMe = async () => {
  return api.get('/auth/users');
};

export const getPermissions = async () => {
  try {
    const [permsRes, meRes] = await Promise.all([api.get('/auth/permissions'), api.get('/auth/users')]);

    const perms = permsRes.data?.permissions ?? permsRes.data?.data?.permissions ?? [];
    const roleName = meRes.data?.role || meRes.data?.roleId?.name || null;

    // If user is superadmin, ensure they get the full permission set (backend seed gives superadmin all perms,
    // but this guarantees UI behaves correctly even if getPermissions is incomplete)
    if (roleName === 'superadmin') {
      try {
        const all = await api.get('/admin/permissions');
        const list = (all.data?.data ?? all.data ?? []) as any[];
        return list.map((p) => p.name);
      } catch (err) {
        // fallback to previously returned perms
        return perms;
      }
    }

    return perms;
  } catch (err) {
    return [];
  }
};
