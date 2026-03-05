import { useState, useEffect, useCallback } from "react";

interface FilterParams {
  page?: number;
  role?: string;
  search?: string;
}

export const useUserFilters = (
  fetchUsers: (params?: FilterParams) => Promise<void>
) => {
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch when filters change
  useEffect(() => {
    const handler = async () => {
      await fetchUsers({
        page: 1,
        role: activeRole ?? undefined,
        search: debouncedSearch || undefined,
      });
    };

    handler();
  }, [debouncedSearch, activeRole, fetchUsers]);

  const resetFilters = useCallback(async () => {
    setSearch("");
    setActiveRole(null);
    setDebouncedSearch("");
    await fetchUsers({ page: 1 });
  }, [fetchUsers]);

  return {
    search,
    setSearch,
    activeRole,
    setActiveRole,
    resetFilters,
    debouncedSearch,
  };
};