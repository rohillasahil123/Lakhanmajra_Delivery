import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '@/api/client';
import { sanitizeError } from '@/utils/errorHandler';
import type { IUser } from './appStore';

export interface UsersState {
  users: IUser[];
  filteredUsers: IUser[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  selectedRole: string | null;
  searchQuery: string;
  isActive: boolean | null;
  
  // Pagination
  currentPage: number;
  limit: number;
  total: number;
  
  // Actions
  setUsers: (users: IUser[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filter actions
  setSelectedRole: (role: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsActive: (isActive: boolean | null) => void;
  setPagination: (page: number, limit: number) => void;
  
  // Async actions
  fetchUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean | null;
  }) => Promise<void>;
  
  createUser: (userData: Partial<IUser>) => Promise<IUser>;
  updateUser: (id: string, userData: Partial<IUser>) => Promise<IUser>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string, isActive: boolean) => Promise<void>;
  
  // Filter helpers
  applyFilters: () => void;
  resetFilters: () => void;
  clearCache: () => void;
}

export const useUsersStore = create<UsersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      users: [],
      filteredUsers: [],
      isLoading: false,
      error: null,
      
      selectedRole: null,
      searchQuery: '',
      isActive: null,
      
      currentPage: 1,
      limit: 10,
      total: 0,

      // Setters
      setUsers: (users) => {
        set({ users }, false, 'setUsers');
        get().applyFilters();
      },
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setError: (error) => set({ error }, false, 'setError'),

      // Filter setters
      setSelectedRole: (role) => {
        set({ selectedRole: role }, false, 'setSelectedRole');
        get().applyFilters();
      },
      setSearchQuery: (query) => {
        set({ searchQuery: query }, false, 'setSearchQuery');
        get().applyFilters();
      },
      setIsActive: (isActive) => {
        set({ isActive }, false, 'setIsActive');
        get().applyFilters();
      },
      setPagination: (page, limit) => {
        set({ currentPage: page, limit }, false, 'setPagination');
      },

      // Apply client-side filters
      applyFilters: () => {
        const { users, selectedRole, searchQuery, isActive } = get();
        
        let filtered = [...users];

        // Filter by role
        if (selectedRole) {
          filtered = filtered.filter(
            (u) => u.roleId?._id === selectedRole
          );
        }

        // Filter by search query (name or email)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.name.toLowerCase().includes(query) ||
              u.email.toLowerCase().includes(query) ||
              u.phone.includes(query)
          );
        }

        // Filter by active status
        if (isActive !== null) {
          filtered = filtered.filter((u) => u.isActive === isActive);
        }

        set({ filteredUsers: filtered, total: filtered.length }, false, 'applyFilters');
      },

      resetFilters: () => {
        set({
          selectedRole: null,
          searchQuery: '',
          isActive: null,
          currentPage: 1,
        }, false, 'resetFilters');
        get().applyFilters();
      },

      // Async: Fetch users
      fetchUsers: async (params = {}) => {
        try {
          set({ isLoading: true, error: null });

          const queryParams = {
            page: params.page || get().currentPage,
            limit: params.limit || get().limit,
            ...(params.role && { role: params.role }),
            ...(params.search && { search: params.search }),
            ...(params.isActive !== undefined && { isActive: params.isActive }),
          };

          const response = await api.get('/admin/users', { params: queryParams });
          
          if (response.data?.data) {
            set({
              users: response.data.data,
              total: response.data.total || response.data.data.length,
              currentPage: queryParams.page,
            });
            get().applyFilters();
          }
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage, users: [], filteredUsers: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Create user
      createUser: async (userData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.post('/admin/users', userData);
          
          if (response.data?.data) {
            const newUser = response.data.data;
            set({ users: [newUser, ...get().users] });
            get().applyFilters();
            return newUser;
          }
          
          throw new Error('No data in response');
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Update user
      updateUser: async (id, userData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.patch(`/admin/users/${id}`, userData);
          
          if (response.data?.data) {
            const updatedUser = response.data.data;
            set({
              users: get().users.map((u) => (u._id === id ? updatedUser : u)),
            });
            get().applyFilters();
            return updatedUser;
          }
          
          throw new Error('No data in response');
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Delete user
      deleteUser: async (id) => {
        try {
          set({ isLoading: true, error: null });
          await api.delete(`/admin/users/${id}`);
          set({ users: get().users.filter((u) => u._id !== id) });
          get().applyFilters();
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Async: Toggle user status
      toggleUserStatus: async (id, isActive) => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.patch(`/admin/users/${id}/status`, { isActive });
          
          if (response.data?.data) {
            const updatedUser = response.data.data;
            set({
              users: get().users.map((u) => (u._id === id ? updatedUser : u)),
            });
            get().applyFilters();
          }
        } catch (error) {
          const sanitized = sanitizeError(error);
          set({ error: sanitized.userMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Cache: Clear all
      clearCache: () => {
        set({
          users: [],
          filteredUsers: [],
          selectedRole: null,
          searchQuery: '',
          isActive: null,
          currentPage: 1,
          total: 0,
          error: null,
        }, false, 'clearCache');
      },
    }),
    { name: 'UsersStore' }
  )
);
