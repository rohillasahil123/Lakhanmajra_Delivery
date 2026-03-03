import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Shield,
  Bike,
  Layers,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Users", path: "/users", icon: Users },
    { name: "Riders", path: "/riders", icon: Bike },
    { name: "Products", path: "/products", icon: Package },
    { name: "Categories", path: "/categories", icon: Layers },
    { name: "Orders", path: "/orders", icon: ShoppingCart },
    { name: "Roles", path: "/roles", icon: Shield },
  ];

  return (
    <aside className="w-64 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col">
      <div className="p-6 font-bold text-xl text-blue-600">
        AdminOS
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition
                ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}