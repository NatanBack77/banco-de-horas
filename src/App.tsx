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
import { SplashScreen } from '@/screens/SplashScreen';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <SplashScreen />;
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
