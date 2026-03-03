import { useCallback, useState } from "react";
import api from "../api/client";

export type User = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: { _id?: string; name?: string } | string;
  isActive?: boolean;
  createdAt?: string;
};

export const LIMIT = 20;

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(
    async (
      pageNum = 1,
      role?: string,
      search?: string
    ) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: LIMIT.toString(),
        });

        if (role && role !== "all") {
          params.append("role", role);
        }

       const trimmedSearch = search?.trim();

if (trimmedSearch) {
  params.append("search", trimmedSearch);
}
        const res = await api.get(`/admin/users?${params}`);

       const payload =
  res.data?.users ??
  res.data?.data?.users ??
  [];

        const totalCount =
  res.data?.total ??
  res.data?.data?.total ??
  payload.length;

        setUsers(payload);
        setTotal(totalCount);
        setPage(pageNum);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    users,
    total,
    page,
    loading,
    loadUsers,
    setPage,
  };
}