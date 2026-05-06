import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Shift } from '@/types';
import { getDefaultShift } from '@/database/repositories/shiftRepo';
import { useAuth } from './AuthContext';

interface SettingsCtx {
  shift: Shift | null;
  refreshShift: () => Promise<void>;
  bumpVersion: () => void;
  version: number;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [version, setVersion] = useState(0);

  const refreshShift = useCallback(async () => {
    if (!user) { setShift(null); return; }
    const s = await getDefaultShift(user.id);
    setShift(s);
  }, [user]);

  useEffect(() => { refreshShift(); }, [refreshShift, user?.id]);

  const bumpVersion = useCallback(() => setVersion(v => v + 1), []);

  return <Ctx.Provider value={{ shift, refreshShift, bumpVersion, version }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('SettingsProvider missing');
  return v;
}
