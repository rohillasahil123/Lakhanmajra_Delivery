import { NavLink } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import api from "../../api/client";

interface SidebarStats {
  users?: number;
  riders?: number;
  orders?: number;
}

const NAV_ITEMS = [
  {
    section: "Overview",
    links: [
      {
        to: "/",
        label: "Dashboard",
        icon: (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        ),
        key: "dashboard",
      },
    ],
  },
  {
    section: "Management",
    links: [
      { to: "/users",    label: "Users",    key: "users",    icon: <span style={{ fontSize: '12px' }}>👤</span> },
      { to: "/riders",   label: "Riders",   key: "riders",   icon: <span style={{ fontSize: '12px' }}>🚴</span> },
      { to: "/products", label: "Products", key: "products", icon: <span style={{ fontSize: '12px' }}>📦</span> },
      { to: "/offers",   label: "Offers",   key: "offers",   icon: <span style={{ fontSize: '12px' }}>🎁</span> },
      { to: "/notifications", label: "Notifications", key: "notifications", icon: <span style={{ fontSize: '12px' }}>🔔</span> },
      { to: "/orders",   label: "Orders",   key: "orders",   icon: <span style={{ fontSize: '12px' }}>🧾</span> },
    ],
  },
  {
    section: "System",
    links: [
      { to: "/roles", label: "Roles", key: "roles", icon: <span style={{ fontSize: '12px' }}>🛡</span> },
    ],
  },
];

export default function Sidebar() {
  const [stats, setStats] = useState<SidebarStats>({});
  const [isCollapsed, setIsCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement>(null);
  const hoverZoneRef = useRef<HTMLDivElement>(null);

  // Handle mouse enter on sidebar or hover zone - expand sidebar
  const handleMouseEnter = () => {
    setIsCollapsed(false);
  };

  // Handle mouse leave from sidebar - instantly collapse
  const handleMouseLeave = () => {
    setIsCollapsed(true);
  };

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const hoverZone = hoverZoneRef.current;

    if (sidebar) {
      sidebar.addEventListener("mouseenter", handleMouseEnter);
      sidebar.addEventListener("mouseleave", handleMouseLeave);
    }

    if (hoverZone) {
      hoverZone.addEventListener("mouseenter", handleMouseEnter);
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener("mouseenter", handleMouseEnter);
        sidebar.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (hoverZone) {
        hoverZone.removeEventListener("mouseenter", handleMouseEnter);
      }
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/users/summary");
        const d   = res.data?.data ?? res.data;
        setStats({ users: d?.total ?? 0, riders: d?.summary?.rider ?? 0, orders: d?.summary?.orders ?? 0 });
      } catch { /* silent */ }
    };
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, []);

  const getBadge = (key: string) => {
    if (key === "users")  return stats.users;
    if (key === "riders") return stats.riders;
    if (key === "orders") return stats.orders;
    return undefined;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    globalThis.location.href = "/login";
  };

  return (
    <>
      {/* Hover Zone - Invisible zone on left edge to trigger sidebar expansion */}
      <div
        ref={hoverZoneRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 10,
          height: "100vh",
          zIndex: 40,
          cursor: "pointer",
        }}
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{
          width: isCollapsed ? 60 : 200,
          minHeight: "100vh",
          background: "#fff",
          borderRight: "1px solid #e8eaf0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.3s ease-in-out",
          overflow: "hidden",
          position: "relative",
          zIndex: 41,
        }}
        className="dark:bg-slate-900 dark:border-slate-700"
      >
        {/* Logo */}
        <div style={{ padding: "16px 14px 14px", borderBottom: "1px solid #e8eaf0", minHeight: 70, display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start" }} className="dark:border-slate-700">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, background: "#3b6ef8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(59,110,248,.3)", flexShrink: 0 }}>
              <span style={{ color: "white", fontWeight: 700 }}>A</span>
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f1623" }} className="dark:text-white">AdminOS</div>
                <div style={{ fontSize: 9.5, color: "#8b92a9" }}>Management Suite</div>
              </div>
            )}
          </div>
        </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((group) => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            {!isCollapsed && (
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#8b92a9", padding: "8px 8px 4px" }}>
                {group.section}
              </div>
            )}
            {group.links.map((link) => {
              const badge = getBadge(link.key);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? 0 : 8,
                    padding: "7px 9px", borderRadius: 7, marginBottom: 1,
                    fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                    textDecoration: "none", transition: "all 0.13s",
                    background: isActive ? "#eef2ff" : "transparent",
                    color: isActive ? "#3b6ef8" : "#4b5470",
                    position: "relative",
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{link.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span style={{ flex: 1 }}>{link.label}</span>
                          {badge !== undefined && badge > 0 && (
                            <span style={{ background: isActive ? "rgba(59,110,248,.12)" : "#f5f6fa", borderRadius: 99, fontSize: 10, fontWeight: 600, padding: "1px 6px", color: isActive ? "#3b6ef8" : "#8b92a9" }}>
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && badge !== undefined && badge > 0 && (
                        <span style={{ position: "absolute", top: 2, right: 4, width: 16, height: 16, background: "#ef4444", borderRadius: "50%", fontSize: 10, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid #e8eaf0" }} className="dark:border-slate-700">
        {!isCollapsed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#3b6ef8,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                SA
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Super Admin</div>
                <div style={{ fontSize: 10.5, color: "#8b92a9" }}>superadmin</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", marginTop: 8 }}
            >
              Sign out
            </button>
          </>
        )}
        {isCollapsed && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#3b6ef8,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", cursor: "pointer" }} title="Super Admin">
              SA
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
