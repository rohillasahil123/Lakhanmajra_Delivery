import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  {
    section: "Overview",
    links: [
      { to: "/", label: "Dashboard", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
    ],
  },
  {
    section: "Management",
    links: [
      { to: "/users",      label: "Users",      badge: 14, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { to: "/riders",     label: "Riders",     badge: 4,  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
      { to: "/products",   label: "Products",   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
      { to: "/categories", label: "Categories", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h10"/></svg> },
      { to: "/orders",     label: "Orders",     badge: 12, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg> },
    ],
  },
  {
    section: "System",
    links: [
      { to: "/roles", label: "Roles", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    ],
  },
];

export default function Sidebar() {
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
      <div style={{ padding: "16px 14px 14px", borderBottom: "1px solid #e8eaf0" }} className="dark:border-slate-700">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 30, height: 30, background: "#3b6ef8", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(59,110,248,.3)", flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f1623", letterSpacing: -0.3 }} className="dark:text-white">AdminOS</div>
            <div style={{ fontSize: 9.5, color: "#8b92a9", fontWeight: 500 }}>Management Suite</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((group) => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "1px", color: "#8b92a9", padding: "8px 8px 4px",
            }}>
              {group.section}
            </div>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 9px", borderRadius: 7, marginBottom: 1,
                  fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                  textDecoration: "none", transition: "all 0.13s",
                  background: isActive ? "#eef2ff" : "transparent",
                  color: isActive ? "#3b6ef8" : "#4b5470",
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7, display: "flex" }}>
                      {link.icon}
                    </span>
                    <span style={{ flex: 1 }}>{link.label}</span>
                    {link.badge !== undefined && (
                      <span style={{
                        background: isActive ? "rgba(59,110,248,.12)" : "#f5f6fa",
                        border: `1px solid ${isActive ? "rgba(59,110,248,.2)" : "#e8eaf0"}`,
                        borderRadius: 99, fontSize: 10, fontWeight: 600,
                        padding: "1px 6px", color: isActive ? "#3b6ef8" : "#8b92a9",
                      }}>
                        {link.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid #e8eaf0" }} className="dark:border-slate-700">
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 9px", borderRadius: 8, cursor: "pointer", transition: "background 0.13s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{
            width: 28, height: 28, background: "linear-gradient(135deg,#3b6ef8,#7c3aed)",
            borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>SA</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f1623" }} className="dark:text-white">Super Admin</div>
            <div style={{ fontSize: 10.5, color: "#8b92a9" }}>superadmin</div>
          </div>
          <svg style={{ marginLeft: "auto", color: "#8b92a9" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
            borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: "#ef4444",
            textDecoration: "none", transition: "background 0.13s", marginTop: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fff1f2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </a>
      </div>
    </aside>
  );
}