import { useState, useEffect, useCallback } from "react";

interface FilterParams {
  page?: number;
  role?: string;
  search?: string;
  status?: "active" | "inactive";
}

export const useUserFilters = (
  fetchUsers: (params?: FilterParams) => Promise<void>
) => {
  const [search, setSearch] = useState<string>("");
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Debounce search input with trimming
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      // Only update if search actually changed to prevent unnecessary fetches
      setDebouncedSearch(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch when filters change
  useEffect(() => {
    const handler = async () => {
      await fetchUsers({
        page: 1,
        role: activeRole ?? undefined,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
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