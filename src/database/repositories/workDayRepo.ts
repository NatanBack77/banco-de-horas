import { getDb } from '../db';
import { WorkDay } from '@/types';

export async function upsertWorkDay(w: Omit<WorkDay, 'id'>): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO work_days (user_id,date,expected_minutes,worked_minutes,balance_minutes,closed)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(user_id,date) DO UPDATE SET
       expected_minutes=excluded.expected_minutes,
       worked_minutes=excluded.worked_minutes,
       balance_minutes=excluded.balance_minutes,
       closed=excluded.closed`,
    w.user_id, w.date, w.expected_minutes, w.worked_minutes, w.balance_minutes, w.closed
  );
}

export async function getWorkDay(userId: number, date: string): Promise<WorkDay | null> {
  return (await getDb().getFirstAsync<WorkDay>(
    `SELECT * FROM work_days WHERE user_id=? AND date=?`, userId, date
  )) ?? null;
}

export async function listWorkDaysMonth(userId: number, ym: string): Promise<WorkDay[]> {
  return getDb().getAllAsync<WorkDay>(
    `SELECT * FROM work_days WHERE user_id=? AND substr(date,1,7)=? ORDER BY date ASC`, userId, ym
  );
}

export async function listWorkDaysRange(userId: number, from: string, to: string): Promise<WorkDay[]> {
  return getDb().getAllAsync<WorkDay>(
    `SELECT * FROM work_days WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date ASC`, userId, from, to
  );
}

export async function sumBalanceAll(userId: number): Promise<number> {
  const r = await getDb().getFirstAsync<{ s: number | string }>(
    `SELECT COALESCE(SUM(balance_minutes),0) AS s FROM work_days WHERE user_id=?`, userId
  );
  return Number(r?.s ?? 0);
}
