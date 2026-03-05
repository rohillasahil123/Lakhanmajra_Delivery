import { useState, useCallback } from "react";
import api from "../api/client";

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
  status?: "active" | "inactive";
  search?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(
    async (params?: FetchUsersParams): Promise<void> => {
      try {
        setLoading(true);

        const res = await api.get("/admin/users", {
          params: {
            page: params?.page ?? page,
            limit,
            role: params?.role ?? undefined,
            status: params?.status ?? undefined,
            search: params?.search ?? undefined,
          },
        });

        const payload: IUserResponse = res.data?.data ?? res.data;

        setUsers(payload.users ?? []);
        setTotal(payload.total ?? 0);
        setPage(payload.page ?? 1);
        setLimit(payload.limit ?? 10);
      } catch (error) {
        console.error("Fetch users failed", error);
      } finally {
        setLoading(false);
      }
    },
    [page, limit]
  );

  const createUser = async (data: Record<string, unknown>) => {
    const res = await api.post("/admin/users", data);
    return res.data?.data ?? res.data;
  };

  const updateUser = async (id: string, data: Record<string, unknown>) => {
    const res = await api.patch(`/admin/users/${id}`, data);
    return res.data?.data ?? res.data;
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/admin/users/${id}`);
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    const res = await api.patch(`/admin/users/${id}/status`, { isActive });
    return res.data?.data ?? res.data;
  };

  const assignRole = async (id: string, roleId: string) => {
    const res = await api.patch(`/auth/users/${id}/role`, { roleId });
    return res.data?.data ?? res.data;
  };

  return {
    users,
    total,
    page,
    limit,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleStatus,
    assignRole,
  };
};