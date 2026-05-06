import { getDb } from '../db';
import { Shift } from '@/types';

export async function createShift(s: Omit<Shift, 'id' | 'created_at'>): Promise<number> {
  const db = getDb();
  if (s.is_default) {
    await db.runAsync(`UPDATE shifts SET is_default = 0 WHERE user_id = ?`, s.user_id);
  }
  const r = await db.runAsync(
    `INSERT INTO shifts (user_id,name,entry_time,lunch_out_time,lunch_in_time,exit_time,daily_minutes,lunch_minutes,active_days,is_default)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    s.user_id, s.name, s.entry_time, s.lunch_out_time, s.lunch_in_time, s.exit_time,
    s.daily_minutes, s.lunch_minutes, s.active_days, s.is_default
  );
  return r.lastInsertRowId as number;
}

export async function getDefaultShift(userId: number): Promise<Shift | null> {
  const db = getDb();
  return (await db.getFirstAsync<Shift>(
    `SELECT * FROM shifts WHERE user_id = ? AND is_default = 1 ORDER BY id DESC LIMIT 1`, userId
  )) ?? null;
}

export async function listShifts(userId: number): Promise<Shift[]> {
  const db = getDb();
  return await db.getAllAsync<Shift>(
    `SELECT * FROM shifts WHERE user_id = ? ORDER BY is_default DESC, id DESC`, userId
  );
}

export async function updateShift(id: number, patch: Partial<Shift>): Promise<void> {
  const db = getDb();
  const fields = Object.keys(patch).filter(k => k !== 'id' && k !== 'created_at');
  if (!fields.length) return;
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const vals = fields.map(f => (patch as any)[f]);
  await db.runAsync(`UPDATE shifts SET ${sets} WHERE id = ?`, ...vals, id);
}

export async function deleteShift(id: number): Promise<void> {
  await getDb().runAsync(`DELETE FROM shifts WHERE id = ?`, id);
}
