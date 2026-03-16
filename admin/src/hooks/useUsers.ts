import { useState, useCallback, useRef } from 'react';
import api from '../api/client';

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
        page: currentPage,
        limit: currentLimit,
      };

      if (params?.role) {
        queryParams.role = params.role;
      }
      if (params?.status) {
        queryParams.status = params.status;
      }
      if (params?.search && params.search.trim().length > 0) {
        queryParams.search = params.search.trim();
      }

      const res = await api.get('/admin/users', {
        params: queryParams,
      });

      const payload: IUserResponse = res.data?.data ?? res.data;

      if (!payload || !Array.isArray(payload.users)) {
        throw new Error('Invalid user response format');
      }

      setUsers(payload.users);
      setTotal(payload.total ?? 0);
      setPage(payload.page ?? currentPage);
      setLimit(payload.limit ?? currentLimit);

      // Update ref with new state
      stateRef.current = {
        page: payload.page ?? currentPage,
        limit: payload.limit ?? currentLimit,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch users';
      console.error('Fetch users error:', errorMsg);
      setError(errorMsg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(
    async (data: Record<string, unknown>): Promise<IUser> => {
      try {
        setError(null);
        const res = await api.post('/admin/users', data);
        const newUser = res.data?.data ?? res.data;

        // Refresh users list
        await fetchUsers({ page: 1 });

        return newUser;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
        setError(errorMsg);
        throw err;
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<IUser> => {
      try {
        setError(null);
        const res = await api.patch(`/admin/users/${id}`, data);
        const updatedUser = res.data?.data ?? res.data;

        // Update local state
        setUsers((prev) => prev.map((u) => (u._id === id ? updatedUser : u)));

        return updatedUser;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
        setError(errorMsg);
        throw err;
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
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMsg);
      throw err;
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
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle status';
      setError(errorMsg);
      throw err;
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
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign role';
      setError(errorMsg);
      throw err;
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
