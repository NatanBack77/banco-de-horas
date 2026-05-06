import { getDb } from '../db';
import { OvertimeUsage } from '@/types';

export async function addUsage(u: Omit<OvertimeUsage, 'id' | 'created_at'>): Promise<number> {
  const r = await getDb().runAsync(
    `INSERT INTO overtime_usage (user_id,minutes,date,reason,status) VALUES (?,?,?,?,?)`,
    u.user_id, u.minutes, u.date, u.reason, u.status
  );
  return r.lastInsertRowId as number;
}

export async function listUsages(userId: number): Promise<OvertimeUsage[]> {
  return getDb().getAllAsync<OvertimeUsage>(
    `SELECT * FROM overtime_usage WHERE user_id=? ORDER BY date DESC, id DESC`, userId
  );
}

export async function cancelUsage(id: number): Promise<void> {
  await getDb().runAsync(`UPDATE overtime_usage SET status='CANCELED' WHERE id=?`, id);
}

export async function updateUsage(id: number, patch: Partial<OvertimeUsage>): Promise<void> {
  const fields = Object.keys(patch).filter(k => !['id','created_at','user_id'].includes(k));
  if (!fields.length) return;
  const sets = fields.map(f => `${f}=?`).join(', ');
  const vals = fields.map(f => (patch as any)[f]);
  await getDb().runAsync(`UPDATE overtime_usage SET ${sets} WHERE id=?`, ...vals, id);
}

export async function sumUsedMinutes(userId: number): Promise<number> {
  const r = await getDb().getFirstAsync<{ s: number }>(
    `SELECT COALESCE(SUM(minutes),0) AS s FROM overtime_usage WHERE user_id=? AND status='USED'`, userId
  );
  return r?.s ?? 0;
}

export async function sumScheduledMinutes(userId: number): Promise<number> {
  const r = await getDb().getFirstAsync<{ s: number }>(
    `SELECT COALESCE(SUM(minutes),0) AS s FROM overtime_usage WHERE user_id=? AND status='SCHEDULED'`, userId
  );
  return r?.s ?? 0;
}
