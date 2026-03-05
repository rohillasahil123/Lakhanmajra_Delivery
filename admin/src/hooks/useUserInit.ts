import { useEffect, useState } from "react";
import api from "../api/client";

interface IRole {
  _id: string;
  name: string;
  description?: string;
}

interface ISummary {
  summary: Record<string, number>;
  total: number;
}

type FetchUsersFn = (params?: { page?: number }) => Promise<void>;

export const useUserInit = (fetchUsers: FetchUsersFn) => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [summary, setSummary] = useState<ISummary | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        const [rolesRes, summaryRes, permRes] = await Promise.all([
          api.get("/admin/roles"),
          api.get("/admin/users/summary"),
          api.get("/auth/permissions"),
        ]);

        const rolesData = rolesRes.data?.data ?? rolesRes.data ?? [];
        const summaryData = summaryRes.data?.data ?? summaryRes.data ?? null;
        const permData =
          permRes.data?.permissions ??
          permRes.data?.data?.permissions ??
          [];

        setRoles(rolesData);
        setSummary(summaryData);
        setPermissions(permData);

        await fetchUsers({ page: 1 });
      } catch (error) {
        console.error("User init failed", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchUsers]);

  const hasPermission = (perm: string) => permissions.includes(perm);

  return {
    roles,
    summary,
    permissions,
    hasPermission,
    loading,
  };
};