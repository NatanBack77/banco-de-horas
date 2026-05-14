import { useCallback, useEffect, useState } from 'react';
import { Info, X, Pencil, Save } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { hmToMinutes } from '@/utils/date';
import { cancelUsage, listUsages, sumScheduledMinutes, sumUsedMinutes, updateUsage } from '@/database/repositories/overtimeRepo';
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
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ duration: '', date: '', reason: '' });

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

  const startEdit = (u: OvertimeUsage) => {
    setEditId(u.id);
    const h = String(Math.floor(u.minutes / 60)).padStart(2, '0');
    const m = String(u.minutes % 60).padStart(2, '0');
    setEditForm({ duration: `${h}:${m}`, date: u.date, reason: u.reason ?? '' });
  };

  const saveEdit = async (u: OvertimeUsage) => {
    if (!/^\d{2}:\d{2}$/.test(editForm.duration)) { alert('Duração inválida (HH:mm)'); return; }
    const minutes = hmToMinutes(editForm.duration);
    if (minutes <= 0) { alert('Duração deve ser maior que zero'); return; }
    await updateUsage(u.id, { minutes, date: editForm.date, reason: editForm.reason || null });
    setEditId(null);
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
            {items.map((u, i) => {
              const editing = editId === u.id;
              return (
                <Card key={u.id} delay={Math.min(0.4, 0.04 * (i + 1))}>
                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Duração</span>
                          <input
                            type="time"
                            value={editForm.duration}
                            onChange={(e) => setEditForm(f => ({ ...f, duration: e.target.value }))}
                            className="w-full h-10 px-3 bg-cream border border-border rounded-xl text-sm font-semibold text-text outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Data</span>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                            className="w-full h-10 px-3 bg-cream border border-border rounded-xl text-sm font-semibold text-text outline-none focus:border-primary"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Motivo</span>
                        <input
                          type="text"
                          value={editForm.reason}
                          onChange={(e) => setEditForm(f => ({ ...f, reason: e.target.value }))}
                          placeholder="Opcional"
                          className="w-full h-10 px-3 bg-cream border border-border rounded-xl text-sm text-text outline-none focus:border-primary"
                        />
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => void saveEdit(u)} className="flex-1 h-10 rounded-xl bg-primary text-cream text-sm font-semibold inline-flex items-center justify-center gap-1.5">
                          <Save size={14} /> Salvar
                        </button>
                        <button onClick={() => setEditId(null)} className="flex-1 h-10 rounded-xl bg-cream text-brown text-sm font-semibold border border-border">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm capitalize text-text font-semibold">{formatPtDate(u.date)}</p>
                        <p className="text-text-muted text-xs mt-0.5">{u.reason || 'Sem motivo'}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[u.status]}`}>
                            {STATUS_LABEL[u.status]}
                          </span>
                          {u.source === 'AUTO' && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-brown/10 text-brown">
                              Automático
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-text">{minutesToHm(u.minutes)}</p>
                        {u.status !== 'CANCELED' && (
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <button onClick={() => startEdit(u)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <Pencil size={12} /> Editar
                            </button>
                            <button onClick={() => onCancel(u.id)} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
