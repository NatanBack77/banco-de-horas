import { getDb } from '../db';
import { NotificationItem } from '@/types';

export async function pushNotif(n: Omit<NotificationItem,'id'|'created_at'|'read'>): Promise<number> {
  const r = await getDb().runAsync(
    `INSERT INTO notifications (user_id,title,body,type) VALUES (?,?,?,?)`,
    n.user_id, n.title, n.body, n.type
  );
  return r.lastInsertRowId as number;
}

export async function listNotifs(userId: number): Promise<NotificationItem[]> {
  return getDb().getAllAsync<NotificationItem>(
    `SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100`, userId
  );
}

export async function markAllRead(userId: number): Promise<void> {
  await getDb().runAsync(`UPDATE notifications SET read=1 WHERE user_id=?`, userId);
}
