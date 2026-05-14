import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { listPunchesByDate } from '@/database/repositories/punchRepo';
import { listWorkDaysMonth, sumBalanceAll, upsertWorkDay } from '@/database/repositories/workDayRepo';
import { sumUsedMinutes, sumScheduledMinutes, listUsagesByMonth } from '@/database/repositories/overtimeRepo';
import { computeWorkDayFromPunches, validateNextPunch } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { format, hmToMinutes, minutesToHm, nowHm, signedHm, today, ym } from '@/utils/date';
import { ptBR } from 'date-fns/locale';
import { PunchRecord, PunchType } from '@/types';

const NEXT_LABEL: Record<PunchType, string> = {
  IN: 'Registrar entrada',
  LUNCH_OUT: 'Registrar saída almoço',
  LUNCH_IN: 'Registrar volta almoço',
  OUT: 'Registrar saída',
};

function ptDayHeader(d: Date): string {
  return format(d, "EEEE',' dd 'de' MMMM", { locale: ptBR });
}

function elapsedFrom(timeHm: string): string {
  const start = hmToMinutes(timeHm);
  const now = hmToMinutes(nowHm());
  const diff = Math.max(0, now - start);
  return minutesToHm(diff);
}

export function DashboardScreen() {
  const { user } = useAuth();
  const { shift, version } = useSettings();
  const nav = useNavigate();
  const [todayPunches, setTodayPunches] = useState<PunchRecord[]>([]);
  const [stats, setStats] = useState({ positive: 0, negative: 0, monthBalance: 0, available: 0 });
  const [chart, setChart] = useState<{ label: string; value: number }[]>([]);

  const load = useCallback(async () => {
    if (!user || !shift) return;
    const t = today();
    const punches = await listPunchesByDate(user.id, t);
    setTodayPunches(punches);

    const wd = await computeWorkDayFromPunches(user.id, t, shift);
    if (wd.closed) await upsertWorkDay(wd);

    const net = await sumBalanceAll(user.id);
    const used = await sumUsedMinutes(user.id);
    const scheduled = await sumScheduledMinutes(user.id);
    const days = await listWorkDaysMonth(user.id, ym());
    let pos = 0, neg = 0, monthBal = 0;
    for (const d of days) {
      if (d.balance_minutes > 0) pos += d.balance_minutes;
      else if (d.balance_minutes < 0) neg += -d.balance_minutes;
      monthBal += d.balance_minutes;
    }
    setStats({ positive: pos, negative: neg, monthBalance: monthBal, available: net - used - scheduled });

    const usages = await listUsagesByMonth(user.id, ym());
    const usageMap = new Map<string, number>();
    for (const u of usages) usageMap.set(u.date, (usageMap.get(u.date) ?? 0) + u.minutes);

    const map = new Map(days.map(d => [d.date, d]));
    const cur = new Date();
    const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const data: { label: string; value: number; usageMinutes?: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = format(new Date(cur.getFullYear(), cur.getMonth(), day), 'yyyy-MM-dd');
      const wd = map.get(dStr);
      data.push({ label: String(day), value: wd?.balance_minutes ?? 0, usageMinutes: usageMap.get(dStr) });
    }
    setChart(data);
  }, [user, shift]);

  useEffect(() => { void load(); }, [load, version]);

  const rules = user ? rulesFor(user.contract_type) : null;
  const lunchOn = rules?.lunchRequired ?? true;
  const sequence: PunchType[] = lunchOn ? ['IN','LUNCH_OUT','LUNCH_IN','OUT'] : ['IN','OUT'];
  const nextType = sequence.find(t => validateNextPunch(todayPunches, t).ok) ?? null;
  const inPunch = todayPunches.find(p => p.type === 'IN');
  const dayHeader = ptDayHeader(new Date());

  return (
    <div className="px-0 pt-2">
      <div className="flex items-start justify-between px-5 pt-6 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-text leading-tight">Olá, {user?.name.split(' ')[0]}!</h1>
          <p className="text-sm text-text-muted mt-1 capitalize">{dayHeader}</p>
        </div>
        <button onClick={() => nav('/notificacoes')} className="w-11 h-11 grid place-items-center rounded-full bg-cream hover:bg-border transition shrink-0">
          <Bell size={20} className="text-brown" />
        </button>
      </div>

      <div className="px-5 flex flex-col gap-4">
        <Card delay={0} className="bg-cream">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brown/80">Saldo de horas</p>
              <p className={`mt-1 leading-none ${stats.monthBalance >= 0 ? 'text-primary' : 'text-accent'}`}>
                <span className="text-4xl font-bold tracking-tight">{signedHm(stats.monthBalance)}</span>
                <span className="text-sm font-medium text-text-muted ml-1.5">horas</span>
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/15 grid place-items-center shrink-0">
              <Clock size={28} className="text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-yellow/40">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Horas positivas</p>
              <p className="text-base font-bold text-primary mt-1">{minutesToHm(stats.positive)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Horas negativas</p>
              <p className="text-base font-bold text-accent mt-1">-{minutesToHm(stats.negative)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Saldo do mês</p>
              <p className={`text-base font-bold mt-1 ${stats.monthBalance >= 0 ? 'text-primary' : 'text-accent'}`}>{signedHm(stats.monthBalance)}</p>
            </div>
          </div>
        </Card>

        <Card delay={0.15}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-text">Hoje</p>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${inPunch && !todayPunches.find(p => p.type === 'OUT') ? 'bg-primary/10 text-primary' : 'bg-border text-text-muted'}`}>
              {inPunch && !todayPunches.find(p => p.type === 'OUT') ? 'Em andamento' : 'Encerrado'}
            </span>
          </div>
          {inPunch ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted">Entrada</p>
                <p className="text-3xl font-bold text-text leading-none mt-1">{inPunch.time}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Desde {inPunch.time}</p>
                <p className="text-3xl font-bold text-text leading-none mt-1">{elapsedFrom(inPunch.time)}</p>
              </div>
              <p className="col-span-2 text-xs text-text-muted text-center mt-2">Turno: {shift?.entry_time} às {shift?.exit_time}</p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhum ponto registrado hoje.</p>
          )}
          <Button full className="mt-4" onClick={() => nav('/registrar')} disabled={!nextType}>
            {nextType ? NEXT_LABEL[nextType] : 'Dia concluído'}
          </Button>
        </Card>

        <Card delay={0.2}>
          <SectionLabel right={
            <button onClick={() => nav('/relatorios')} className="text-xs text-primary font-semibold flex items-center gap-0.5">
              Ver detalhes <ChevronRight size={14} />
            </button>
          }>
            Resumo do mês
          </SectionLabel>
          <BarChart data={chart} height={140} />
        </Card>

      </div>
    </div>
  );
}
