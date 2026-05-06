import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Lock } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DonutChart } from '@/components/DonutChart';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { listWorkDaysMonth } from '@/database/repositories/workDayRepo';
import { sumScheduledMinutes, sumUsedMinutes } from '@/database/repositories/overtimeRepo';
import { computeBalance, OvertimeBalance } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { format, minutesToHm, signedHm } from '@/utils/date';

export function BalanceScreen() {
  const { user } = useAuth();
  const { version } = useSettings();
  const nav = useNavigate();
  const [bal, setBal] = useState<OvertimeBalance>({ positive: 0, negative: 0, net: 0, used: 0, scheduled: 0, available: 0 });

  const load = useCallback(async () => {
    if (!user) return;
    const days = await listWorkDaysMonth(user.id, format(new Date(), 'yyyy-MM'));
    const used = await sumUsedMinutes(user.id);
    const scheduled = await sumScheduledMinutes(user.id);
    setBal(computeBalance(days, used, scheduled));
  }, [user]);

  useEffect(() => { void load(); }, [load, version]);

  const otAllowed = user ? rulesFor(user.contract_type).allowOvertime(user) : true;
  const positiveBalance = bal.net >= 0;

  return (
    <div className="app-shell pb-24">
      <Header title="Saldo de horas" back />
      <div className="px-5 space-y-4">
        <Card delay={0}>
          <div className="flex justify-center py-3">
            <DonutChart
              size={220} thickness={20}
              slices={[
                { value: bal.positive, color: '#008943' },
                { value: bal.negative, color: '#F15A29' },
              ]}
            >
              <div className="text-center">
                <p className={`text-3xl font-bold tracking-tight ${positiveBalance ? 'text-primary' : 'text-accent'}`}>
                  {signedHm(bal.net)}
                </p>
                <p className="text-xs text-text-muted mt-0.5">horas</p>
              </div>
            </DonutChart>
          </div>

          <ul className="space-y-3 pt-2 border-t border-border mt-4">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-text">Horas positivas</span>
              </span>
              <span className="font-bold text-primary">{minutesToHm(bal.positive)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm text-text">Horas negativas</span>
              </span>
              <span className="font-bold text-accent">-{minutesToHm(bal.negative)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-brown" />
                <span className="text-sm text-text">Saldo atual</span>
              </span>
              <span className={`font-bold ${positiveBalance ? 'text-primary' : 'text-accent'}`}>{signedHm(bal.net)}</span>
            </li>
          </ul>
        </Card>

        <Card delay={0.05} noAnimate className="bg-yellow/20 border-yellow/40">
          <div className="flex items-start gap-3">
            <Star size={20} className="text-yellow shrink-0 mt-0.5 fill-yellow" />
            <p className="text-sm text-brown font-medium">
              {positiveBalance ? 'Parabéns! Você está com saldo positivo.' : 'Atenção: você está com saldo negativo.'}
            </p>
          </div>
        </Card>

        {!otAllowed && (
          <Card delay={0.1} noAnimate className="bg-cream border-border">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-brown shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-text text-sm">Hora extra bloqueada</p>
                <p className="text-xs text-text-muted">Jovem aprendiz sem permissão de hora extra.</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => nav('/usar-banco')} disabled={!otAllowed}>Usar banco</Button>
          <Button variant="secondary" onClick={() => nav('/agendar')} disabled={!otAllowed}>Agendar</Button>
        </div>
      </div>
    </div>
  );
}
