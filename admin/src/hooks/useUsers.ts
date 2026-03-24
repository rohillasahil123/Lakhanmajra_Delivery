import { useCallback } from 'react';
import { useUsersStore } from '../stores/usersStore';
import { sanitizeFormInput, sanitizeEmail, sanitizePhone, sanitizeSearchQuery } from '../utils/sanitize';
import { sanitizeError } from '../utils/errorHandler';

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

export interface FetchUsersParams {
  page?: number;
  role?: string | null;
  status?: 'active' | 'inactive';
  search?: string;
}

/**
 * Custom hook for user management
 * Delegates to Zustand global store to prevent re-fetching on navigation
 */
export const useUsers = () => {
  const store = useUsersStore();
  const { 
    users, 
    filteredUsers, 
    isLoading,
    error,
    createUser: storeCreateUser,
    updateUser: storeUpdateUser,
    deleteUser: storeDeleteUser,
    toggleUserStatus: storeToggleStatus,
    fetchUsers: storeFetchUsers,
    setSelectedRole,
    setSearchQuery,
    setIsActive,
  } = store;

  const fetchUsers = useCallback(async (params?: FetchUsersParams): Promise<void> => {
    if (params) {
      if (params.role !== undefined) setSelectedRole(params.role ?? null);
      if (params.search !== undefined) setSearchQuery(sanitizeSearchQuery(params.search));
      if (params.status !== undefined) {
        setIsActive(params.status === 'active' ? true : params.status === 'inactive' ? false : null);
      }
    }

    if (users.length === 0) {
      await storeFetchUsers();
    }
  }, [users.length, storeFetchUsers, setSelectedRole, setSearchQuery, setIsActive]);

  const createUser = useCallback(
    async (data: Record<string, unknown>): Promise<IUser> => {
      try {
        const sanitizedData = {
          name: sanitizeFormInput(String(data.name || ''), 100),
          email: sanitizeEmail(String(data.email || '')),
          phone: sanitizePhone(String(data.phone || '')),
          password: sanitizeFormInput(String(data.password || ''), 100),
          roleId: data.roleId,
        };

        if (!sanitizedData.name || !sanitizedData.email || !sanitizedData.phone || !sanitizedData.password) {
          throw new Error('All fields are required');
        }

        const newUser = await storeCreateUser(sanitizedData);
        return newUser;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeCreateUser]
  );

  const updateUser = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<IUser> => {
      try {
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
          sanitizedData.roleId = data.roleId;
        }

        const updatedUser = await storeUpdateUser(id, sanitizedData);
        return updatedUser;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeUpdateUser]
  );

  const deleteUser = useCallback(
    async (id: string): Promise<string> => {
      try {
        await storeDeleteUser(id);
        return id;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeDeleteUser]
  );

  const toggleStatus = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      try {
        await storeToggleStatus(id, isActive);
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    [storeToggleStatus]
  );

  return {
    users: filteredUsers.length > 0 ? filteredUsers : users,
    loading: isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleStatus,
  };
};
