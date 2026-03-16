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

/**
 * User login - httpOnly cookie is set by backend on login response
 * Frontend does NOT store the token
 * 
 * SECURITY: Token stored in httpOnly cookie by backend, not accessible to JavaScript
 */
export const login = async (identifier: string, password: string) => {
  const res = await api.post<LoginResponse>('/auth/login', {
    identifier,
    password,
  });

  // Backend automatically sets httpOnly cookie
  // Frontend just returns the response
  // No localStorage storage needed
  return res.data;
};

/**
 * User logout - Calls backend to clear the httpOnly cookie
 * Backend should respond by clearing the cookie
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Even if logout fails, redirect to login
    console.error('Logout failed:', error);
  } finally {
    // Ensure redirect happens
    globalThis.location.href = '/login';
  }
};

export const getMe = async () => {
  return api.get('/auth/users');
};

/**
 * Fetch user permissions from backend
 * Superadmin can fetch all permissions
 */
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
