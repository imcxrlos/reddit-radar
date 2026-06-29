import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <main className="min-h-screen bg-[hsl(220,14%,98%)]">
      <Outlet />
    </main>
  );
}