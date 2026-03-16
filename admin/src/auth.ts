import api from './api/client';

type LoginResponse = {
  token?: string;
  data?: {
    token?: string;
  };
};

type Permission = {
  name: string;
};

export const login = async (identifier: string, password: string) => {
  const res = await api.post<LoginResponse>('/auth/login', {
    identifier,
    password,
  });

  const token = res.data?.token || res.data?.data?.token;

  if (token) {
    localStorage.setItem('token', token);
  }

  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getMe = async () => {
  return api.get('/auth/users');
};

export const getPermissions = async (): Promise<string[]> => {
  try {
    const [permsRes, meRes] = await Promise.all([
      api.get('/auth/permissions'),
      api.get('/auth/users'),
    ]);

    const perms = permsRes.data?.permissions ?? permsRes.data?.data?.permissions ?? [];

    const roleName = meRes.data?.role || meRes.data?.roleId?.name || null;

    if (roleName === 'superadmin') {
      try {
        const all = await api.get('/admin/permissions');
        const list: Permission[] = all.data?.data ?? all.data ?? [];

        return list.map((p) => p.name);
      } catch {
        return perms;
      }
    }

    return perms;
  } catch {
    return [];
  }
};
