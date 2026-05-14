import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TabsLayout } from '@/navigation/TabsLayout';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { RecordsScreen } from '@/screens/RecordsScreen';
import { PunchScreen } from '@/screens/PunchScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { ShiftConfigScreen } from '@/screens/ShiftConfigScreen';
import { BalanceScreen } from '@/screens/BalanceScreen';
import { OvertimeUsageScreen } from '@/screens/OvertimeUsageScreen';
import { ScheduleOvertimeScreen } from '@/screens/ScheduleOvertimeScreen';
import { MyUsagesScreen } from '@/screens/MyUsagesScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { SplashScreen } from '@/screens/SplashScreen';

function InitErrorScreen({ error }: { error: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const { SCHEMA_PG_STATEMENTS } = await import('@/database/schemaPg');
    const sql = SCHEMA_PG_STATEMENTS.map(s => s.trim() + ';').join('\n\n');
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o SQL abaixo:', sql);
    }
  };
  return (
    <div className="app-shell min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <div className="max-w-lg w-full bg-surface border-2 border-accent/40 rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-bold text-accent mb-2">Falha ao conectar ao banco</h1>
        <p className="text-sm text-text mb-3 break-words">{error}</p>
        <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside mb-4">
          <li>Clique em <strong>Copiar SQL do schema</strong> abaixo.</li>
          <li>Abra o <strong>SQL Editor do Neon</strong> logado como owner do banco.</li>
          <li>Cole e execute o SQL.</li>
          <li>Recarregue esta página.</li>
        </ol>
        <p className="text-xs text-text-muted mb-3">
          Alternativa: como owner, conceda permissão à role atual:<br/>
          <code className="text-[10px] bg-cream px-1 py-0.5 rounded">GRANT USAGE, CREATE ON SCHEMA public TO &lt;sua_role&gt;;</code>
        </p>
        <button
          onClick={() => void onCopy()}
          className="w-full h-11 rounded-2xl bg-primary text-cream font-semibold hover:bg-primary-dark transition"
        >
          {copied ? '✓ SQL copiado' : 'Copiar SQL do schema'}
        </button>
      </div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready, initError } = useAuth();
  if (!ready) return <SplashScreen />;
  if (initError) return <InitErrorScreen error={initError} />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, ready, initError } = useAuth();
  if (!ready) return <SplashScreen />;
  if (initError) return <InitErrorScreen error={initError} />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          <Route path="/login" element={<PublicOnly><LoginScreen /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterScreen /></PublicOnly>} />
          <Route path="/recuperar-senha" element={<PublicOnly><ForgotPasswordScreen /></PublicOnly>} />

          <Route element={<Protected><TabsLayout /></Protected>}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/registros" element={<RecordsScreen />} />
            <Route path="/registrar" element={<PunchScreen />} />
            <Route path="/relatorios" element={<ReportsScreen />} />
            <Route path="/mais" element={<MoreScreen />} />
          </Route>

          <Route path="/turno" element={<Protected><ShiftConfigScreen /></Protected>} />
          <Route path="/saldo" element={<Protected><BalanceScreen /></Protected>} />
          <Route path="/usar-banco" element={<Protected><OvertimeUsageScreen /></Protected>} />
          <Route path="/agendar" element={<Protected><ScheduleOvertimeScreen /></Protected>} />
          <Route path="/meus-usos" element={<Protected><MyUsagesScreen /></Protected>} />
          <Route path="/notificacoes" element={<Protected><NotificationsScreen /></Protected>} />
          <Route path="/perfil" element={<Protected><ProfileScreen /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  );
}
