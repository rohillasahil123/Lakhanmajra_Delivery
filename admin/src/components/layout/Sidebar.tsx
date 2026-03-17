import { NavLink } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../../api/client';

interface SidebarStats {
  users?: number;
  riders?: number;
  orders?: number;
}

const NAV_ITEMS = [
  {
    section: 'Overview',
    links: [
      {
        to: '/',
        label: 'Dashboard',
        icon: (
          <svg
            className="w-full h-full"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
        key: 'dashboard',
      },
    ],
  },
  {
    section: 'Management',
    links: [
      {
        to: '/users',
        label: 'Users',
        key: 'users',
        icon: <span className="text-xl">👤</span>,
      },
      {
        to: '/riders',
        label: 'Riders',
        key: 'riders',
        icon: <span className="text-xl">🚴</span>,
      },
      {
        to: '/products',
        label: 'Products',
        key: 'products',
        icon: <span className="text-xl">📦</span>,
      },
      {
        to: '/offers',
        label: 'Offers',
        key: 'offers',
        icon: <span className="text-xl">🎁</span>,
      },
      {
        to: '/notifications',
        label: 'Notifications',
        key: 'notifications',
        icon: <span className="text-xl">🔔</span>,
      },
      {
        to: '/orders',
        label: 'Orders',
        key: 'orders',
        icon: <span className="text-xl">🧾</span>,
      },
    ],
  },
  {
    section: 'System',
    links: [
      {
        to: '/roles',
        label: 'Roles',
        key: 'roles',
        icon: <span className="text-4xl">🛡</span>,
      },
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
      sidebar.addEventListener('mouseenter', handleMouseEnter);
      sidebar.addEventListener('mouseleave', handleMouseLeave);
    }

    if (hoverZone) {
      hoverZone.addEventListener('mouseenter', handleMouseEnter);
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener('mouseenter', handleMouseEnter);
        sidebar.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (hoverZone) {
        hoverZone.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/users/summary');
        const d = res.data?.data ?? res.data;
        setStats({
          users: d?.total ?? 0,
          riders: d?.summary?.rider ?? 0,
          orders: d?.summary?.orders ?? 0,
        });
      } catch {
        /* silent */
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, []);

  const getBadge = (key: string) => {
    if (key === 'users') return stats.users;
    if (key === 'riders') return stats.riders;
    if (key === 'orders') return stats.orders;
    return undefined;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    globalThis.location.href = '/login';
  };

  return (
    <>
      {/* Hover Zone - Invisible zone on left edge to trigger sidebar expansion */}
      <div
        ref={hoverZoneRef}
        className="fixed left-0 top-0 w-[10px] h-screen z-40 cursor-pointer"
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`min-h-screen bg-white border-r border-[#e8eaf0] dark:bg-slate-900 dark:border-slate-700 flex flex-col flex-shrink-0 relative z-41 transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'w-[60px]' : 'w-[200px]'
        }`}
      >
        {/* Logo */}
        <div
          className={`border-b border-[#e8eaf0] dark:border-slate-700 min-h-[70px] flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-start'
          } px-3.5 py-4`}
        >
          <div className="flex items-center gap-2.25 flex-shrink-0">
            <div className="w-[30px] h-[30px] bg-[#3b6ef8] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(59,110,248,.3)]">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            {!isCollapsed && (
              <div>
                <div className="text-sm font-bold text-[#0f1623] dark:text-white">AdminOS</div>
                <div className="text-[9.5px] text-[#8b92a9]">Management Suite</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {NAV_ITEMS.map((group) => (
            <div key={group.section} className="mb-1">
              {!isCollapsed && (
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#8b92a9] px-2 py-2 pb-1">
                  {group.section}
                </div>
              )}
              {group.links.map((link) => {
                const badge = getBadge(link.key);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `flex ${isCollapsed ? 'justify-center' : 'justify-start'} items-center ${
                        isCollapsed ? 'gap-0' : 'gap-2'
                      } px-2.25 ${isCollapsed ? 'py-2' : 'py-1.75'} rounded-lg ${
                        isCollapsed ? 'mb-2' : 'mb-0.25'
                      } text-[12.5px] transition-all duration-[0.13s] relative no-underline ${
                        isActive
                          ? 'bg-[#eef2ff] font-semibold text-[#3b6ef8]'
                          : 'text-[#4b5470] font-medium hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex-shrink-0 flex items-center justify-center transition-all duration-200 ${isCollapsed ? 'w-6 h-6 text-lg' : 'w-8 h-8 text-xl'} ${isActive ? 'opacity-100' : 'opacity-70'}`}
                        >
                          {link.icon}
                        </span>
                        {isCollapsed && <span className="sr-only">{link.label}</span>}
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">{link.label}</span>
                            {badge !== undefined && badge > 0 && (
                              <span
                                className={`rounded-full text-[10px] font-semibold px-1.5 py-0.5 ${
                                  isActive
                                    ? 'bg-[rgba(59,110,248,.12)] text-[#3b6ef8]'
                                    : 'bg-[#f5f6fa] text-[#8b92a9]'
                                }`}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                        {isCollapsed && badge !== undefined && badge > 0 && (
                          <span className="absolute top-0.5 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                            {badge > 9 ? '9+' : badge}
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
        <div className="p-2 border-t border-[#e8eaf0] dark:border-slate-700">
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-[#3b6ef8] to-[#7c3aed] rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  SA
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Super Admin
                  </div>
                  <div className="text-[10.5px] text-[#8b92a9]">superadmin</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2.25 py-1.75 rounded-lg text-[12.5px] font-medium text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors mt-2"
              >
                Sign out
              </button>
            </>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <div
                className="w-7 h-7 bg-gradient-to-br from-[#3b6ef8] to-[#7c3aed] rounded-lg flex items-center justify-center text-[10px] font-bold text-white cursor-pointer"
                title="Super Admin"
              >
                SA
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
