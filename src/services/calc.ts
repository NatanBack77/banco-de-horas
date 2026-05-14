import { PunchRecord, Shift, WorkDay } from '@/types';
import { listPunchesByDate } from '@/database/repositories/punchRepo';
import { addUsage, getAutoUsageForDate, sumUsedMinutes, sumScheduledMinutes } from '@/database/repositories/overtimeRepo';
import { sumBalanceAll, upsertWorkDay } from '@/database/repositories/workDayRepo';
import { hmToMinutes } from '@/utils/date';

/** Compute worked minutes from punches: (LUNCH_OUT-IN) + (OUT-LUNCH_IN). Falls back to OUT-IN if no lunch. */
export function workedFromPunches(punches: PunchRecord[]): number {
  const byType: Partial<Record<PunchRecord['type'], string>> = {};
  for (const p of punches) byType[p.type] = p.time;

  const inT = byType.IN, outT = byType.OUT;
  const lOut = byType.LUNCH_OUT, lIn = byType.LUNCH_IN;

  if (!inT) return 0;

  if (lOut && lIn && outT) {
    return Math.max(0, hmToMinutes(lOut) - hmToMinutes(inT))
         + Math.max(0, hmToMinutes(outT) - hmToMinutes(lIn));
  }
  if (lOut && !lIn && !outT) {
    return Math.max(0, hmToMinutes(lOut) - hmToMinutes(inT));
  }
  if (outT) {
    return Math.max(0, hmToMinutes(outT) - hmToMinutes(inT));
  }
  return 0;
}

export function expectedMinutesForDate(shift: Shift, dateYmd: string): number {
  const d = new Date(dateYmd + 'T00:00:00');
  const dow = d.getDay();
  const active = JSON.parse(shift.active_days || '[1,2,3,4,5]') as number[];
  return active.includes(dow) ? shift.daily_minutes : 0;
}

export async function computeWorkDayFromPunches(
  userId: number, date: string, shift: Shift
): Promise<Omit<WorkDay, 'id'>> {
  const punches = await listPunchesByDate(userId, date);
  const worked = workedFromPunches(punches);
  const expected = expectedMinutesForDate(shift, date);
  const closed = punches.find(p => p.type === 'OUT') ? 1 : 0;
  return {
    user_id: userId,
    date,
    expected_minutes: expected,
    worked_minutes: worked,
    balance_minutes: closed ? worked - expected : 0,
    closed,
  };
}

/** Validate next allowed punch type given existing punches today. */
export function validateNextPunch(
  existing: PunchRecord[], next: PunchRecord['type'], time?: string
): { ok: boolean; reason?: string } {
  const types = existing.map(p => p.type);
  let typeCheck: { ok: boolean; reason?: string } = { ok: true };
  switch (next) {
    case 'IN':
      if (types.includes('IN')) typeCheck = { ok: false, reason: 'Entrada já registrada hoje' };
      break;
    case 'LUNCH_OUT':
      if (!types.includes('IN')) typeCheck = { ok: false, reason: 'Registre a entrada antes' };
      else if (types.includes('LUNCH_OUT')) typeCheck = { ok: false, reason: 'Saída para almoço já registrada' };
      break;
    case 'LUNCH_IN':
      if (!types.includes('LUNCH_OUT')) typeCheck = { ok: false, reason: 'Registre a saída para almoço antes' };
      else if (types.includes('LUNCH_IN')) typeCheck = { ok: false, reason: 'Retorno do almoço já registrado' };
      break;
    case 'OUT':
      if (!types.includes('IN')) typeCheck = { ok: false, reason: 'Registre a entrada antes' };
      else if (types.includes('OUT')) typeCheck = { ok: false, reason: 'Saída já registrada' };
      break;
  }
  if (!typeCheck.ok) return typeCheck;
  if (time && existing.length) {
    const last = existing.reduce((a, b) => (a.time > b.time ? a : b));
    if (time <= last.time) return { ok: false, reason: `Horário deve ser maior que ${last.time}` };
  }
  return { ok: true };
}

export interface OvertimeBalance {
  positive: number; // total accumulated positive minutes
  negative: number; // total accumulated negative minutes (absolute value)
  net: number;      // positive - negative
  used: number;
  scheduled: number;
  available: number; // net - used - scheduled
}

export interface AutoUsageResult {
  usageId: number;
  shortfallMinutes: number;
  autoUsedMinutes: number;
  remainingShortfallMinutes: number;
  /** Saldo do banco antes da saída antecipada de hoje */
  bankBalanceBefore: number;
  /** Saldo do banco após o desconto automático */
  bankBalanceAfter: number;
}

/**
 * Chamado após registrar punch OUT quando worked < expected.
 * Cria registro AUTO em overtime_usage e reajusta balance_minutes do work_day
 * para evitar dupla-contagem.
 *
 * Idempotente: não aplica se já existe auto-uso para a mesma data.
 */
export async function autoApplyBankOnEarlyExit(params: {
  userId: number;
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
}): Promise<AutoUsageResult | null> {
  const { userId, date, workedMinutes, expectedMinutes } = params;
  const shortfall = expectedMinutes - workedMinutes;
  if (shortfall <= 0) return null;

  const existing = await getAutoUsageForDate(userId, date);
  if (existing) return null;

  // sumBalanceAll já inclui o balance_minutes negativo de hoje (salvo antes desta chamada)
  const net = await sumBalanceAll(userId);
  const used = await sumUsedMinutes(userId);
  const scheduled = await sumScheduledMinutes(userId);
  const availableNow = net - used - scheduled;

  // Banco antes da saída antecipada = disponível atual + déficit de hoje
  const bankBalanceBefore = availableNow + shortfall;
  const autoUsed = Math.min(shortfall, Math.max(0, availableNow));
  const remainingShortfall = shortfall - autoUsed;
  // Após ajustes, disponível final é sempre availableNow (math equivalente)
  const bankBalanceAfter = availableNow;

  let usageId = 0;
  if (autoUsed > 0) {
    usageId = await addUsage({
      user_id: userId,
      minutes: autoUsed,
      date,
      reason: 'Saída antecipada automática',
      status: 'USED',
      source: 'AUTO',
    });
    // Ajusta balance_minutes para evitar dupla-contagem: só o déficit não coberto permanece
    await upsertWorkDay({
      user_id: userId,
      date,
      expected_minutes: expectedMinutes,
      worked_minutes: workedMinutes,
      balance_minutes: -remainingShortfall,
      closed: 1,
    });
  }

  return { usageId, shortfallMinutes: shortfall, autoUsedMinutes: autoUsed, remainingShortfallMinutes: remainingShortfall, bankBalanceBefore, bankBalanceAfter };
}

export function computeBalance(
  workDays: { balance_minutes: number }[],
  used: number,
  scheduled: number
): OvertimeBalance {
  let positive = 0, negative = 0;
  for (const w of workDays) {
    if (w.balance_minutes > 0) positive += w.balance_minutes;
    else if (w.balance_minutes < 0) negative += -w.balance_minutes;
  }
  const net = positive - negative;
  return { positive, negative, net, used, scheduled, available: net - used - scheduled };
}
