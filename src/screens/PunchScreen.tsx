import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, Check, X, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { addPunch, listPunchesByDate } from '@/database/repositories/punchRepo';
import { upsertWorkDay } from '@/database/repositories/workDayRepo';
import { computeWorkDayFromPunches, validateNextPunch } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { today, nowHm } from '@/utils/date';
import { PunchRecord, PunchType } from '@/types';

const FULL_LABEL: Record<PunchType, string> = {
  IN: 'Entrada',
  LUNCH_OUT: 'Saída almoço',
  LUNCH_IN: 'Retorno',
  OUT: 'Saída',
};

const ENTRY_DESC: Record<'IN' | 'LUNCH_IN', string> = {
  IN: 'Registrar entrada no trabalho',
  LUNCH_IN: 'Registrar volta do almoço',
};

const EXIT_DESC: Record<'LUNCH_OUT' | 'OUT', string> = {
  LUNCH_OUT: 'Registrar saída para almoço',
  OUT: 'Registrar saída do trabalho',
};

const isEntry = (t: PunchType) => t === 'IN' || t === 'LUNCH_IN';

export function PunchScreen() {
  const { user } = useAuth();
  const { shift, bumpVersion } = useSettings();
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [busy, setBusy] = useState<PunchType | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const t = today();
  const load = useCallback(async () => {
    if (!user) return;
    setPunches(await listPunchesByDate(user.id, t));
  }, [user, t]);
  useEffect(() => { void load(); }, [load]);

  const rules = user ? rulesFor(user.contract_type) : null;
  const lunchOn = rules?.lunchRequired ?? true;
  const sequence: PunchType[] = lunchOn ? ['IN','LUNCH_OUT','LUNCH_IN','OUT'] : ['IN','OUT'];
  const nextType = sequence.find(t => validateNextPunch(punches, t).ok) ?? null;

  const onPunch = async (type: PunchType) => {
    if (!user || !shift) return;
    setMsg(null);
    const v = validateNextPunch(punches, type);
    if (!v.ok) { setMsg({ kind: 'err', text: v.reason ?? 'Não permitido' }); return; }
    try {
      setBusy(type);
      await addPunch({ user_id: user.id, type, date: t, time: nowHm() });
      const wd = await computeWorkDayFromPunches(user.id, t, shift);
      await upsertWorkDay(wd);
      await load();
      bumpVersion();
      setMsg({ kind: 'ok', text: `${FULL_LABEL[type]} registrada às ${nowHm()}` });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message ?? 'Falha ao registrar' });
    } finally {
      setBusy(null);
    }
  };

  // Decide qual ação cada cartão dispara baseado no próximo punch
  const entryAction: 'IN' | 'LUNCH_IN' | null =
    nextType === 'IN' ? 'IN' : nextType === 'LUNCH_IN' ? 'LUNCH_IN' : null;
  const exitAction: 'LUNCH_OUT' | 'OUT' | null =
    nextType === 'LUNCH_OUT' ? 'LUNCH_OUT' : nextType === 'OUT' ? 'OUT' : null;

  const entryLabel = entryAction ? FULL_LABEL[entryAction] : 'Entrada';
  const exitLabel = exitAction ? FULL_LABEL[exitAction] : 'Saída';
  const entryDesc = entryAction ? ENTRY_DESC[entryAction] : 'Entrada já registrada';
  const exitDesc = exitAction ? EXIT_DESC[exitAction] : 'Saída já registrada';

  return (
    <div className="app-shell pb-24">
      <Header title="Registrar ponto" subtitle="Selecione o tipo de registro" back />
      <div className="px-5 space-y-3">
        {msg && (
          <Card delay={0} noAnimate className={msg.kind === 'ok' ? 'bg-primary/10 border-primary/30' : 'bg-accent/10 border-accent/30'}>
            <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-primary' : 'text-accent'}`}>{msg.text}</p>
          </Card>
        )}

        <button
          disabled={!entryAction || busy != null}
          onClick={() => entryAction && onPunch(entryAction)}
          className="w-full text-left disabled:opacity-50"
        >
          <Card delay={0.05} className="hover:bg-cream/40 transition">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary grid place-items-center shrink-0">
                <LogIn size={26} className="text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text text-lg">{entryLabel}</p>
                <p className="text-xs text-text-muted">{entryDesc}</p>
              </div>
              <ChevronRight size={20} className="text-text-muted shrink-0" />
            </div>
          </Card>
        </button>

        <button
          disabled={!exitAction || busy != null}
          onClick={() => exitAction && onPunch(exitAction)}
          className="w-full text-left disabled:opacity-50"
        >
          <Card delay={0.1} className="hover:bg-cream/40 transition">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent grid place-items-center shrink-0">
                <LogOut size={26} className="text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text text-lg">{exitLabel}</p>
                <p className="text-xs text-text-muted">{exitDesc}</p>
              </div>
              <ChevronRight size={20} className="text-text-muted shrink-0" />
            </div>
          </Card>
        </button>

        {punches.length > 0 && (
          <Card delay={0.18}>
            <SectionLabel>Histórico de hoje</SectionLabel>
            <ul className="space-y-3">
              {punches.map(p => {
                const entry = isEntry(p.type);
                return (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full grid place-items-center ${entry ? 'bg-primary' : 'bg-accent'}`}>
                        {entry
                          ? <Check size={14} className="text-cream" strokeWidth={3} />
                          : <X size={14} className="text-cream" strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-text font-medium">{FULL_LABEL[p.type]}</span>
                    </span>
                    <span className="font-bold text-text">{p.time}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
