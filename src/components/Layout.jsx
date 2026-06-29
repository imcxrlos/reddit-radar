import { Outlet, Link, useLocation } from 'react-router-dom';
import { Radar, LayoutDashboard, Users } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clients', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-16 md:w-60 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 md:p-5 flex items-center justify-center md:justify-start border-b border-slate-800">
          <Radar className="w-6 h-6 text-orange-500 shrink-0" />
          <span className="hidden md:block text-base font-semibold ml-2.5 tracking-tight">LeadRadar</span>
        </div>
        <nav className="flex-1 px-2 md:px-3 py-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors justify-center md:justify-start ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <p className="hidden md:block text-xs text-slate-500 text-center">Internal Tool</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}