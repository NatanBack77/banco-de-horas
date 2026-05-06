import { initDatabase, getDb } from './db';
import { createUser, findUserByEmail } from './repositories/userRepo';
import { createShift, getDefaultShift } from './repositories/shiftRepo';
import { addPunch } from './repositories/punchRepo';
import { upsertWorkDay } from './repositories/workDayRepo';
import { hashPassword } from '@/services/auth';
import { computeWorkDayFromPunches } from '@/services/calc';
import { format, subDays } from 'date-fns';

export async function seedIfEmpty(): Promise<void> {
  await initDatabase();
  const db = getDb();
  const c = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);
  if ((c?.n ?? 0) > 0) return;

  const userId = await createUser({
    name: 'João Silva',
    email: 'joao@saogeraldo.com',
    password_hash: hashPassword('123456'),
    contract_type: 'FULL_TIME',
  });

  await createShift({
    user_id: userId,
    name: 'Comercial',
    entry_time: '08:00',
    lunch_out_time: '12:00',
    lunch_in_time: '13:00',
    exit_time: '17:00',
    daily_minutes: 8 * 60,
    lunch_minutes: 60,
    active_days: JSON.stringify([1,2,3,4,5]),
    is_default: 1,
  });

  const shift = await getDefaultShift(userId);
  if (!shift) return;

  // sample punches: last 10 working days
  const today = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = subDays(today, i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const date = format(d, 'yyyy-MM-dd');
    // small variation
    const off = (i % 3) - 1; // -1, 0, 1
    const ins = `08:${String(Math.max(0, off + 5)).padStart(2,'0')}`;
    await addPunch({ user_id: userId, type: 'IN', date, time: ins });
    await addPunch({ user_id: userId, type: 'LUNCH_OUT', date, time: '12:00' });
    await addPunch({ user_id: userId, type: 'LUNCH_IN', date, time: '13:00' });
    await addPunch({ user_id: userId, type: 'OUT', date, time: i % 4 === 0 ? '17:30' : '17:00' });

    const wd = await computeWorkDayFromPunches(userId, date, shift);
    await upsertWorkDay(wd);
  }
}
