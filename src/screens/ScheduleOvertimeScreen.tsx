import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Info } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { addUsage, sumScheduledMinutes, sumUsedMinutes } from '@/database/repositories/overtimeRepo';
import { listWorkDaysMonth } from '@/database/repositories/workDayRepo';
import { computeBalance } from '@/services/calc';
import { rulesFor } from '@/services/contract';
import { isHm, isYmd } from '@/services/validation';
import { format, hmToMinutes, signedHm, today } from '@/utils/date';

export function ScheduleOvertimeScreen() {
  const { user } = useAuth();
  const { bumpVersion } = useSettings();
  const nav = useNavigate();
  const [duration, setDuration] = useState('02:00');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(0);

  const loadBalance = useCallback(async () => {
    if (!user) return;
    const days = await listWorkDaysMonth(user.id, format(new Date(), 'yyyy-MM'));
    const used = await sumUsedMinutes(user.id);
    const scheduled = await sumScheduledMinutes(user.id);
    setAvailable(computeBalance(days, used, scheduled).available);
  }, [user]);
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  const otAllowed = user ? rulesFor(user.contract_type).allowOvertime(user) : true;
  if (!otAllowed) {
    return (
      <div className="app-shell pb-24">
        <Header title="Agendar utilização" back />
        <div className="px-5">
          <Card delay={0}>
            <p className="font-semibold text-text">Hora extra bloqueada</p>
            <p className="text-text-muted text-sm mt-1">Jovem aprendiz sem permissão.</p>
          </Card>
        </div>
      </div>
    );
  }

  const onSave = async () => {
    if (!user) return;
    setErr(null);
    if (!isHm(duration)) { setErr('Duração inválida (HH:mm)'); return; }
    if (!isYmd(date)) { setErr('Data inválida'); return; }
    if (date <= today()) { setErr('Escolha uma data futura'); return; }
    const minutes = hmToMinutes(duration);
    if (minutes <= 0) { setErr('Duração deve ser maior que zero'); return; }
    if (minutes > available) { setErr('Saldo insuficiente'); return; }
    setSaving(true);
    try {
      await addUsage({ user_id: user.id, minutes, date, reason: reason || null, status: 'SCHEDULED', source: 'MANUAL' });
      bumpVersion();
      nav(-1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell pb-24">
      <Header title="Agendar utilização" back />
      <div className="px-5 space-y-3">
        <Card delay={0} className="bg-cream">
          <p className="text-sm font-semibold text-brown/80">Saldo disponível</p>
          <p className={`mt-1 leading-none ${available >= 0 ? 'text-primary' : 'text-accent'}`}>
            <span className="text-3xl font-bold tracking-tight">{signedHm(available)}</span>
          </p>
          <p className="text-xs text-text-muted mt-1">horas</p>
        </Card>

        <Card delay={0.05}>
          <SectionLabel>Agendar horas extras</SectionLabel>
          <div className="space-y-3">
            <Input
              label="Quantas horas deseja agendar?"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="02:00"
              suffix="horas"
            />
            <Input
              label="Data prevista"
              type="date"
              value={date}
              min={today()}
              onChange={(e) => setDate(e.target.value)}
              iconRight={<Calendar size={18} />}
            />
            <Input
              label="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: compromisso pessoal"
            />
          </div>
          {err && <p className="text-xs text-accent mt-2">{err}</p>}
        </Card>

        <Button full onClick={onSave} loading={saving}>Agendar</Button>

        <Card delay={0.1} noAnimate className="bg-yellow/20 border-yellow/40">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-brown shrink-0 mt-0.5" />
            <p className="text-xs text-brown">Você poderá ajustar ou cancelar o agendamento depois.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
