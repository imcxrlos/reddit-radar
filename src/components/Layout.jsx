import { Outlet, Link, useLocation } from 'react-router-dom';
import { Radar, LayoutDashboard, Users } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clients', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-[hsl(220,14%,98%)]">
      <aside className="w-16 md:w-64 bg-card flex flex-col shrink-0 border-r border-border">
        <div className="px-4 md:px-5 py-5 flex items-center justify-center md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Radar className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="hidden md:block text-[15px] font-semibold tracking-tight text-foreground">LeadRadar</span>
          </div>
        </div>
        <nav className="flex-1 px-2 md:px-3 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium mb-0.5 transition-all justify-center md:justify-start ${
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}