import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ListChecks, Plus, BarChart3, MoreHorizontal } from 'lucide-react';

interface Tab {
  to: string;
  label: string;
  Icon: typeof Home;
}

const TABS: Tab[] = [
  { to: '/', label: 'Início', Icon: Home },
  { to: '/registros', label: 'Registros', Icon: ListChecks },
  { to: '/relatorios', label: 'Relatórios', Icon: BarChart3 },
  { to: '/mais', label: 'Mais', Icon: MoreHorizontal },
];

export function TabsLayout() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen pb-24 app-shell bg-bg">
      <div className="pb-6">
        <Outlet />
      </div>

      {/* Bottom tabs + FAB */}
      <nav className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="app-shell relative">
          <div className="pointer-events-auto mx-3 mb-3 bg-surface border border-border rounded-3xl shadow-[var(--shadow-card)] px-2 py-2 flex items-center justify-around">
            {TABS.slice(0, 2).map((t) => <TabBtn key={t.to} {...t} />)}
            <div className="w-16" />
            {TABS.slice(2).map((t) => <TabBtn key={t.to} {...t} />)}
          </div>

          <button
            onClick={() => nav('/registrar')}
            aria-label="Registrar ponto"
            className="
              pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-3
              w-16 h-16 rounded-full bg-primary text-cream grid place-items-center
              shadow-[0_8px_22px_-6px_rgba(0,137,67,0.5)]
              hover:bg-primary-dark active:scale-95 transition
            "
          >
            <Plus size={30} strokeWidth={2.5} />
          </button>
        </div>
      </nav>
    </div>
  );
}

function TabBtn({ to, label, Icon }: Tab) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition ${
          isActive ? 'text-primary' : 'text-text-muted hover:text-brown'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">{label}</span>
        </>
      )}
    </NavLink>
  );
}
