import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, SlidersHorizontal, Pencil, Save, X, TrendingDown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { deletePunch, listPunchesByMonth, updatePunch } from '@/database/repositories/punchRepo';
import { listWorkDaysMonth, upsertWorkDay } from '@/database/repositories/workDayRepo';
import { listUsagesByMonth } from '@/database/repositories/overtimeRepo';
import { computeWorkDayFromPunches } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { format, formatPtMonth, minutesToHm, parse, signedHm } from '@/utils/date';
import { ptBR } from 'date-fns/locale';
import { OvertimeUsage, PunchRecord, PunchType, WorkDay } from '@/types';

const PUNCH_LABELS: Record<PunchType, string> = {
  IN: 'Entrada',
  LUNCH_OUT: 'Saída almoço',
  LUNCH_IN: 'Retorno',
  OUT: 'Saída',
};

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
  const [usages, setUsages] = useState<OvertimeUsage[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [hiddenAuto, setHiddenAuto] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<PunchType>('IN');

  const lunchOn = user ? rulesFor(user.contract_type).lunchRequired : true;
  const allowedPunchTypes: PunchType[] = lunchOn
    ? ['IN', 'LUNCH_OUT', 'LUNCH_IN', 'OUT']
    : ['IN', 'OUT'];

  const load = useCallback(async () => {
    if (!user) return;
    const [p, d, u] = await Promise.all([
      listPunchesByMonth(user.id, yyyymm),
      listWorkDaysMonth(user.id, yyyymm),
      listUsagesByMonth(user.id, yyyymm),
    ]);
    setPunches(p);
    setDays(d);
    setUsages(u);
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
  const usageMap = useMemo(() => {
    const m = new Map<string, OvertimeUsage[]>();
    for (const u of usages) {
      if (!m.has(u.date)) m.set(u.date, []);
      m.get(u.date)!.push(u);
    }
    return m;
  }, [usages]);

  const onDelete = async (p: PunchRecord) => {
    if (!user || !shift) return;
    if (!confirm(`Apagar ${p.type} de ${p.time}?`)) return;
    await deletePunch(p.id);
    const wd = await computeWorkDayFromPunches(user.id, p.date, shift);
    await upsertWorkDay(wd);
    bumpVersion();
    await load();
  };

  const startEdit = (p: PunchRecord) => {
    setEditingId(p.id);
    setEditTime(p.time);
    setEditType(p.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTime('');
  };

  const saveEdit = async (p: PunchRecord) => {
    if (!user || !shift) return;
    if (!/^\d{2}:\d{2}$/.test(editTime)) { alert('Horário inválido (HH:mm)'); return; }
    await updatePunch(p.id, { time: editTime, type: editType });
    const wd = await computeWorkDayFromPunches(user.id, p.date, shift);
    await upsertWorkDay(wd);
    cancelEdit();
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
          const dayUsages = usageMap.get(date) ?? [];
          const totalUsed = dayUsages.reduce((s, u) => s + u.minutes, 0);
          const autoUsage = dayUsages.find(u => u.source === 'AUTO');
          const manualUsages = dayUsages.filter(u => u.source !== 'AUTO');
          const remainingShortfall = autoUsage && wd && wd.balance_minutes < 0 ? -wd.balance_minutes : 0;
          const autoCardHidden = hiddenAuto.has(date);
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    {totalUsed > 0 && (
                      <span className="w-2 h-2 rounded-full bg-brown" title="Banco de horas utilizado" />
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pillCls}`}>{pillText}</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <ul className="space-y-2">
                    {items.map(p => {
                      const editing = editingId === p.id;
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          {editing ? (
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as PunchType)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 px-2 bg-cream border border-border rounded-lg text-xs font-semibold text-text outline-none focus:border-primary"
                            >
                              {allowedPunchTypes.map(t => (
                                <option key={t} value={t}>{PUNCH_LABELS[t]}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-text-muted shrink-0 text-xs">{PUNCH_LABELS[p.type]}</span>
                          )}
                          <span className="flex items-center gap-2">
                            {editing ? (
                              <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 px-2 h-8 bg-cream border border-border rounded-lg text-sm font-semibold text-text outline-none focus:border-primary"
                              />
                            ) : (
                              <span className="font-semibold text-text">{p.time}</span>
                            )}
                            {editing ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); void saveEdit(p); }} className="w-7 h-7 grid place-items-center rounded-full hover:bg-primary/10 text-primary" aria-label="Salvar">
                                  <Save size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="w-7 h-7 grid place-items-center rounded-full hover:bg-border text-text-muted" aria-label="Cancelar">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="w-7 h-7 grid place-items-center rounded-full hover:bg-primary/10 text-primary" aria-label="Editar">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); void onDelete(p); }} className="w-7 h-7 grid place-items-center rounded-full hover:bg-accent/10 text-accent" aria-label="Apagar">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {dayUsages.length > 0 && (
                    <div className="pt-3 border-t border-border space-y-2">
                      {manualUsages.length > 0 && (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Banco de horas</p>
                          {manualUsages.map(u => (
                            <div key={u.id} className="flex items-start justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brown shrink-0 mt-0.5" />
                                  <span className="text-text font-medium">-{minutesToHm(u.minutes)}</span>
                                  <span className="text-text-muted">(manual)</span>
                                </div>
                                {u.reason && <p className="text-text-muted pl-3 mt-0.5">{u.reason}</p>}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {autoUsage && (
                        <div className="rounded-xl bg-yellow/20 border border-yellow/40 p-3">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHiddenAuto(prev => {
                                const n = new Set(prev);
                                n.has(date) ? n.delete(date) : n.add(date);
                                return n;
                              });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <TrendingDown size={15} className="text-brown shrink-0" />
                              <p className="text-xs font-bold text-brown">Banco utilizado automaticamente</p>
                            </div>
                            {autoCardHidden
                              ? <ChevronDown size={15} className="text-brown" />
                              : <ChevronUp size={15} className="text-brown" />}
                          </button>

                          {!autoCardHidden && (
                            <ul className="space-y-2 text-xs mt-3">
                              <li className="flex justify-between">
                                <span className="text-text-muted">Saída prevista</span>
                                <span className="font-semibold text-text">{shift?.exit_time ?? '--:--'}</span>
                              </li>
                              <li className="flex justify-between">
                                <span className="text-text-muted">Saída realizada</span>
                                <span className="font-semibold text-text">{outP?.time ?? '--:--'}</span>
                              </li>
                              <li className="flex justify-between border-t border-yellow/40 pt-2">
                                <span className="text-text-muted">Tempo utilizado do banco</span>
                                <span className="font-bold text-accent">-{minutesToHm(autoUsage.minutes)}</span>
                              </li>
                              {remainingShortfall > 0 && (
                                <li className="flex justify-between">
                                  <span className="text-text-muted">Déficit não coberto</span>
                                  <span className="font-bold text-accent">-{minutesToHm(remainingShortfall)}</span>
                                </li>
                              )}
                              {autoUsage.reason && autoUsage.reason !== 'Saída antecipada automática' && (
                                <li className="flex justify-between gap-3">
                                  <span className="text-text-muted shrink-0">Motivo</span>
                                  <span className="font-semibold text-text text-right">{autoUsage.reason}</span>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      )}

                      {totalUsed > 0 && (
                        <p className="text-xs text-brown font-semibold pt-1">Total utilizado: -{minutesToHm(totalUsed)}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
