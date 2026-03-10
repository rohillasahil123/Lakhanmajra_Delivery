import { useState, useEffect, useCallback } from "react";
import { useUsers, IUser } from "../hooks/useUsers";
import { useUserInit } from "../hooks/useUserInit";
import { useUserFilters } from "../hooks/useUserFilters";
import UserModal from "../components/users/UserModal";
import Avatar from "../components/users/Avatar";
import RoleBadge from "../components/users/RoleBadge";
import Toast from "../components/users/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

const ROLE_TABS = [
  { key: "all", label: "All" },
  { key: "superadmin", label: "Super Admin" },
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Manager" },
  { key: "vendor", label: "Vendor" },
  { key: "rider", label: "Rider" },
  { key: "user", label: "User" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ChevDown: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevLeft: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Export: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
};

// ── Utility Functions ─────────────────────────────────────────────────────────
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const getStatusLabel = (isActive: boolean): string => {
  return isActive ? "Active" : "Inactive";
};

const getStatusColor = (isActive: boolean): { text: string; bg: string } => {
  return isActive
    ? { text: "#12b76a", bg: "#d1fae5" }
    : { text: "#ef4444", bg: "#fee2e2" };
};

// ── Status Dropdown Component ─────────────────────────────────────────────────
interface StatusDropdownProps {
  value: string;
  onChange: (status: string) => void;
}

function StatusDropdown({ value, onChange }: Readonly<StatusDropdownProps>) {
  const [open, setOpen] = useState(false);

  const getLabel = () => {
    const opt = STATUS_OPTIONS.find((o) => o.value === value);
    return opt?.label || "Filter Status";
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 11px",
          border: "1px solid #e8eaf0",
          background: open ? "#f5f6fa" : "#fff",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {getLabel()}
        <Icons.ChevDown />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            background: "#fff",
            border: "1px solid #e8eaf0",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            zIndex: 100,
            minWidth: 150,
            padding: 4,
            overflow: "hidden",
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 11px",
                border: "none",
                background: value === opt.value ? "#f5f7ff" : "transparent",
                color: value === opt.value ? "#3b6ef8" : "#0f1623",
                fontSize: 12.5,
                fontWeight: value === opt.value ? 600 : 500,
                cursor: "pointer",
                borderRadius: 7,
                fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = "transparent";
              }}
            >
              {opt.label}
              {value === opt.value && (
                <span style={{ marginLeft: 8, fontSize: 12, color: "#3b6ef8" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Count Badge Component ─────────────────────────────────────────────────────
interface CountBadgeProps {
  count: number;
}

function CountBadge({ count }: Readonly<CountBadgeProps>) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        opacity: 0.6,
        marginLeft: 4,
      }}
    >
      {count}
    </span>
  );
}

// ── Action Icon Button Component ──────────────────────────────────────────────
interface ActionIconButtonProps {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function ActionIconButton({
  children,
  title,
  onClick,
  danger = false,
  disabled = false,
}: Readonly<ActionIconButtonProps>) {
  const [hovering, setHovering] = useState(false);

  let btnColor = "#8b92a9";
  let btnBg = "#fff";
  let btnBorder = "#e8eaf0";

  if (hovering && !disabled) {
    btnBg = danger ? "#fff1f2" : "#f5f6fa";
    btnColor = danger ? "#ef4444" : "#0f1623";
    btnBorder = danger ? "#fecdd3" : "#e8eaf0";
  }

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: 27,
        height: 27,
        borderRadius: 7,
        border: `1px solid ${btnBorder}`,
        background: btnBg,
        color: btnColor,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.12s",
        opacity: disabled ? 0.5 : 1,
        fontSize: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Count Badge Component ─────────────────────────────────────────────────────

// ── User Row Component ────────────────────────────────────────────────────────
interface UserRowProps {
  user: IUser;
  rowIndex: number;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => Promise<void>;
  onViewDetails: (user: IUser) => void;
  hasPermission: (perm: string) => boolean;
}

function UserRow({
  user,
  rowIndex,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  hasPermission,
}: Readonly<UserRowProps>) {
  const [hovering, setHovering] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await onToggleStatus(user._id, !user.isActive);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <tr
      style={{
        borderBottom: "1px solid #e8eaf0",
        transition: "background 0.1s",
        background: hovering ? "#fafbff" : "#fff",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* User Name & Email */}
      <td style={{ padding: "10px 14px 10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar name={user.name} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f1623" }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: "#8b92a9", marginTop: 1 }}>
              {user.email}
            </div>
          </div>
        </div>
      </td>

      {/* Phone */}
      <td style={{ padding: "10px 14px", color: "#4b5470", fontSize: 12.5 }}>
        {user.phone}
      </td>

      {/* Role */}
      <td style={{ padding: "10px 14px" }}>
        <RoleBadge
          role={user.roleId?.name || "—"}
          roles={[]}
          userId={user._id}
          onChangeRole={() => {}}
          hasPermission={hasPermission}
        />
      </td>

      {/* Status */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: getStatusColor(user.isActive).text,
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: getStatusColor(user.isActive).text }}>
            {getStatusLabel(user.isActive)}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td style={{ padding: "10px 16px 10px 14px", textAlign: "right" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            opacity: hovering ? 1 : 0,
            transition: "opacity 0.12s",
            pointerEvents: hovering ? "auto" : "none",
          }}
        >
          {/* View Button */}
          <ActionIconButton
            title="View"
            onClick={() => onViewDetails(user)}
            disabled={actionLoading}
          >
            <Icons.Eye />
          </ActionIconButton>

          {/* Edit Button */}
          {hasPermission("users:update") && (
            <ActionIconButton
              title="Edit"
              onClick={() => onEdit(user)}
              disabled={actionLoading}
            >
              <Icons.Edit />
            </ActionIconButton>
          )}

          {/* Delete Button */}
          {hasPermission("users:delete") && (
            <ActionIconButton
              title="Delete"
              onClick={() => onDelete(user._id)}
              danger
              disabled={actionLoading}
            >
              <Icons.Trash />
            </ActionIconButton>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Pagination Component ──────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, total, limit, onPageChange }: Readonly<PaginationProps>) {
  const totalPages = Math.ceil(total / limit);

  const handlePrev = useCallback(() => {
    if (page > 1) onPageChange(page - 1);
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    if (page < totalPages) onPageChange(page + 1);
  }, [page, totalPages, onPageChange]);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        onClick={handlePrev}
        disabled={page === 1}
        style={{
          minWidth: 28,
          height: 28,
          padding: "0 7px",
          borderRadius: 7,
          border: "1px solid #e8eaf0",
          background: "#fff",
          color: "#4b5470",
          cursor: page === 1 ? "default" : "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          opacity: page === 1 ? 0.35 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.12s",
        }}
      >
        <Icons.ChevLeft />
      </button>

      {pageNumbers.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          style={{
            minWidth: 28,
            height: 28,
            padding: "0 7px",
            borderRadius: 7,
            border: `1px solid ${n === page ? "#3b6ef8" : "#e8eaf0"}`,
            background: n === page ? "#3b6ef8" : "#fff",
            color: n === page ? "#fff" : "#4b5470",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.12s",
            boxShadow: n === page ? "0 2px 8px rgba(59,110,248,0.25)" : "none",
          }}
        >
          {n}
        </button>
      ))}

      <button
        onClick={handleNext}
        disabled={page === totalPages}
        style={{
          minWidth: 28,
          height: 28,
          padding: "0 7px",
          borderRadius: 7,
          border: "1px solid #e8eaf0",
          background: "#fff",
          color: "#4b5470",
          cursor: page === totalPages ? "default" : "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          opacity: page === totalPages ? 0.35 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.12s",
        }}
      >
        <Icons.ChevRight />
      </button>
    </div>
  );
}

// ── Main Users Page Component ─────────────────────────────────────────────────
export default function UsersPage() {
  const {
    users,
    total,
    page,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleStatus,
  } = useUsers();

  const { roles, summary, hasPermission, loading: initLoading } = useUserInit(fetchUsers);
  const { search, setSearch, activeRole, setActiveRole, resetFilters, debouncedSearch } = useUserFilters(fetchUsers);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle page change - use debouncedSearch for consistency
  const handlePageChange = useCallback(
    (newPage: number) => {
      const statusParam = statusFilter !== "all" ? (statusFilter === "active" ? "active" : "inactive") : undefined;
      fetchUsers({ 
        page: newPage, 
        role: activeRole || undefined, 
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: statusParam,
      });
    },
    [fetchUsers, activeRole, debouncedSearch, statusFilter]
  );

  // Handle role filter change
  const handleRoleFilter = useCallback(
    async (role: string) => {
      setActiveRole(role === "all" ? null : role);
    },
    [setActiveRole]
  );

  // Handle status filter change - use debouncedSearch for consistency
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    if (status !== "all") {
      const isActive = status === "active";
      fetchUsers({ 
        page: 1, 
        role: activeRole || undefined,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: isActive ? "active" : "inactive",
      });
    } else {
      fetchUsers({ 
        page: 1, 
        role: activeRole || undefined,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      });
    }
  }, [fetchUsers, activeRole, debouncedSearch]);

  // Handle create user
  const handleCreateUser = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      await createUser(data);
      setToast({ message: "User created successfully", type: "success" });
      setModalOpen(false);
      await fetchUsers({ page: 1, role: activeRole || undefined });
    } catch (err) {
      setToast({ message: "Failed to create user", type: "error" });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async (data: Record<string, unknown>) => {
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      await updateUser(editingUser._id, data);
      setToast({ message: "User updated successfully", type: "success" });
      setModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      setToast({ message: "Failed to update user", type: "error" });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const deletedId = await deleteUser(userId);
      console.info("User deleted permanently", { deletedId });
      setToast({ message: `User deleted (ID: ${deletedId})`, type: "success" });
      await fetchUsers({ page: 1, role: activeRole || undefined });
    } catch (err) {
      setToast({ message: "Failed to delete user", type: "error" });
      console.error(err);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (userId: string, newStatus: boolean) => {
    try {
      await toggleStatus(userId, newStatus);
      setToast({ 
        message: `User ${newStatus ? "activated" : "deactivated"} successfully`, 
        type: "success" 
      });
    } catch (err) {
      setToast({ message: "Failed to update user status", type: "error" });
      console.error(err);
    }
  };

  // Handle edit user
  const handleEditUser = (user: IUser) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  // Handle create new user
  const handleNewUser = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  if (initLoading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#8b92a9" }}>
        Loading...
      </div>
    );
  }

  const countByRole = (role: string): number => {
    if (!summary?.summary) return 0;
    if (role === "all") return summary.total || 0;
    return (summary.summary[role] as number) || 0;
  };

  return (
    <div style={{ padding: "18px 22px", background: "#f5f6fa", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#eef2ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3b6ef8",
              }}
            >
              <Icons.Users />
            </div>
            <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Users</h1>
            <span
              style={{
                background: "#eef2ff",
                color: "#3b6ef8",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 9px",
              }}
            >
              {total} total
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#8b92a9", margin: 0 }}>
            Manage accounts, roles and permissions across your platform
          </p>
        </div>

        <button
          onClick={handleNewUser}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#3b6ef8",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 16px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(59,110,248,0.28)",
            fontFamily: "inherit",
          }}
        >
          <Icons.Plus /> Create User
        </button>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e8eaf0",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid #e8eaf0",
            flexWrap: "wrap",
          }}
        >
          {/* Role Tabs */}
          <div
            style={{
              display: "flex",
              background: "#f5f6fa",
              border: "1px solid #e8eaf0",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleRoleFilter(tab.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  transition: "all 0.13s",
                  background:
                    activeRole === tab.key || (tab.key === "all" && !activeRole)
                      ? "#3b6ef8"
                      : "transparent",
                  color:
                    activeRole === tab.key || (tab.key === "all" && !activeRole)
                      ? "#fff"
                      : "#8b92a9",
                  boxShadow:
                    activeRole === tab.key || (tab.key === "all" && !activeRole)
                      ? "0 2px 6px rgba(59,110,248,0.22)"
                      : "none",
                }}
              >
                {tab.label}
                <CountBadge count={countByRole(tab.key)} />
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8b92a9",
                pointerEvents: "none",
                display: "flex",
              }}
            >
              <Icons.Search />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{
                background: "#f5f6fa",
                border: "1px solid #e8eaf0",
                borderRadius: 8,
                fontSize: 12.5,
                color: "#0f1623",
                padding: "6.5px 11px 6.5px 30px",
                width: 210,
                fontFamily: "inherit",
                outline: "none",
                transition: "all 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b6ef8";
                e.target.style.background = "#fff";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,110,248,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e8eaf0";
                e.target.style.background = "#f5f6fa";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Status Filter */}
          <StatusDropdown value={statusFilter} onChange={handleStatusFilter} />

          {/* Export */}
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: "1px solid #e8eaf0",
              background: "#fff",
              color: "#4b5470",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              padding: "6.5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Icons.Export /> Export
          </button>
        </div>

        {/* Results Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 16px",
            background: "#fafbfc",
            borderBottom: "1px solid #e8eaf0",
            fontSize: 11.5,
            color: "#8b92a9",
            fontWeight: 500,
          }}
        >
          <span>
            <strong>{total}</strong> users found
          </span>
          {(activeRole || statusFilter !== "all" || search) && (
            <button
              onClick={() => {
                resetFilters();
                setStatusFilter("all");
              }}
              style={{
                fontSize: 11.5,
                color: "#3b6ef8",
                fontWeight: 600,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: "#fafbfc", borderBottom: "1px solid #e8eaf0" }}>
                <th
                  style={{
                    padding: "9px 14px 9px 16px",
                    textAlign: "left",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    color: "#8b92a9",
                    fontFamily: "inherit",
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    padding: "9px 14px",
                    textAlign: "left",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    color: "#8b92a9",
                    fontFamily: "inherit",
                  }}
                >
                  Phone
                </th>
                <th
                  style={{
                    padding: "9px 14px",
                    textAlign: "left",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    color: "#8b92a9",
                    fontFamily: "inherit",
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: "9px 14px",
                    textAlign: "left",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    color: "#8b92a9",
                    fontFamily: "inherit",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "9px 16px 9px 14px",
                    textAlign: "right",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    color: "#8b92a9",
                    fontFamily: "inherit",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px", color: "#8b92a9" }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px", color: "#ef4444" }}>
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f1623", marginBottom: 4 }}>
                        No users found
                      </div>
                      <div style={{ fontSize: 12.5, color: "#8b92a9" }}>
                        Try adjusting your search or filter criteria
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    rowIndex={index}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onToggleStatus={handleToggleStatus}
                    onViewDetails={() => {}}
                    hasPermission={hasPermission}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > ITEMS_PER_PAGE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderTop: "1px solid #e8eaf0",
              background: "#fafbfc",
            }}
          >
            <span style={{ fontSize: 12, color: "#8b92a9", fontWeight: 500 }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(page * ITEMS_PER_PAGE, total)} of {total} users
            </span>
            <Pagination
              page={page}
              total={total}
              limit={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={async (data) => {
          const userData = data as unknown as Record<string, unknown>;
          if (editingUser) {
            await handleUpdateUser(userData);
          } else {
            await handleCreateUser(userData);
          }
        }}
        roles={roles}
        editingUser={editingUser}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
