import { getDb } from '../db';
import { User, ContractType } from '@/types';

export async function createUser(input: {
  name: string;
  email: string;
  password_hash: string;
  contract_type: ContractType;
}): Promise<number> {
  const db = getDb();
  const r = await db.runAsync(
    `INSERT INTO users (name,email,password_hash,contract_type) VALUES (?,?,?,?)`,
    input.name, input.email, input.password_hash, input.contract_type
  );
  return r.lastInsertRowId as number;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const row = await db.getFirstAsync<User>(`SELECT * FROM users WHERE email = ?`, email);
  return row ?? null;
}

export async function getUser(id: number): Promise<User | null> {
  const db = getDb();
  return (await db.getFirstAsync<User>(`SELECT * FROM users WHERE id = ?`, id)) ?? null;
}

export async function updateUser(id: number, patch: Partial<User>): Promise<void> {
  const db = getDb();
  const fields = Object.keys(patch).filter(k => k !== 'id');
  if (!fields.length) return;
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const vals = fields.map(f => (patch as any)[f]);
  await db.runAsync(`UPDATE users SET ${sets} WHERE id = ?`, ...vals, id);
}
