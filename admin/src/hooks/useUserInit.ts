import { useEffect, useState, useRef } from 'react';
import api from '../api/client';

export interface IRole {
  _id: string;
  name: string;
  description?: string;
}

interface ISummary {
  summary: Record<string, number>;
  total: number;
}

interface FetchUsersParams {
  page?: number;
  role?: string;
  search?: string;
  status?: 'active' | 'inactive';
}

type FetchUsersFn = (params?: FetchUsersParams) => Promise<void>;

export const useUserInit = (fetchUsers: FetchUsersFn) => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [summary, setSummary] = useState<ISummary | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        setLoading(true);

        const [rolesRes, summaryRes, permRes] = await Promise.all([
          api.get('/admin/roles'),
          api.get('/admin/users/summary'),
          api.get('/auth/permissions'),
        ]);

        const rolesData = Array.isArray(rolesRes.data?.data)
          ? rolesRes.data.data
          : Array.isArray(rolesRes.data)
            ? rolesRes.data
            : [];

        const summaryData = summaryRes.data?.data ?? summaryRes.data ?? null;

        const permData = Array.isArray(permRes.data?.permissions)
          ? permRes.data.permissions
          : Array.isArray(permRes.data?.data?.permissions)
            ? permRes.data.data.permissions
            : [];

        setRoles(rolesData.filter((r: any) => String(r.name).toLowerCase() !== 'superadmin'));
        setSummary(summaryData);
        setPermissions(permData);

        // Fetch users after initialization
        await fetchUsers({ page: 1 });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'User initialization failed';
        console.error('User init failed:', errorMsg);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchUsers]);

  const hasPermission = (perm: string): boolean => {
    return permissions.includes(perm);
  };

  return {
    roles,
    summary,
    permissions,
    hasPermission,
    loading,
  };
};
