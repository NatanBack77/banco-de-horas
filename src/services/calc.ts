import { PunchRecord, Shift, WorkDay } from '@/types';
import { listPunchesByDate } from '@/database/repositories/punchRepo';
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
  existing: PunchRecord[], next: PunchRecord['type']
): { ok: boolean; reason?: string } {
  const types = existing.map(p => p.type);
  switch (next) {
    case 'IN':
      if (types.includes('IN')) return { ok: false, reason: 'Entrada já registrada hoje' };
      return { ok: true };
    case 'LUNCH_OUT':
      if (!types.includes('IN')) return { ok: false, reason: 'Registre a entrada antes' };
      if (types.includes('LUNCH_OUT')) return { ok: false, reason: 'Saída para almoço já registrada' };
      return { ok: true };
    case 'LUNCH_IN':
      if (!types.includes('LUNCH_OUT')) return { ok: false, reason: 'Registre a saída para almoço antes' };
      if (types.includes('LUNCH_IN')) return { ok: false, reason: 'Retorno do almoço já registrado' };
      return { ok: true };
    case 'OUT':
      if (!types.includes('IN')) return { ok: false, reason: 'Registre a entrada antes' };
      if (types.includes('OUT')) return { ok: false, reason: 'Saída já registrada' };
      return { ok: true };
  }
}

export interface OvertimeBalance {
  positive: number; // total accumulated positive minutes
  negative: number; // total accumulated negative minutes (absolute value)
  net: number;      // positive - negative
  used: number;
  scheduled: number;
  available: number; // net - used - scheduled
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
