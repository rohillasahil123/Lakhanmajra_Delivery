import { useState, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type Role = "superadmin" | "manager" | "vendor" | "rider" | "user" | "admin";
type Status = "Active" | "Inactive";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  joined: string;
}

// ── Sample Data ──────────────────────────────────────────────────────────────
const USERS: User[] = [
  { id: 1,  name: "Super Admin", email: "superadmin@example.com",    phone: "0000000000",  role: "superadmin", status: "Active",   joined: "Jan 1, 2023"  },
  { id: 2,  name: "Rohilla",     email: "rohillasahil000@gmail.com", phone: "9991462406",  role: "rider",      status: "Active",   joined: "Mar 5, 2023"  },
  { id: 3,  name: "Sumit",       email: "sumit@gmail.com",           phone: "9958573455",  role: "vendor",     status: "Active",   joined: "Apr 12, 2023" },
  { id: 4,  name: "Poonam",      email: "ponam@gmail.com",           phone: "3265359389",  role: "manager",    status: "Active",   joined: "May 20, 2023" },
  { id: 5,  name: "Pooja",       email: "pooja@example.com",         phone: "9873254321",  role: "rider",      status: "Active",   joined: "Jun 3, 2023"  },
  { id: 6,  name: "Gii",         email: "gii@gmail.com",             phone: "6598689868",  role: "user",       status: "Active",   joined: "Jul 14, 2023" },
  { id: 7,  name: "Meena",       email: "meena@gmail.com",           phone: "8275804009",  role: "user",       status: "Active",   joined: "Aug 9, 2023"  },
  { id: 8,  name: "Sahil",       email: "er@gmail.com",              phone: "3265329835",  role: "user",       status: "Active",   joined: "Sep 1, 2023"  },
  { id: 9,  name: "Sahil R.",    email: "rohillasahil705@gmail.com", phone: "9991462142",  role: "user",       status: "Inactive", joined: "Sep 22, 2023" },
  { id: 10, name: "Ry",          email: "ui@gmail.com",              phone: "9991462403",  role: "user",       status: "Active",   joined: "Oct 5, 2023"  },
  { id: 11, name: "Anjali",      email: "anjali@gmail.com",          phone: "9812345678",  role: "rider",      status: "Active",   joined: "Nov 1, 2023"  },
  { id: 12, name: "Vikram",      email: "vikram@example.com",        phone: "9876543210",  role: "user",       status: "Inactive", joined: "Nov 18, 2023" },
  { id: 13, name: "Priya",       email: "priya@gmail.com",           phone: "8765432109",  role: "rider",      status: "Active",   joined: "Dec 2, 2023"  },
  { id: 14, name: "Rahul",       email: "rahul@example.com",         phone: "7654321098",  role: "admin",      status: "Active",   joined: "Dec 20, 2023" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS: [string, string][] = [
  ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#be185d"], ["#d1fae5", "#065f46"],
  ["#fef3c7", "#92400e"], ["#ede9fe", "#5b21b6"], ["#cffafe", "#0e7490"],
  ["#fee2e2", "#991b1b"], ["#f0fdf4", "#14532d"],
];

const ROLE_STYLES: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: "#f5f3ff", color: "#7c3aed" },
  manager:    { bg: "#f1f5f9", color: "#475569" },
  vendor:     { bg: "#ecfeff", color: "#0891b2" },
  rider:      { bg: "#fffbeb", color: "#d97706" },
  user:       { bg: "#eef2ff", color: "#3b6ef8" },
  admin:      { bg: "#fdf2f8", color: "#9d174d" },
};

type RoleFilter = "all" | "manager" | "vendor" | "admin" | "rider" | "user" | "superadmin";
type StatusFilter = "all" | "Active" | "Inactive";

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "manager",    label: "Manager" },
  { key: "vendor",     label: "Vendor" },
  { key: "admin",      label: "Admin" },
  { key: "rider",      label: "Rider" },
  { key: "user",       label: "User" },
  { key: "superadmin", label: "Super Admin" },
];

const PER_PAGE = 8;

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  ),
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Filter: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Export: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  ChevLeft: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, count, iconBg, iconColor, icon, active, onClick,
}: {
  label: string; count: number; iconBg: string; iconColor: string;
  icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1.5px solid ${active ? "#3b6ef8" : "#e8eaf0"}`,
        borderRadius: 11,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.16s",
        boxShadow: active ? "0 0 0 3px rgba(59,110,248,.1)" : "0 1px 3px rgba(0,0,0,.05)",
        flex: 1,
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 8, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: active ? "#3b6ef8" : "#0f1623", lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ fontSize: 11, color: "#8b92a9", fontWeight: 500, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Counts per role (ignoring status/search for tab counts)
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: USERS.length };
    USERS.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    return USERS.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchStatus && matchSearch;
    });
  }, [roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleRoleFilter = (r: RoleFilter) => { setRoleFilter(r); setPage(1); };
  const handleStatusFilter = (s: StatusFilter) => { setStatusFilter(s); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f5f6fa", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 13, color: "#0f1623", overflow: "hidden" }}>

      {/* ── Content area ── */}
      <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden", minHeight: 0 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: "#0f1623" }}>Users</div>
            <div style={{ fontSize: 12, color: "#8b92a9", marginTop: 2 }}>Manage accounts, roles and permissions across your platform</div>
          </div>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#3b6ef8", color: "#fff", border: "none",
            borderRadius: 8, fontFamily: "inherit", fontSize: 13,
            fontWeight: 600, padding: "8px 15px", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(59,110,248,.25)", whiteSpace: "nowrap",
          }}>
            <Icon.Plus /> + Create User
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <StatCard label="Total Users" count={USERS.length} iconBg="#eef2ff" iconColor="#3b6ef8" active={roleFilter === "all"}
            onClick={() => handleRoleFilter("all")}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <StatCard label="Riders" count={roleCounts.rider || 0} iconBg="#fffbeb" iconColor="#d97706" active={roleFilter === "rider"}
            onClick={() => handleRoleFilter("rider")}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
          />
          <StatCard label="Users" count={roleCounts.user || 0} iconBg="#eef2ff" iconColor="#3b6ef8" active={roleFilter === "user"}
            onClick={() => handleRoleFilter("user")}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          />
          <StatCard label="Vendors" count={roleCounts.vendor || 0} iconBg="#ecfeff" iconColor="#0891b2" active={roleFilter === "vendor"}
            onClick={() => handleRoleFilter("vendor")}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
          />
          <StatCard label="Super Admins" count={roleCounts.superadmin || 0} iconBg="#f5f3ff" iconColor="#7c3aed" active={roleFilter === "superadmin"}
            onClick={() => handleRoleFilter("superadmin")}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          />
        </div>

        {/* Table card */}
        <div style={{
          background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12,
          display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden",
        }}>

          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
            borderBottom: "1px solid #e8eaf0", flexShrink: 0, flexWrap: "wrap",
          }}>
            {/* Role tabs */}
            <div style={{ display: "flex", background: "#f5f6fa", border: "1px solid #e8eaf0", borderRadius: 8, padding: 3, gap: 2 }}>
              {ROLE_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleRoleFilter(t.key)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.13s",
                    background: roleFilter === t.key ? "#3b6ef8" : "transparent",
                    color: roleFilter === t.key ? "#fff" : "#8b92a9",
                    boxShadow: roleFilter === t.key ? "0 2px 6px rgba(59,110,248,.25)" : "none",
                  }}
                >
                  {t.label} <span style={{ opacity: 0.65, fontWeight: 400 }}>{roleCounts[t.key] || 0}</span>
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#8b92a9", pointerEvents: "none", display: "flex" }}>
                <Icon.Search />
              </span>
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users…"
                style={{
                  background: "#f5f6fa", border: "1px solid #e8eaf0", borderRadius: 7,
                  fontFamily: "inherit", fontSize: 12.5, color: "#0f1623",
                  padding: "6px 11px 6px 28px", width: 180, outline: "none",
                }}
              />
            </div>

            {/* Status filter */}
            <div style={{ display: "flex", background: "#f5f6fa", border: "1px solid #e8eaf0", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["all", "Active", "Inactive"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.13s",
                    background: statusFilter === s ? "#fff" : "transparent",
                    color: statusFilter === s ? "#0f1623" : "#8b92a9",
                    boxShadow: statusFilter === s ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <button style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid #e8eaf0", background: "#fff", color: "#4b5470", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "6px 11px", cursor: "pointer" }}>
              <Icon.Filter /> Filter
            </button>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid #e8eaf0", background: "#fff", color: "#4b5470", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "6px 11px", cursor: "pointer" }}>
              <Icon.Export /> Export
            </button>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8eaf0", background: "#fafbfc", position: "sticky", top: 0, zIndex: 1 }}>
                  {["USER", "PHONE", "ROLE", "STATUS", "JOINED", "ACTIONS"].map((h, i) => (
                    <th key={h} style={{
                      padding: "9px 14px", textAlign: i === 5 ? "right" : "left",
                      fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.7px", color: "#8b92a9", whiteSpace: "nowrap",
                      paddingLeft: i === 0 ? 16 : 14, paddingRight: i === 5 ? 16 : 14,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "50px 20px", color: "#8b92a9", fontSize: 13 }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((user) => {
                    const [bg, fg] = AVATAR_COLORS[(user.id - 1) % AVATAR_COLORS.length];
                    const rs = ROLE_STYLES[user.role];
                    return (
                      <UserRow key={user.id} user={user} avatarBg={bg} avatarFg={fg} roleBg={rs.bg} roleColor={rs.color} />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderTop: "1px solid #e8eaf0", background: "#fafbfc", flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: "#8b92a9", fontWeight: 500 }}>
              {filtered.length > 0
                ? `Showing ${(currentPage - 1) * PER_PAGE + 1}–${Math.min(currentPage * PER_PAGE, filtered.length)} of ${filtered.length} users`
                : "0 users found"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PagBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <Icon.ChevLeft />
              </PagBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PagBtn key={n} active={n === currentPage} onClick={() => setPage(n)}>
                  {n}
                </PagBtn>
              ))}
              <PagBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <Icon.ChevRight />
              </PagBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Row ─────────────────────────────────────────────────────────────────
function UserRow({ user, avatarBg, avatarFg, roleBg, roleColor }: {
  user: User; avatarBg: string; avatarFg: string; roleBg: string; roleColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: "1px solid #e8eaf0", background: hovered ? "#fafbff" : "#fff", transition: "background 0.11s" }}
    >
      <td style={{ padding: "10px 14px 10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: avatarBg, color: avatarFg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: 0.3,
          }}>
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f1623" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#8b92a9", marginTop: 1 }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 14px", color: "#4b5470", fontSize: 12.5 }}>{user.phone}</td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
          background: roleBg, color: roleColor,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: roleColor, display: "inline-block" }} />
          {user.role}
        </span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 500, color: user.status === "Active" ? "#12b76a" : "#ef4444" }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: user.status === "Active" ? "#12b76a" : "#ef4444",
            boxShadow: `0 0 0 2.5px ${user.status === "Active" ? "#d1fae5" : "#fee2e2"}`,
          }} />
          {user.status}
        </span>
      </td>
      <td style={{ padding: "10px 14px", color: "#8b92a9", fontSize: 12 }}>{user.joined}</td>
      <td style={{ padding: "10px 14px 10px 14px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.13s" }}>
          <ActionBtn title="View"><Icon.Eye /></ActionBtn>
          <ActionBtn title="Edit"><Icon.Edit /></ActionBtn>
          <ActionBtn title="Delete" danger><Icon.Trash /></ActionBtn>
        </div>
      </td>
    </tr>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({ children, title, danger = false }: { children: React.ReactNode; title: string; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 27, height: 27, borderRadius: 7,
        border: `1px solid ${hov && danger ? "#fecdd3" : "#e8eaf0"}`,
        background: hov ? (danger ? "#fff1f2" : "#f5f6fa") : "#fff",
        color: hov ? (danger ? "#ef4444" : "#0f1623") : "#8b92a9",
        cursor: "pointer", display: "grid", placeItems: "center", transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

// ── Pagination Button ─────────────────────────────────────────────────────────
function PagBtn({ children, active = false, disabled = false, onClick }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, padding: "0 7px", borderRadius: 7,
        border: `1px solid ${active ? "#3b6ef8" : "#e8eaf0"}`,
        background: active ? "#3b6ef8" : "#fff",
        color: active ? "#fff" : "#4b5470",
        cursor: disabled ? "default" : "pointer",
        fontSize: 12.5, fontFamily: "inherit", fontWeight: 600,
        display: "grid", placeItems: "center", opacity: disabled ? 0.35 : 1,
        boxShadow: active ? "0 2px 8px rgba(59,110,248,.25)" : "none",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}