import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { deletePunch, listPunchesByMonth } from '@/database/repositories/punchRepo';
import { listWorkDaysMonth, upsertWorkDay } from '@/database/repositories/workDayRepo';
import { computeWorkDayFromPunches } from '@/services/calc';
import { format, formatPtMonth, parse, signedHm } from '@/utils/date';
import { ptBR } from 'date-fns/locale';
import { PunchRecord, WorkDay } from '@/types';

function shiftMonth(yyyymm: string, delta: number): string {
  const d = parse(yyyymm + '-01', 'yyyy-MM-dd', new Date());
  d.setMonth(d.getMonth() + delta);
  return format(d, 'yyyy-MM');
}

export function RecordsScreen() {
  const { user } = useAuth();
  const { shift, version, bumpVersion } = useSettings();
  const [yyyymm, setYyyymm] = useState(() => format(new Date(), 'yyyy-MM'));
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [days, setDays] = useState<WorkDay[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setPunches(await listPunchesByMonth(user.id, yyyymm));
    setDays(await listWorkDaysMonth(user.id, yyyymm));
  }, [user, yyyymm]);

  useEffect(() => { void load(); }, [load, version]);

  const grouped = useMemo(() => {
    const map = new Map<string, PunchRecord[]>();
    for (const p of punches) {
      if (!map.has(p.date)) map.set(p.date, []);
      map.get(p.date)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [punches]);

  const dayMap = useMemo(() => new Map(days.map(d => [d.date, d])), [days]);

  const onDelete = async (p: PunchRecord) => {
    if (!user || !shift) return;
    if (!confirm(`Apagar ${p.type} de ${p.time}?`)) return;
    await deletePunch(p.id);
    const wd = await computeWorkDayFromPunches(user.id, p.date, shift);
    await upsertWorkDay(wd);
    bumpVersion();
    await load();
  };

  return (
    <div className="app-shell pb-24">
      <Header
        title="Registros"
        right={
          <button
            type="button"
            aria-label="Filtrar"
            className="w-10 h-10 grid place-items-center rounded-full bg-cream hover:bg-border transition"
          >
            <SlidersHorizontal size={18} className="text-brown" />
          </button>
        }
      />
      <div className="px-5 space-y-3">
        <Card delay={0}>
          <div className="flex items-center justify-between">
            <button onClick={() => setYyyymm(shiftMonth(yyyymm, -1))} className="w-10 h-10 grid place-items-center rounded-full bg-cream hover:bg-border">
              <ChevronLeft size={18} className="text-brown" />
            </button>
            <p className="text-base font-bold text-text capitalize">{formatPtMonth(yyyymm)}</p>
            <button onClick={() => setYyyymm(shiftMonth(yyyymm, 1))} className="w-10 h-10 grid place-items-center rounded-full bg-cream hover:bg-border">
              <ChevronRight size={18} className="text-brown" />
            </button>
          </div>
        </Card>

        {grouped.length === 0 && (
          <Card delay={0.05}><p className="text-text-muted">Nenhum ponto neste mês.</p></Card>
        )}

        {grouped.map(([date, items], i) => {
          const wd = dayMap.get(date);
          const d = parse(date, 'yyyy-MM-dd', new Date());
          const dayNum = format(d, 'dd');
          const dow = format(d, 'EEE', { locale: ptBR }).replace('.', '');
          const inP = items.find(p => p.type === 'IN');
          const outP = items.find(p => p.type === 'OUT');
          const inProgress = inP && !outP;
          let pillText: string;
          let pillCls: string;
          if (inProgress) { pillText = 'Em andamento'; pillCls = 'bg-yellow/30 text-brown'; }
          else if (!wd?.closed) { pillText = '00:00'; pillCls = 'bg-border text-text-muted'; }
          else if (wd.balance_minutes === 0) { pillText = '00:00'; pillCls = 'bg-border text-text-muted'; }
          else if (wd.balance_minutes > 0) { pillText = signedHm(wd.balance_minutes); pillCls = 'bg-primary/10 text-primary'; }
          else { pillText = signedHm(wd.balance_minutes); pillCls = 'bg-accent/10 text-accent'; }

          const isOpen = open === date;

          return (
            <Card key={date} delay={Math.min(0.4, 0.04 * (i + 1))}>
              <button onClick={() => setOpen(isOpen ? null : date)} className="w-full text-left">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[40px]">
                    <p className="text-2xl font-bold text-text leading-none">{dayNum}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{dow}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-text-muted">Entrada</p>
                      <p className="font-semibold text-text text-sm">{inP?.time ?? '--:--'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Saída</p>
                      <p className="font-semibold text-text text-sm">{outP?.time ?? '--:--'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${pillCls}`}>{pillText}</span>
                </div>
              </button>

              {isOpen && (
                <ul className="mt-4 pt-4 border-t border-border space-y-2">
                  {items.map(p => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">{p.type}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-text">{p.time}</span>
                        <button onClick={(e) => { e.stopPropagation(); void onDelete(p); }} className="w-7 h-7 grid place-items-center rounded-full hover:bg-accent/10 text-accent">
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
