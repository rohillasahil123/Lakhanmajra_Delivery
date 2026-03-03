import { useState, useEffect } from "react";

interface FilterParams {
  page?: number;
  role?: string;
}

export const useUserFilters = (
  fetchUsers: (params?: FilterParams) => Promise<void>
) => {
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  /* ================= Debounce Search ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  /* ================= Trigger Fetch on Filter Change ================= */
  useEffect(() => {
    fetchUsers({
      page: 1,
      role: activeRole || undefined,
    });
  }, [debouncedSearch, activeRole]);

  const resetFilters = () => {
    setSearch("");
    setActiveRole(null);
    fetchUsers({ page: 1 });
  };

  return {
    search,
    setSearch,
    activeRole,
    setActiveRole,
    resetFilters,
  };
};