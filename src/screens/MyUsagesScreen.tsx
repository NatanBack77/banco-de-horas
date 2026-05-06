import { useCallback, useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cancelUsage, listUsages, sumScheduledMinutes, sumUsedMinutes } from '@/database/repositories/overtimeRepo';
import { listWorkDaysMonth } from '@/database/repositories/workDayRepo';
import { computeBalance } from '@/services/calc';
import { format, formatPtDate, minutesToHm, signedHm } from '@/utils/date';
import { OvertimeUsage } from '@/types';

type Tab = 'summary' | 'detail';

const STATUS_LABEL: Record<OvertimeUsage['status'], string> = {
  USED: 'Usado',
  SCHEDULED: 'Agendado',
  CANCELED: 'Cancelado',
};

const STATUS_CLS: Record<OvertimeUsage['status'], string> = {
  USED: 'bg-primary/10 text-primary',
  SCHEDULED: 'bg-yellow/30 text-brown',
  CANCELED: 'bg-border text-text-muted',
};

export function MyUsagesScreen() {
  const { user } = useAuth();
  const { version, bumpVersion } = useSettings();
  const [tab, setTab] = useState<Tab>('summary');
  const [items, setItems] = useState<OvertimeUsage[]>([]);
  const [stats, setStats] = useState({ available: 0, used: 0, scheduled: 0, after: 0 });

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await listUsages(user.id));
    const days = await listWorkDaysMonth(user.id, format(new Date(), 'yyyy-MM'));
    const used = await sumUsedMinutes(user.id);
    const scheduled = await sumScheduledMinutes(user.id);
    const b = computeBalance(days, used, scheduled);
    setStats({ available: b.available + scheduled, used, scheduled, after: b.available });
  }, [user]);

  useEffect(() => { void load(); }, [load, version]);

  const onCancel = async (id: number) => {
    if (!confirm('Cancelar este uso?')) return;
    await cancelUsage(id);
    bumpVersion();
    await load();
  };

  return (
    <div className="app-shell pb-24">
      <Header title="Minhas utilizações" back />
      <div className="px-5 space-y-3">
        <Card delay={0}>
          <div className="flex gap-2 bg-cream rounded-2xl p-1">
            {([['summary','Resumo'], ['detail','Detalhado']] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${tab === k ? 'bg-primary text-cream shadow-sm' : 'text-brown'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {tab === 'summary' ? (
          <>
            <Card delay={0.05}>
              <ul className="divide-y divide-border">
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm text-text">Saldo disponível</span>
                  <span className={`font-bold ${stats.available >= 0 ? 'text-primary' : 'text-accent'}`}>{signedHm(stats.available)} <span className="text-xs font-medium text-text-muted">horas</span></span>
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm text-text">Utilizado</span>
                  <span className="font-bold text-text">{minutesToHm(stats.used)} <span className="text-xs font-medium text-text-muted">horas</span></span>
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm text-text">Agendado</span>
                  <span className="font-bold text-text">{minutesToHm(stats.scheduled)} <span className="text-xs font-medium text-text-muted">horas</span></span>
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm text-text">Saldo após agendamentos</span>
                  <span className={`font-bold ${stats.after >= 0 ? 'text-primary' : 'text-accent'}`}>{signedHm(stats.after)} <span className="text-xs font-medium text-text-muted">horas</span></span>
                </li>
              </ul>
            </Card>

            <Card delay={0.1} noAnimate className="bg-yellow/20 border-yellow/40">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-brown shrink-0 mt-0.5" />
                <p className="text-xs text-brown">As horas agendadas serão descontadas do seu saldo na data de utilização.</p>
              </div>
            </Card>
          </>
        ) : (
          <>
            {items.length === 0 && <Card delay={0.05}><p className="text-text-muted">Nenhum uso registrado.</p></Card>}
            {items.map((u, i) => (
              <Card key={u.id} delay={Math.min(0.4, 0.04 * (i + 1))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm capitalize text-text font-semibold">{formatPtDate(u.date)}</p>
                    <p className="text-text-muted text-xs mt-0.5">{u.reason || 'Sem motivo'}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[u.status]}`}>
                      {STATUS_LABEL[u.status]}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text">{minutesToHm(u.minutes)}</p>
                    {u.status !== 'CANCELED' && (
                      <button onClick={() => onCancel(u.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                        <X size={12} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
