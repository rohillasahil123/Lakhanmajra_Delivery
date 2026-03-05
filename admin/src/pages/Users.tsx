import { useState, useMemo, useRef, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Data ──────────────────────────────────────────────────────────────────────
const USERS: User[] = [
  { id: 1, name: "Super Admin", email: "superadmin@example.com", phone: "0000000000", role: "superadmin", status: "Active", joined: "Jan 1, 2023" },
  { id: 2, name: "Rohilla", email: "rohillasahil000@gmail.com", phone: "9991462406", role: "rider", status: "Active", joined: "Mar 5, 2023" },
  { id: 3, name: "Sumit", email: "sumit@gmail.com", phone: "9958573455", role: "vendor", status: "Active", joined: "Apr 12, 2023" },
  { id: 4, name: "Poonam", email: "ponam@gmail.com", phone: "3265359389", role: "manager", status: "Active", joined: "May 20, 2023" },
  { id: 5, name: "Pooja", email: "pooja@example.com", phone: "9873254321", role: "rider", status: "Active", joined: "Jun 3, 2023" },
  { id: 6, name: "Gii", email: "gii@gmail.com", phone: "6598689868", role: "user", status: "Active", joined: "Jul 14, 2023" },
  { id: 7, name: "Meena", email: "meena@gmail.com", phone: "8275804009", role: "user", status: "Active", joined: "Aug 9, 2023" },
  { id: 8, name: "Sahil", email: "er@gmail.com", phone: "3265329835", role: "user", status: "Active", joined: "Sep 1, 2023" },
  { id: 9, name: "Sahil R.", email: "rohillasahil705@gmail.com", phone: "9991462142", role: "user", status: "Inactive", joined: "Sep 22, 2023" },
  { id: 10, name: "Ry", email: "ui@gmail.com", phone: "9991462403", role: "user", status: "Active", joined: "Oct 5, 2023" },
  { id: 11, name: "Anjali", email: "anjali@gmail.com", phone: "9812345678", role: "rider", status: "Active", joined: "Nov 1, 2023" },
  { id: 12, name: "Vikram", email: "vikram@example.com", phone: "9876543210", role: "user", status: "Inactive", joined: "Nov 18, 2023" },
  { id: 13, name: "Priya", email: "priya@gmail.com", phone: "8765432109", role: "rider", status: "Active", joined: "Dec 2, 2023" },
  { id: 14, name: "Rahul", email: "rahul@example.com", phone: "7654321098", role: "admin", status: "Active", joined: "Dec 20, 2023" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS: [string, string][] = [
  ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#be185d"], ["#d1fae5", "#065f46"],
  ["#fef3c7", "#92400e"], ["#ede9fe", "#5b21b6"], ["#cffafe", "#0e7490"],
  ["#fee2e2", "#991b1b"], ["#f0fdf4", "#14532d"],
];

const ROLE_STYLES: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: "#f5f3ff", color: "#7c3aed" },
  manager: { bg: "#f1f5f9", color: "#475569" },
  vendor: { bg: "#ecfeff", color: "#0891b2" },
  rider: { bg: "#fffbeb", color: "#d97706" },
  user: { bg: "#eef2ff", color: "#3b6ef8" },
  admin: { bg: "#fdf2f8", color: "#9d174d" },
};

type RoleFilter = "all" | "manager" | "vendor" | "admin" | "rider" | "user" | "superadmin";
type StatusFilter = "all" | "Active" | "Inactive";

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "manager", label: "Manager" },
  { key: "vendor", label: "Vendor" },
  { key: "admin", label: "Admin" },
  { key: "rider", label: "Rider" },
  { key: "user", label: "User" },
  { key: "superadmin", label: "Super Admin" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string; dot?: string }[] = [
  { value: "all", label: "All Status" },
  { value: "Active", label: "Active", dot: "#12b76a" },
  { value: "Inactive", label: "Inactive", dot: "#ef4444" },
];

const PER_PAGE = 8;

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Eye: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>,
  Search: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Plus: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Export: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  ChevDown: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>,
  ChevLeft: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>,
  ChevRight: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
};

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({
  value,
  onChange,
}: Readonly<{
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          border: "1px solid #e8eaf0", background: open ? "#f5f6fa" : "#fff",
          color: "#0f1623", borderRadius: 8, fontFamily: "inherit",
          fontSize: 12.5, fontWeight: 600, padding: "6px 11px",
          cursor: "pointer", transition: "all 0.13s", whiteSpace: "nowrap",
          minWidth: 120,
        }}
      >
        {selected.dot && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: selected.dot, flexShrink: 0 }} />
        )}
        {selected.label}
        <span style={{ marginLeft: "auto", color: "#8b92a9", display: "flex", paddingLeft: 4 }}>
          <Icons.ChevDown />
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0,
          background: "#fff", border: "1px solid #e8eaf0",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1), 0 2px 6px rgba(0,0,0,.06)",
          zIndex: 100, minWidth: 148, padding: 4, overflow: "hidden",
        }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "7px 11px", border: "none",
                background: value === opt.value ? "#f5f7ff" : "transparent",
                color: value === opt.value ? "#3b6ef8" : "#0f1623",
                fontSize: 12.5, fontWeight: value === opt.value ? 600 : 500,
                cursor: "pointer", borderRadius: 7, fontFamily: "inherit",
                textAlign: "left", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
            >
              {opt.dot
                ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: opt.dot, flexShrink: 0, boxShadow: `0 0 0 2px ${opt.dot === "#12b76a" ? "#d1fae5" : "#fee2e2"}` }} />
                : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d1d5e0", flexShrink: 0 }} />
              }
              {opt.label}
              {value === opt.value && (
                <span style={{ marginLeft: "auto", color: "#3b6ef8", display: "flex" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);


  const filtered = useMemo(() =>
    USERS.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      const s = search.toLowerCase();

      const matchSearch =
        s.length === 0 ||
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s);
      return matchRole && matchStatus && matchSearch;
    }),
    [roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const go = (n: number) => setPage(n);
  const handleRole = (r: RoleFilter) => { setRoleFilter(r); setPage(1); };
  const handleStatus = (s: StatusFilter) => { setStatusFilter(s); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  // Active-count badge for tab
  const activeCount = (key: RoleFilter) => {
    if (key === "all") return USERS.length;

    let count = 0;
    for (const u of USERS) {
      if (u.role === key) count++;
    }

    return count;
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", background: "#f5f6fa",
      fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
      fontSize: 13, color: "#0f1623", overflow: "hidden",
    }}>
      <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden", minHeight: 0 }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: "#eef2ff",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#3b6ef8",
              }}>
                <Icons.Users />
              </div>
              <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, margin: 0 }}>Users</h1>
              <span style={{
                background: "#eef2ff", color: "#3b6ef8", borderRadius: 20,
                fontSize: 11, fontWeight: 700, padding: "2px 9px",
              }}>
                {USERS.length} total
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#8b92a9", margin: 0 }}>
              Manage accounts, roles and permissions across your platform
            </p>
          </div>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#3b6ef8", color: "#fff", border: "none", borderRadius: 8,
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            padding: "8px 16px", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(59,110,248,.28)",
          }}>
            <Icons.Plus /> Create User
          </button>
        </div>

        {/* ── Table Card ── */}
        <div style={{
          background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12,
          display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden",
        }}>

          {/* ── Toolbar Row ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderBottom: "1px solid #e8eaf0",
            flexShrink: 0, flexWrap: "wrap",
          }}>

            {/* Role tabs pill group */}
            <div style={{
              display: "flex", background: "#f5f6fa",
              border: "1px solid #e8eaf0", borderRadius: 8, padding: 3, gap: 2,
            }}>
              {ROLE_TABS.map((t) => {
                const isActive = roleFilter === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleRole(t.key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.13s",
                      background: isActive ? "#3b6ef8" : "transparent",
                      color: isActive ? "#fff" : "#8b92a9",
                      boxShadow: isActive ? "0 2px 6px rgba(59,110,248,.22)" : "none",
                    }}
                  >
                    {t.label}
                    <span style={{
                      fontSize: 10.5, fontWeight: isActive ? 700 : 400,
                      opacity: isActive ? 0.85 : 0.6,
                    }}>
                      {activeCount(t.key)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                color: "#8b92a9", pointerEvents: "none", display: "flex",
              }}>
                <Icons.Search />
              </span>
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  background: "#f5f6fa", border: "1px solid #e8eaf0",
                  borderRadius: 8, fontFamily: "inherit", fontSize: 12.5,
                  color: "#0f1623", padding: "6.5px 11px 6.5px 30px",
                  width: 210, outline: "none", transition: "all 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#3b6ef8"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(59,110,248,.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e8eaf0"; e.target.style.background = "#f5f6fa"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Status dropdown */}
            <StatusDropdown value={statusFilter} onChange={handleStatus} />

            {/* Export */}
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              border: "1px solid #e8eaf0", background: "#fff", color: "#4b5470",
              borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
              padding: "6.5px 12px", cursor: "pointer",
            }}>
              <Icons.Export /> Export
            </button>
          </div>

          {/* ── Results meta row ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 16px", background: "#fafbfc", borderBottom: "1px solid #e8eaf0",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11.5, color: "#8b92a9", fontWeight: 500 }}>
              {filtered.length > 0 ? (
                <>
                  <strong>{filtered.length}</strong> users found
                  {statusFilter === "all" ? "" : ` · ${statusFilter}`}
                  {roleFilter === "all" ? "" : ` · ${roleFilter}`}
                </>
              ) : (
                "No users match your filters"
              )}
            </span>
            {(roleFilter !== "all" || statusFilter !== "all" || search) && (
              <button
                onClick={() => { setRoleFilter("all"); setStatusFilter("all"); setSearch(""); setPage(1); }}
                style={{
                  fontSize: 11.5, color: "#3b6ef8", fontWeight: 600, border: "none",
                  background: "none", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Clear filters
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8eaf0", background: "#fafbfc", position: "sticky", top: 0, zIndex: 1 }}>
                  {[
                    { label: "USER", align: "left" },
                    { label: "PHONE", align: "left" },
                    { label: "ROLE", align: "left" },
                    { label: "STATUS", align: "left" },
                    { label: "JOINED", align: "left" },
                    { label: "ACTIONS", align: "right" },
                  ].map((h, i) => (
                    <th key={h.label} style={{
                      padding: "9px 14px",
                      textAlign: h.align as "left" | "right",
                      fontSize: 10.5, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.7px",
                      color: "#8b92a9", whiteSpace: "nowrap",
                      paddingLeft: i === 0 ? 16 : 14,
                      paddingRight: i === 5 ? 16 : 14,
                    }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div style={{ textAlign: "center", padding: "60px 20px" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f1623", marginBottom: 4 }}>No users found</div>
                        <div style={{ fontSize: 12.5, color: "#8b92a9" }}>Try adjusting your search or filter criteria</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((user) => {
                    const [bg, fg] = AVATAR_COLORS[(user.id - 1) % AVATAR_COLORS.length];
                    const rs = ROLE_STYLES[user.role];
                    return <UserRow key={user.id} user={user} avatarBg={bg} avatarFg={fg} roleBg={rs.bg} roleColor={rs.color} />;
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderTop: "1px solid #e8eaf0",
            background: "#fafbfc", flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: "#8b92a9", fontWeight: 500 }}>
              {filtered.length > 0
                ? `Showing ${(currentPage - 1) * PER_PAGE + 1}–${Math.min(currentPage * PER_PAGE, filtered.length)} of ${filtered.length} users`
                : "—"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PagBtn onClick={() => go(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                <Icons.ChevLeft />
              </PagBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PagBtn key={n} active={n === currentPage} onClick={() => go(n)}>{n}</PagBtn>
              ))}
              <PagBtn onClick={() => go(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                <Icons.ChevRight />
              </PagBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────
function UserRow({
  user,
  avatarBg,
  avatarFg,
  roleBg,
  roleColor,
}: Readonly<{
  user: User;
  avatarBg: string;
  avatarFg: string;
  roleBg: string;
  roleColor: string;
}>) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ borderBottom: "1px solid #e8eaf0", background: hov ? "#fafbff" : "#fff", transition: "background 0.1s" }}
    >
      <td style={{ padding: "10px 14px 10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: avatarBg, color: avatarFg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f1623" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#8b92a9", marginTop: 1 }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 14px", color: "#4b5470", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{user.phone}</td>
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: user.status === "Active" ? "#12b76a" : "#ef4444" }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: user.status === "Active" ? "#12b76a" : "#ef4444",
            boxShadow: `0 0 0 2.5px ${user.status === "Active" ? "#d1fae5" : "#fee2e2"}`,
          }} />
          {user.status}
        </span>
      </td>
      <td style={{ padding: "10px 14px", color: "#8b92a9", fontSize: 12 }}>{user.joined}</td>
      <td style={{ padding: "10px 16px 10px 14px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: hov ? 1 : 0, transition: "opacity 0.12s" }}>
          <ActionBtn title="View">   <Icons.Eye /> </ActionBtn>
          <ActionBtn title="Edit">   <Icons.Edit /> </ActionBtn>
          <ActionBtn title="Delete" danger> <Icons.Trash /> </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({
  children,
  title,
  danger = false,
}: Readonly<{
  children: React.ReactNode;
  title: string;
  danger?: boolean;
}>) {
  const [hov, setHov] = useState(false);

  let btnColor = "#8b92a9";
  let btnBg = "#fff";
  let btnBorder = "#e8eaf0";

  if (hov) {
    btnBg = danger ? "#fff1f2" : "#f5f6fa";
    btnColor = danger ? "#ef4444" : "#0f1623";
    btnBorder = danger ? "#fecdd3" : "#e8eaf0";
  }

  return (
    <button
      title={title}
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 27,
        height: 27,
        borderRadius: 7,
        border: `1px solid ${btnBorder}`,
        background: btnBg,
        color: btnColor,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}
// ── Pagination Button ─────────────────────────────────────────────────────────
function PagBtn({
  children,
  active = false,
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}>) {
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