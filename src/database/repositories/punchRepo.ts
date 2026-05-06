import { getDb } from '../db';
import { PunchRecord, PunchType } from '@/types';

export async function addPunch(p: {
  user_id: number; type: PunchType; date: string; time: string;
  note?: string | null; source?: 'MANUAL' | 'AUTO';
}): Promise<number> {
  const db = getDb();
  const r = await db.runAsync(
    `INSERT INTO punch_records (user_id,type,date,time,note,source) VALUES (?,?,?,?,?,?)`,
    p.user_id, p.type, p.date, p.time, p.note ?? null, p.source ?? 'MANUAL'
  );
  return r.lastInsertRowId as number;
}

export async function listPunchesByDate(userId: number, date: string): Promise<PunchRecord[]> {
  return getDb().getAllAsync<PunchRecord>(
    `SELECT * FROM punch_records WHERE user_id=? AND date=? AND deleted=0 ORDER BY time ASC`,
    userId, date
  );
}

export async function listPunchesByMonth(userId: number, ym: string): Promise<PunchRecord[]> {
  return getDb().getAllAsync<PunchRecord>(
    `SELECT * FROM punch_records WHERE user_id=? AND substr(date,1,7)=? AND deleted=0 ORDER BY date ASC, time ASC`,
    userId, ym
  );
}

export async function listPunchesRange(userId: number, from: string, to: string): Promise<PunchRecord[]> {
  return getDb().getAllAsync<PunchRecord>(
    `SELECT * FROM punch_records WHERE user_id=? AND date BETWEEN ? AND ? AND deleted=0 ORDER BY date ASC, time ASC`,
    userId, from, to
  );
}

export async function deletePunch(id: number): Promise<void> {
  await getDb().runAsync(`UPDATE punch_records SET deleted=1 WHERE id=?`, id);
}

export async function updatePunch(id: number, patch: Partial<PunchRecord>): Promise<void> {
  const db = getDb();
  const fields = Object.keys(patch).filter(k => !['id','created_at','user_id'].includes(k));
  if (!fields.length) return;
  const sets = fields.map(f => `${f}=?`).join(', ');
  const vals = fields.map(f => (patch as any)[f]);
  await db.runAsync(`UPDATE punch_records SET ${sets} WHERE id=?`, ...vals, id);
}
