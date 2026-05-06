import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';

const items = [
  { to: '/turno', label: 'Turno' },
  { to: '/saldo', label: 'Saldo' },
  { to: '/usar-banco', label: 'Usar banco' },
  { to: '/agendar', label: 'Agendar uso' },
  { to: '/meus-usos', label: 'Meus usos' },
  { to: '/notificacoes', label: 'Notificações' },
  { to: '/perfil', label: 'Perfil' },
];

export function MoreScreen() {
  const { logout } = useAuth();
  return (
    <div className="app-shell pb-24">
      <Header title="Mais" />
      <div className="px-5 space-y-3">
        {items.map((it, i) => (
          <Card key={it.to} delay={0.04 * i}>
            <Link to={it.to} className="block text-text font-medium">{it.label}</Link>
          </Card>
        ))}
        <Card delay={0.04 * items.length}>
          <button onClick={logout} className="text-danger font-medium">Sair</button>
        </Card>
      </div>
    </div>
  );
}
