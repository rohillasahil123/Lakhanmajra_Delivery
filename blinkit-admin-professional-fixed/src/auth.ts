import api from './api/client';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  user?: any;
  message?: string;
}

// Login function
export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/login', { 
      identifier: identifier.trim(), 
      password 
    });
    
    // Handle different response formats
    const token = response.data?.token || response.data?.data?.token;
    const user = response.data?.user || response.data?.data?.user;
    
    if (token) {
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
    
    return {
      token,
      user,
      message: response.data?.message
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Logout function
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');
};

// Get current user
export const getMe = async () => {
  try {
    const response = await api.get('/auth/users');
    return response.data;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// Get user permissions
export const getPermissions = async (): Promise<string[]> => {
  try {
    const cachedPermissions = localStorage.getItem('permissions');
    if (cachedPermissions) {
      try {
        return JSON.parse(cachedPermissions);
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    const [permsRes, meRes] = await Promise.all([
      api.get('/auth/permissions'),
      api.get('/auth/users')
    ]);

    const permissions = permsRes.data?.permissions ?? 
                       permsRes.data?.data?.permissions ?? 
                       [];
    
    const roleName = meRes.data?.role || 
                     meRes.data?.roleId?.name || 
                     meRes.data?.data?.role ||
                     meRes.data?.data?.roleId?.name ||
                     null;

    // Superadmin gets all permissions
    if (roleName === 'superadmin') {
      try {
        const allPerms = await api.get('/admin/permissions');
        const permsList = (allPerms.data?.data ?? allPerms.data ?? []) as any[];
        const allPermissions = permsList.map((p) => p.name);
        localStorage.setItem('permissions', JSON.stringify(allPermissions));
        return allPermissions;
      } catch (err) {
        // Fallback to previously returned permissions
        localStorage.setItem('permissions', JSON.stringify(permissions));
        return permissions;
      }
    }

    localStorage.setItem('permissions', JSON.stringify(permissions));
    return permissions;
  } catch (error) {
    console.error('Failed to get permissions:', error);
    return [];
  }
};

// Check if user has permission
export const hasPermission = (permission: string, permissions: string[]): boolean => {
  return permissions.includes(permission);
};

// Check if user has any of the permissions
export const hasAnyPermission = (requiredPermissions: string[], userPermissions: string[]): boolean => {
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

// Check if user has all permissions
export const hasAllPermissions = (requiredPermissions: string[], userPermissions: string[]): boolean => {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

// Refresh permissions cache
export const refreshPermissions = async (): Promise<string[]> => {
  localStorage.removeItem('permissions');
  return await getPermissions();
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

// Get stored user
export const getStoredUser = (): any | null => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      return JSON.parse(user);
    } catch (e) {
      return null;
    }
  }
  return null;
};
