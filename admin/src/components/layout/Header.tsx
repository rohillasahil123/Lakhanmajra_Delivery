import ThemeToggle from "./ThemeToggle";
import { useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  const pageName =
    location.pathname === "/"
      ? "Dashboard"
      : location.pathname.replace("/", "").charAt(0).toUpperCase() +
        location.pathname.slice(2);

  return (
    <header
      style={{
        height: 48,
        background: "var(--header-bg, #fff)",
        borderBottom: "1px solid #e8eaf0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        zIndex: 50,
      }}
      className="dark:bg-slate-900 dark:border-slate-700"
    >
      {/* Breadcrumb */}
      <div style={{ fontSize: 12.5, color: "#8b92a9", display: "flex", alignItems: "center", gap: 6 }}>
        <span className="dark:text-slate-400">Dashboard</span>
        {location.pathname !== "/" && (
          <>
            <span style={{ color: "#d1d5e0" }}>›</span>
            <span style={{ color: "#0f1623", fontWeight: 600 }} className="dark:text-slate-200">
              {pageName}
            </span>
          </>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ThemeToggle />
        <div
          style={{
            width: 30,
            height: 30,
            background: "#3b6ef8",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0.3,
            cursor: "pointer",
          }}
        >
          SA
        </div>
      </div>
    </header>
  );
}