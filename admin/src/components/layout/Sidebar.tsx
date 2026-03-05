import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      { to: "/users", label: "Users", key: "users", icon: <span>👤</span> },
      { to: "/riders", label: "Riders", key: "riders", icon: <span>🚴</span> },
      { to: "/products", label: "Products", key: "products", icon: <span>📦</span> },
      { to: "/categories", label: "Categories", key: "categories", icon: <span>📂</span> },
      { to: "/orders", label: "Orders", key: "orders", icon: <span>🧾</span> },
    ],
  },
  {
    section: "System",
    links: [{ to: "/roles", label: "Roles", key: "roles", icon: <span>🛡</span> }],
  },
];

export default function Sidebar() {
  const [stats, setStats] = useState<SidebarStats>({});
  const [loading, setLoading] = useState(true);

  // Fetch statistics on component mount and periodically
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const summaryRes = await api.get("/admin/users/summary");
        const summaryData = summaryRes.data?.data ?? summaryRes.data;

        setStats({
          users: summaryData?.total ?? 0,
          riders: summaryData?.summary?.rider ?? 0,
          orders: summaryData?.summary?.orders ?? 0,
        });
      } catch (error) {
        console.error("Failed to fetch sidebar stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBadge = (key: string): number | undefined => {
    switch (key) {
      case "users":
        return stats.users;
      case "riders":
        return stats.riders;
      case "orders":
        return stats.orders;
      default:
        return undefined;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    globalThis.location.href = "/login";
  };

  return (
    <aside
      style={{
        width: 200,
        minHeight: "100vh",
        background: "#fff",
        borderRight: "1px solid #e8eaf0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
      className="dark:bg-slate-900 dark:border-slate-700"
    >
      {/* Logo */}
      <div
        style={{
          padding: "16px 14px 14px",
          borderBottom: "1px solid #e8eaf0",
        }}
        className="dark:border-slate-700"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "#3b6ef8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(59,110,248,.3)",
            }}
          >
            <span style={{ color: "white", fontWeight: 700 }}>A</span>
          </div>

          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#0f1623",
              }}
              className="dark:text-white"
            >
              AdminOS
            </div>

            <div style={{ fontSize: 9.5, color: "#8b92a9" }}>
              Management Suite
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((group) => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "#8b92a9",
                padding: "8px 8px 4px",
              }}
            >
              {group.section}
            </div>

            {group.links.map((link) => {
              const badge = getBadge((link as any).key);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 9px",
                    borderRadius: 7,
                    marginBottom: 1,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: "none",
                    transition: "all 0.13s",
                    background: isActive ? "#eef2ff" : "transparent",
                    color: isActive ? "#3b6ef8" : "#4b5470",
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ opacity: isActive ? 1 : 0.7 }}>{link.icon}</span>
                      <span style={{ flex: 1 }}>{link.label}</span>

                      {badge !== undefined && badge > 0 && (
                        <span
                          style={{
                            background: isActive ? "rgba(59,110,248,.12)" : "#f5f6fa",
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            color: isActive ? "#3b6ef8" : "#8b92a9",
                          }}
                        >
                          {badge}
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
      <div style={{ padding: "10px 8px", borderTop: "1px solid #e8eaf0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "linear-gradient(135deg,#3b6ef8,#7c3aed)",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            SA
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Super Admin</div>
            <div style={{ fontSize: 10.5, color: "#8b92a9" }}>superadmin</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 9px",
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 500,
            color: "#ef4444",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}