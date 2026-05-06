import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { BarChart } from '@/components/BarChart';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { listWorkDaysMonth } from '@/database/repositories/workDayRepo';
import { format, formatPtMonth, minutesToHm, parse, signedHm } from '@/utils/date';
import { WorkDay } from '@/types';

type Tab = 'summary' | 'detail';


export function ReportsScreen() {
  const { user } = useAuth();
  const { version } = useSettings();
  const [tab, setTab] = useState<Tab>('summary');
  const [yyyymm, setYyyymm] = useState(() => format(new Date(), 'yyyy-MM'));
  const [days, setDays] = useState<WorkDay[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setDays(await listWorkDaysMonth(user.id, yyyymm));
  }, [user, yyyymm]);

  useEffect(() => { void load(); }, [load, version]);

  const totals = useMemo(() => {
    let pos = 0, neg = 0, balance = 0, worked = 0, expected = 0;
    for (const d of days) {
      if (d.balance_minutes > 0) pos += d.balance_minutes;
      else if (d.balance_minutes < 0) neg += -d.balance_minutes;
      balance += d.balance_minutes;
      worked += d.worked_minutes;
      expected += d.expected_minutes;
    }
    return { pos, neg, balance, worked, expected };
  }, [days]);

  const chart = useMemo(() => {
    const map = new Map(days.map(d => [d.date, d]));
    const ref = parse(yyyymm + '-01', 'yyyy-MM-dd', new Date());
    const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const out: { label: string; value: number }[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const dStr = format(new Date(ref.getFullYear(), ref.getMonth(), day), 'yyyy-MM-dd');
      const wd = map.get(dStr);
      out.push({ label: [1,15,22,lastDay].includes(day) ? String(day) : '', value: wd?.balance_minutes ?? 0 });
    }
    return out;
  }, [days, yyyymm]);

  return (
    <div className="app-shell pb-24">
      <Header title="Relatórios" />
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

        <Card delay={0.05} className="!p-0 overflow-hidden">
          <label className="relative flex items-center justify-between gap-3 px-5 py-4 cursor-pointer">
            <span className="text-base font-bold text-text capitalize">{formatPtMonth(yyyymm)}</span>
            <ChevronDown size={20} className="text-brown" />
            <input
              type="month"
              value={yyyymm}
              onChange={(e) => e.target.value && setYyyymm(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Selecionar mês"
            />
          </label>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card delay={0.1} className="bg-cream">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Saldo do mês</p>
            <p className={`text-base font-bold mt-1 ${totals.balance >= 0 ? 'text-primary' : 'text-accent'}`}>{signedHm(totals.balance)}</p>
            <p className="text-[10px] text-text-muted">horas</p>
          </Card>
          <Card delay={0.13} className="bg-cream">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Horas positivas</p>
            <p className="text-base font-bold text-primary mt-1">{minutesToHm(totals.pos)}</p>
          </Card>
          <Card delay={0.16} className="bg-cream">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Horas negativas</p>
            <p className="text-base font-bold text-accent mt-1">-{minutesToHm(totals.neg)}</p>
          </Card>
        </div>

        {tab === 'summary' ? (
          <Card delay={0.2}>
            <SectionLabel>Gráfico de horas</SectionLabel>
            <BarChart data={chart} height={180} />
          </Card>
        ) : (
          <Card delay={0.2}>
            <SectionLabel>Detalhado</SectionLabel>
            <ul className="divide-y divide-border">
              {days.length === 0 && <li className="py-3 text-sm text-text-muted">Sem dados.</li>}
              {days.map(d => (
                <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-text">{d.date.slice(8)}/{d.date.slice(5,7)}</span>
                  <span className="text-text-muted">{minutesToHm(d.worked_minutes)} / {minutesToHm(d.expected_minutes)}</span>
                  <span className={`font-bold ${d.balance_minutes >= 0 ? 'text-primary' : 'text-accent'}`}>{signedHm(d.balance_minutes)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
