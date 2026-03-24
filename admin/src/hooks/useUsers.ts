import { useState, useCallback, useRef } from 'react';
import api from '../api/client';
import { sanitizeError, logErrorSafely } from '../utils/errorHandler';
import { sanitizeFormInput, sanitizeEmail, sanitizePhone, sanitizeSearchQuery, sanitizeNumber } from '../utils/sanitize';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  roleId: {
    _id: string;
    name: string;
  };
}

interface IUserResponse {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
}

export interface FetchUsersParams {
  page?: number;
  role?: string | null;
  status?: 'active' | 'inactive';
  search?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track current state values without causing dependency loops
  const stateRef = useRef({ page, limit });

  const fetchUsers = useCallback(async (params?: FetchUsersParams): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = params?.page ?? stateRef.current.page;
      const currentLimit = stateRef.current.limit;

      // Build query params, only including defined non-empty values
      const queryParams: Record<string, unknown> = {
        page: sanitizeNumber(currentPage, 1, 1000),
        limit: sanitizeNumber(currentLimit, 1, 100),
      };

      if (params?.role) {
        queryParams.role = sanitizeFormInput(params.role, 50);
      }
      if (params?.status) {
        queryParams.status = params.status; // Enum, safe as-is
      }
      if (params?.search && params.search.trim().length > 0) {
        // SECURITY: Sanitize search to prevent injection
        queryParams.search = sanitizeSearchQuery(params.search.trim(), 100);
      }

      const res = await api.get('/admin/users', {
        params: queryParams,
      });

      const payload: IUserResponse = res.data?.data ?? res.data;

      if (!payload || !Array.isArray(payload.users)) {
        throw new Error('Invalid user response format');
      }

      // defensively filter out superadmin account in client view
      const filteredUsers = payload.users.filter((u) => {
        const isSuperAdminEmail = u.email?.toLowerCase() === 'superadmin@example.com';
        const isSuperAdminRole = u.roleId?.name?.toLowerCase() === 'superadmin';
        return !isSuperAdminEmail && !isSuperAdminRole;
      });

      setUsers(filteredUsers);
      setTotal(filteredUsers.length !== payload.users.length ? payload.total - (payload.users.length - filteredUsers.length) : payload.total ?? 0);
      setPage(payload.page ?? currentPage);
      setLimit(payload.limit ?? currentLimit);

      // Update ref with new state
      stateRef.current = {
        page: payload.page ?? currentPage,
        limit: payload.limit ?? currentLimit,
      };
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('fetchUsers', err);
      setError(sanitized.userMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(
    async (data: Record<string, unknown>): Promise<IUser> => {
      try {
        setError(null);
        
        /**
         * SECURITY: Sanitize all input before sending to backend
         * This provides defense-in-depth against XSS and injection
         */
        const sanitizedData = {
          name: sanitizeFormInput(String(data.name || ''), 100),
          email: sanitizeEmail(String(data.email || '')),
          phone: sanitizePhone(String(data.phone || '')),
          password: sanitizeFormInput(String(data.password || ''), 100),
          roleId: data.roleId, // ObjectId, safe as-is
        };

        // Validate required fields after sanitization
        if (!sanitizedData.name || !sanitizedData.email || !sanitizedData.phone || !sanitizedData.password) {
          throw new Error('All fields are required');
        }

        const res = await api.post('/admin/users', sanitizedData);
        const newUser = res.data?.data ?? res.data;

        // Refresh users list
        await fetchUsers({ page: 1 });

        return newUser;
      } catch (err) {
        const sanitized = sanitizeError(err);
        logErrorSafely('createUser', err);
        setError(sanitized.userMessage);
        throw new Error(sanitized.userMessage);
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<IUser> => {
      try {
        setError(null);
        
        /**
         * SECURITY: Sanitize all input before sending to backend
         */
        const sanitizedData: Record<string, any> = {};

        if (data.name !== undefined) {
          sanitizedData.name = sanitizeFormInput(String(data.name), 100);
        }
        if (data.email !== undefined) {
          sanitizedData.email = sanitizeEmail(String(data.email));
        }
        if (data.phone !== undefined) {
          sanitizedData.phone = sanitizePhone(String(data.phone));
        }
        if (data.roleId !== undefined) {
          sanitizedData.roleId = data.roleId; // ObjectId, safe
        }

        const res = await api.patch(`/admin/users/${sanitizeFormInput(id, 50)}`, sanitizedData);
        const updatedUser = res.data?.data ?? res.data;

        // Update local state
        setUsers((prev) => prev.map((u) => (u._id === id ? updatedUser : u)));

        return updatedUser;
      } catch (err) {
        const sanitized = sanitizeError(err);
        logErrorSafely('updateUser', err);
        setError(sanitized.userMessage);
        throw new Error(sanitized.userMessage);
      }
    },
    []
  );

  const deleteUser = useCallback(async (id: string): Promise<string> => {
    try {
      setError(null);
      const res = await api.delete(`/admin/users/${id}`);
      const deletedId = String(res?.data?.data?.deletedId || id);
      return deletedId;
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('deleteUser', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    }
  }, []);

  const toggleStatus = useCallback(async (id: string, isActive: boolean): Promise<IUser> => {
    try {
      setError(null);
      const res = await api.patch(`/admin/users/${id}/status`, { isActive });
      const updatedUser = res.data?.data ?? res.data;

      // Update local state
      setUsers((prev) => prev.map((u) => (u._id === id ? updatedUser : u)));

      return updatedUser;
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('toggleStatus', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    }
  }, []);

  const assignRole = useCallback(async (id: string, roleId: string): Promise<IUser> => {
    try {
      setError(null);
      const res = await api.patch(`/admin/users/${id}/role`, { roleId });
      const updatedUser = res.data?.data ?? res.data;

      // Update local state
      setUsers((prev) => prev.map((u) => (u._id === id ? updatedUser : u)));

      return updatedUser;
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('assignRole', err);
      setError(sanitized.userMessage);
      throw new Error(sanitized.userMessage);
    }
  }, []);

  return {
    users,
    total,
    page,
    limit,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleStatus,
    assignRole,
  };
};
