import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import api from '@/api/client';
import { sanitizeError } from '@/utils/errorHandler';

/**
 * Type Definitions for Global State
 */

export interface IPermission {
  _id: string;
  name: string;
  resource: string;
  action: string;
}

export interface IRole {
  _id: string;
  name: string;
  permissions: IPermission[];
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  roleId: IRole;
  isActive: boolean;
}

export interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRiders: number;
  activeRiders: number;
}

export interface AppState {
  // User & Auth
  user: IUser | null;
  isAuthenticated: boolean;
  
  // Permissions & Roles
  permissions: IPermission[];
  roles: IRole[];
  userSummary: UserSummary | null;
  
  // Loading states
  isLoadingUser: boolean;
  isLoadingPermissions: boolean;
  isLoadingRoles: boolean;
  isLoadingUserSummary: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  setUser: (user: IUser | null) => void;
  setPermissions: (permissions: IPermission[]) => void;
  setRoles: (roles: IRole[]) => void;
  setUserSummary: (summary: UserSummary | null) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  fetchUser: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchUserSummary: () => Promise<void>;
  fetchAllInitialData: () => Promise<void>;
  
  // Auth actions
  logout: () => void;
  
  // Cache management
  clearCache: () => void;
}

/**
 * Create global app store with Zustand
 * Includes devtools middleware for debugging and persist for localStorage caching
 */
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        permissions: [],
        roles: [],
        userSummary: null,
        isLoadingUser: false,
        isLoadingPermissions: false,
        isLoadingRoles: false,
        isLoadingUserSummary: false,
        error: null,

        // Basic setters
        setUser: (user) => set({ user, isAuthenticated: !!user }, false, 'setUser'),
        setPermissions: (permissions) => set({ permissions }, false, 'setPermissions'),
        setRoles: (roles) => set({ roles }, false, 'setRoles'),
        setUserSummary: (userSummary) => set({ userSummary }, false, 'setUserSummary'),
        setError: (error) => set({ error }, false, 'setError'),

        // Async: Fetch current user
        fetchUser: async () => {
          try {
            set({ isLoadingUser: true, error: null });
            const response = await api.get('/auth/users');
            if (response.data?.data) {
              set({ user: response.data.data, isAuthenticated: true });
            }
          } catch (error) {
            const sanitized = sanitizeError(error);
            set({ error: sanitized.userMessage, isAuthenticated: false, user: null });
          } finally {
            set({ isLoadingUser: false });
          }
        },

        // Async: Fetch permissions
        fetchPermissions: async () => {
          try {
            set({ isLoadingPermissions: true, error: null });
            const response = await api.get('/admin/permissions');
            if (response.data?.data) {
              // Filter out superadmin permissions if needed
              const permissions = Array.isArray(response.data.data) 
                ? response.data.data 
                : [];
              set({ permissions });
            }
          } catch (error) {
            const sanitized = sanitizeError(error);
            set({ error: sanitized.userMessage });
          } finally {
            set({ isLoadingPermissions: false });
          }
        },

        // Async: Fetch all roles
        fetchRoles: async () => {
          try {
            set({ isLoadingRoles: true, error: null });
            const response = await api.get('/admin/roles');
            if (response.data?.data) {
              // Filter out superadmin role
              const roles = Array.isArray(response.data.data)
                ? response.data.data.filter((role: IRole) => role.name !== 'superadmin')
                : [];
              set({ roles });
            }
          } catch (error) {
            const sanitized = sanitizeError(error);
            set({ error: sanitized.userMessage });
          } finally {
            set({ isLoadingRoles: false });
          }
        },

        // Async: Fetch user summary (statistics)
        fetchUserSummary: async () => {
          try {
            set({ isLoadingUserSummary: true, error: null });
            const response = await api.get('/admin/users/summary');
            if (response.data?.data) {
              set({ userSummary: response.data.data });
            }
          } catch (error) {
            const sanitized = sanitizeError(error);
            set({ error: sanitized.userMessage });
          } finally {
            set({ isLoadingUserSummary: false });
          }
        },

        // Async: Fetch all initial data in parallel
        fetchAllInitialData: async () => {
          const state = get();
          
          // Skip if already loading multiple items
          if (state.isLoadingUser || state.isLoadingPermissions || state.isLoadingRoles) {
            return;
          }

          try {
            set({ error: null });
            // Fetch all in parallel
            await Promise.all([
              state.fetchUser(),
              state.fetchPermissions(),
              state.fetchRoles(),
              state.fetchUserSummary(),
            ]);
          } catch (error) {
            const sanitized = sanitizeError(error);
            set({ error: sanitized.userMessage });
          }
        },

        // Auth: Logout
        logout: () => {
          set({ 
            user: null, 
            isAuthenticated: false, 
            permissions: [], 
            roles: [],
            userSummary: null,
            error: null 
          }, false, 'logout');
        },

        // Cache: Clear all cached data
        clearCache: () => {
          set({
            permissions: [],
            roles: [],
            userSummary: null,
            error: null,
          }, false, 'clearCache');
        },
      }),
      {
        name: 'app-store', // localStorage key name
        // Only persist critical state, not loading states
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          permissions: state.permissions,
          roles: state.roles,
          userSummary: state.userSummary,
        }),
        // Version for storage migration if needed
        version: 1,
      }
    ),
    { name: 'AppStore' }
  )
);

/**
 * Custom hook to check if user has a specific permission
 */
export function useHasPermission() {
  const permissions = useAppStore((state) => state.permissions);
  
  return (resource: string, action: string): boolean => {
    return permissions.some(
      (perm) => perm.resource === resource && perm.action === action
    );
  };
}

/**
 * Custom hook to check user role
 */
export function useUserRole() {
  const user = useAppStore((state) => state.user);
  
  return user?.roleId?.name || null;
}
