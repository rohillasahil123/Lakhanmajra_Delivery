import api from './api/client';
import { logErrorSafely } from './utils/errorHandler';

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
    logErrorSafely('Auth: Logout endpoint failed', error);
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
 * Superadmin can fetch all permissions with proper error handling
 * 
 * SECURITY:
 * - Validates user role before attempting privileged operation
 * - Logs errors for debugging instead of silent failures
 * - Falls back gracefully if superadmin endpoint fails
 */
export const getPermissions = async (): Promise<string[]> => {
  try {
    // Fetch user permissions and current user info in parallel
    const [permsRes, meRes] = await Promise.all([
      api.get('/auth/permissions'),
      api.get('/auth/users'),
    ]);

    // Extract user permissions from response
    const perms = permsRes.data?.permissions ?? permsRes.data?.data?.permissions ?? [];

    // Extract user role - try multiple possible response formats
    const roleName = meRes.data?.role || meRes.data?.roleId?.name || null;

    // If user is superadmin, try to fetch all available permissions
    if (roleName === 'superadmin') {
      try {
        const allPermsRes = await api.get('/admin/permissions');
        const list: Permission[] = allPermsRes.data?.data ?? allPermsRes.data ?? [];
        
        if (!Array.isArray(list)) {
          logErrorSafely('Auth: Superadmin permissions response is not array', {
            response: allPermsRes.data,
          });
          return perms;
        }

        const mappedPerms = list.map((p) => p.name).filter((name) => name && typeof name === 'string');
        
        if (mappedPerms.length === 0) {
          logErrorSafely('Auth: Superadmin permissions list is empty', {
            response: allPermsRes.data,
          });
          return perms;
        }

        return mappedPerms;
      } catch (err) {
        // Log the error but fallback gracefully to regular permissions
        logErrorSafely('Auth: Failed to fetch superadmin permissions, falling back to regular perms', err);
        return perms;
      }
    }

    return perms;
  } catch (err) {
    logErrorSafely('Auth: Failed to fetch permissions', err);
    return [];
  }
};
