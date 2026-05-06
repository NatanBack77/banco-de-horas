import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { createShift, updateShift } from '@/database/repositories/shiftRepo';
import { rulesFor } from '@/services/contract';
import { hmToMinutes, diffMinutes, minutesToHm } from '@/utils/date';
import { validateShift } from '@/services/validation';

const DOW = [
  { v: 0, l: 'Dom' },
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
];

export function ShiftConfigScreen() {
  const { user } = useAuth();
  const { shift, refreshShift } = useSettings();
  const nav = useNavigate();
  const [name, setName] = useState('Comercial');
  const [entry, setEntry] = useState('08:00');
  const [lOut, setLOut] = useState('12:00');
  const [lIn, setLIn] = useState('13:00');
  const [exit, setExit] = useState('17:00');
  const [active, setActive] = useState<number[]>([1,2,3,4,5]);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shift) return;
    setName(shift.name);
    setEntry(shift.entry_time);
    setLOut(shift.lunch_out_time);
    setLIn(shift.lunch_in_time);
    setExit(shift.exit_time);
    try { setActive(JSON.parse(shift.active_days) as number[]); } catch { /* keep */ }
  }, [shift]);

  const rules = user ? rulesFor(user.contract_type) : null;
  const lunchOn = rules?.lunchRequired ?? true;

  const computedDaily = lunchOn
    ? diffMinutes(entry, lOut) + diffMinutes(lIn, exit)
    : diffMinutes(entry, exit);

  const onSave = async () => {
    if (!user) return;
    const errs = validateShift({ entry_time: entry, lunch_out_time: lOut, lunch_in_time: lIn, exit_time: exit });
    if (errs.length) {
      setErrors(Object.fromEntries(errs.map(e => [e.field, e.message])));
      return;
    }
    if (!active.length) {
      setErrors({ active_days: 'Selecione ao menos um dia' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: name.trim() || 'Padrão',
        entry_time: entry,
        lunch_out_time: lunchOn ? lOut : entry,
        lunch_in_time: lunchOn ? lIn : entry,
        exit_time: exit,
        daily_minutes: computedDaily,
        lunch_minutes: lunchOn ? Math.max(0, hmToMinutes(lIn) - hmToMinutes(lOut)) : 0,
        active_days: JSON.stringify([...active].sort((a,b) => a-b)),
        is_default: 1,
      };
      if (shift) await updateShift(shift.id, payload);
      else await createShift(payload);
      await refreshShift();
      nav(-1);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (v: number) => {
    setActive(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  return (
    <div className="app-shell pb-24">
      <Header title="Configurações de turno" back />
      <div className="px-5 space-y-3">
        <Card delay={0}>
          <SectionLabel>Meu turno</SectionLabel>
          <Input label="Nome do turno" value={name} onChange={(e) => setName(e.target.value)} placeholder="Comercial" />
        </Card>

        <Card delay={0.05}>
          <SectionLabel>Horários</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Entrada" type="time" value={entry} onChange={(e) => setEntry(e.target.value)} error={errors.entry_time} />
            {lunchOn ? (
              <>
                <Input label="Saída p/ almoço" type="time" value={lOut} onChange={(e) => setLOut(e.target.value)} error={errors.lunch_out_time} />
                <Input label="Retorno almoço" type="time" value={lIn} onChange={(e) => setLIn(e.target.value)} error={errors.lunch_in_time} />
              </>
            ) : null}
            <Input label="Saída" type="time" value={exit} onChange={(e) => setExit(e.target.value)} error={errors.exit_time} />
          </div>
        </Card>

        <Card delay={0.1}>
          <span className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Carga diária</span>
          <div className="flex items-center gap-2 bg-surface border-2 border-border rounded-2xl px-4 h-13">
            <p className="flex-1 text-base font-semibold text-text py-3">{minutesToHm(computedDaily)} horas</p>
          </div>
        </Card>

        <Card delay={0.15}>
          <SectionLabel>Dias da semana</SectionLabel>
          <div className="flex justify-between gap-1">
            {DOW.map(d => {
              const on = active.includes(d.v);
              return (
                <button
                  key={d.v}
                  onClick={() => toggleDay(d.v)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{d.l}</span>
                  <span className={`w-9 h-9 rounded-full grid place-items-center transition ${on ? 'bg-primary text-cream' : 'bg-cream text-text-soft border border-border'}`}>
                    {on ? <Check size={16} strokeWidth={3} /> : <Minus size={16} />}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.active_days && <p className="text-xs text-accent mt-2">{errors.active_days}</p>}
        </Card>

        <Button full onClick={onSave} loading={saving}>Salvar alterações</Button>
      </div>
    </div>
  );
}
