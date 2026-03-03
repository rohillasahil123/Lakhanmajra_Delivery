import { useState } from "react";

export function useUserFilters() {
  const [activeRoleFilter, setActiveRoleFilter] =
    useState("all");

  const [search, setSearch] = useState("");

  return {
    activeRoleFilter,
    setActiveRoleFilter,
    search,
    setSearch,
  };
}