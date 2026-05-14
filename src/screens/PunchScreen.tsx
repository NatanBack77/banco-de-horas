import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, Check, X, ChevronRight, Clock, Calendar, TrendingDown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { addPunch, listPunchesByDate } from '@/database/repositories/punchRepo';
import { upsertWorkDay } from '@/database/repositories/workDayRepo';
import { updateUsage } from '@/database/repositories/overtimeRepo';
import { autoApplyBankOnEarlyExit, computeWorkDayFromPunches, validateNextPunch, AutoUsageResult } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { today, nowHm, minutesToHm, signedHm } from '@/utils/date';
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
  const [autoUsage, setAutoUsage] = useState<AutoUsageResult | null>(null);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Permite escolher data/horário manualmente. Botão "Agora" reseta.
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(nowHm());

  const load = useCallback(async () => {
    if (!user) return;
    setPunches(await listPunchesByDate(user.id, date));
  }, [user, date]);
  useEffect(() => { void load(); }, [load]);

  const rules = user ? rulesFor(user.contract_type) : null;
  const lunchOn = rules?.lunchRequired ?? true;
  const sequence: PunchType[] = lunchOn ? ['IN','LUNCH_OUT','LUNCH_IN','OUT'] : ['IN','OUT'];
  const nextType = sequence.find(t => validateNextPunch(punches, t).ok) ?? null;

  const onPunch = async (type: PunchType) => {
    if (!user || !shift) return;
    setMsg(null);
    setAutoUsage(null);
    setNote('');
    setNoteSaved(false);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setMsg({ kind: 'err', text: 'Horário inválido (use HH:mm)' });
      return;
    }
    const v = validateNextPunch(punches, type, time);
    if (!v.ok) { setMsg({ kind: 'err', text: v.reason ?? 'Não permitido' }); return; }
    try {
      setBusy(type);
      await addPunch({ user_id: user.id, type, date, time });
      const wd = await computeWorkDayFromPunches(user.id, date, shift);
      await upsertWorkDay(wd);

      let autoResult: AutoUsageResult | null = null;
      if (type === 'OUT' && wd.balance_minutes < 0) {
        const result = await autoApplyBankOnEarlyExit({
          userId: user.id,
          date,
          workedMinutes: wd.worked_minutes,
          expectedMinutes: wd.expected_minutes,
        });
        if (result && result.autoUsedMinutes > 0) autoResult = result;
      }

      await load();
      bumpVersion();
      setMsg({ kind: 'ok', text: `${FULL_LABEL[type]} registrada às ${time}` });
      setTime(nowHm());
      if (autoResult) setAutoUsage(autoResult);
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
        <Card delay={0}>
          <SectionLabel right={
            <button
              type="button"
              onClick={() => { setDate(today()); setTime(nowHm()); }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Agora
            </button>
          }>
            Horário do ponto
          </SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              iconRight={<Calendar size={18} />}
            />
            <Input
              label="Hora"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              iconRight={<Clock size={18} />}
            />
          </div>
        </Card>

        {msg && (
          <Card delay={0} noAnimate className={msg.kind === 'ok' ? 'bg-primary/10 border-primary/30' : 'bg-accent/10 border-accent/30'}>
            <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-primary' : 'text-accent'}`}>{msg.text}</p>
          </Card>
        )}

        {autoUsage && (
          <Card delay={0} noAnimate className="bg-yellow/20 border-yellow/40">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={18} className="text-brown shrink-0" />
              <p className="text-sm font-bold text-brown">Banco de horas utilizado automaticamente</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-text-muted">Saída prevista</span>
                <span className="font-semibold text-text">{shift?.exit_time}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-text-muted">Saída realizada</span>
                <span className="font-semibold text-text">{time}</span>
              </li>
              <li className="flex justify-between border-t border-yellow/40 pt-2">
                <span className="text-text-muted">Saldo anterior</span>
                <span className="font-semibold text-text">{signedHm(autoUsage.bankBalanceBefore)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-text-muted">Tempo utilizado do banco</span>
                <span className="font-bold text-accent">-{minutesToHm(autoUsage.autoUsedMinutes)}</span>
              </li>
              {autoUsage.remainingShortfallMinutes > 0 && (
                <li className="flex justify-between">
                  <span className="text-text-muted">Déficit não coberto</span>
                  <span className="font-bold text-accent">-{minutesToHm(autoUsage.remainingShortfallMinutes)}</span>
                </li>
              )}
              <li className="flex justify-between border-t border-yellow/40 pt-2">
                <span className="text-text-muted">Saldo restante</span>
                <span className={`font-bold ${autoUsage.bankBalanceAfter >= 0 ? 'text-primary' : 'text-accent'}`}>
                  {signedHm(autoUsage.bankBalanceAfter)}
                </span>
              </li>
            </ul>
            {autoUsage.remainingShortfallMinutes > 0 && (
              <p className="text-xs text-accent mt-3">
                Saldo insuficiente. Os {minutesToHm(autoUsage.remainingShortfallMinutes)} restantes foram lançados como débito.
              </p>
            )}
            <div className="mt-4 pt-3 border-t border-yellow/40">
              <p className="text-xs font-semibold text-brown mb-2">Motivo (opcional)</p>
              {noteSaved ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text">{note || 'Sem observação'}</p>
                  <button
                    onClick={() => setNoteSaved(false)}
                    className="text-xs text-primary hover:underline ml-2 shrink-0"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: Consulta médica, compromisso pessoal..."
                    className="flex-1 h-9 px-3 bg-cream/60 border border-yellow/50 rounded-xl text-sm text-text outline-none focus:border-brown placeholder:text-text-muted/60"
                  />
                  <button
                    onClick={async () => {
                      if (autoUsage.usageId) {
                        await updateUsage(autoUsage.usageId, { reason: note || 'Saída antecipada automática' });
                      }
                      setNoteSaved(true);
                    }}
                    className="h-9 px-3 rounded-xl bg-brown text-cream text-xs font-semibold shrink-0"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
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
