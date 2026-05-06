import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { listNotifs, markAllRead } from '@/database/repositories/notificationRepo';
import { format, parse } from '@/utils/date';
import { NotificationItem } from '@/types';

const TYPE_CLS: Record<NotificationItem['type'], string> = {
  INFO: 'bg-cream text-brown',
  SUCCESS: 'bg-primary/10 text-primary',
  WARN: 'bg-yellow/30 text-brown',
  ERROR: 'bg-accent/10 text-accent',
};

function formatStamp(s: string): string {
  try {
    const d = parse(s, 'yyyy-MM-dd HH:mm:ss', new Date());
    return format(d, "dd/MM HH:mm");
  } catch { return s; }
}

export function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await listNotifs(user.id);
    setItems(list);
    if (list.some(n => !n.read)) {
      await markAllRead(user.id);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="app-shell pb-24">
      <Header title="Notificações" back />
      <div className="px-5 space-y-3">
        {items.length === 0 && <Card delay={0}><p className="text-text-muted">Nenhuma notificação.</p></Card>}
        {items.map((n, i) => (
          <Card key={n.id} delay={Math.min(0.4, 0.04 * i)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${TYPE_CLS[n.type]}`}>{n.type}</span>
                <p className="font-semibold text-text mt-1">{n.title}</p>
                <p className="text-sm text-text-muted mt-0.5">{n.body}</p>
              </div>
              <span className="text-xs text-text-soft shrink-0">{formatStamp(n.created_at)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
