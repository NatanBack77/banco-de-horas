import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
const SecureStore = {
  getItemAsync: async (k: string): Promise<string | null> => localStorage.getItem(k),
  setItemAsync: async (k: string, v: string): Promise<void> => { localStorage.setItem(k, v); },
  deleteItemAsync: async (k: string): Promise<void> => { localStorage.removeItem(k); },
};
import { User, ContractType } from '@/types';
import { initDatabase } from '@/database/db';
import { createUser, findUserByEmail, getUser } from '@/database/repositories/userRepo';
import { createShift, getDefaultShift } from '@/database/repositories/shiftRepo';
import { hashPassword, verifyPassword } from '@/services/auth';
import { rulesFor } from '@/services/contract';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  initError: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (input: { name: string; email: string; password: string; contract_type: ContractType }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = 'bdh_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const id = await SecureStore.getItemAsync(KEY).catch(() => null);
        if (id) {
          const u = await getUser(Number(id));
          setUser(u);
        }
      } catch (e: any) {
        console.error('[AuthProvider init] erro:', e);
        setInitError(e?.message ?? 'Falha ao conectar ao banco');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await findUserByEmail(email.trim().toLowerCase());
    if (!u) return { ok: false, error: 'Usuário não encontrado' };
    if (!verifyPassword(password, u.password_hash)) return { ok: false, error: 'Senha incorreta' };
    await SecureStore.setItemAsync(KEY, String(u.id));
    setUser(u);
    return { ok: true };
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string; contract_type: ContractType }) => {
    const exists = await findUserByEmail(input.email.trim().toLowerCase());
    if (exists) return { ok: false, error: 'E-mail já cadastrado' };
    const id = await createUser({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password_hash: hashPassword(input.password),
      contract_type: input.contract_type,
    });
    // default shift based on contract
    const r = rulesFor(input.contract_type);
    const existingShift = await getDefaultShift(id);
    if (!existingShift) {
      await createShift({
        user_id: id,
        name: 'Padrão',
        entry_time: '08:00',
        lunch_out_time: '12:00',
        lunch_in_time: '13:00',
        exit_time: input.contract_type === 'FULL_TIME' ? '17:00' : input.contract_type === 'APPRENTICE' ? '14:00' : '12:00',
        daily_minutes: r.defaultDailyMinutes,
        lunch_minutes: r.lunchRequired ? 60 : 0,
        active_days: JSON.stringify([1,2,3,4,5]),
        is_default: 1,
      });
    }
    const u = await getUser(id);
    if (!u) return { ok: false, error: 'Falha ao criar usuário' };
    await SecureStore.setItemAsync(KEY, String(u.id));
    setUser(u);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const u = await getUser(user.id);
    if (u) setUser(u);
  }, [user]);

  return <Ctx.Provider value={{ user, ready, initError, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
