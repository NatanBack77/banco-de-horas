import { connectPg, PgDbWrapper } from './dbPg';

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface IDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...args: any[]): Promise<RunResult>;
  getFirstAsync<T = any>(sql: string, ...args: any[]): Promise<T | undefined>;
  getAllAsync<T = any>(sql: string, ...args: any[]): Promise<T[]>;
}

const CACHE_PREFIX = 'bdh_cache_v1:';
const ONLINE_EVENT = 'bdh:online-change';

let _wrapper: IDb | null = null;
let _ready: Promise<IDb> | null = null;
let _online = true;

function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch { return undefined; }
}

function writeCache(key: string, val: unknown): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(val)); } catch {}
}

function cacheKey(sql: string, args: any[]): string {
  return JSON.stringify([sql.trim().replace(/\s+/g, ' '), args]);
}

function setOnline(v: boolean) {
  if (_online === v) return;
  _online = v;
  window.dispatchEvent(new CustomEvent(ONLINE_EVENT, { detail: v }));
}

export function isOnline(): boolean { return _online; }

/**
 * Wrapper que envia queries ao Neon e cacheia leituras em localStorage.
 * Em falha de rede, retorna cache anterior (modo "stale-while-offline").
 * Writes só funcionam online — falham se sem conexão.
 */
class CachedDb implements IDb {
  constructor(private inner: PgDbWrapper) {}

  async execAsync(sql: string): Promise<void> {
    try {
      await this.inner.execAsync(sql);
      setOnline(true);
    } catch (e) {
      setOnline(false);
      throw e;
    }
  }

  async runAsync(sql: string, ...args: any[]): Promise<RunResult> {
    try {
      const r = await this.inner.runAsync(sql, ...args);
      setOnline(true);
      return r;
    } catch (e) {
      setOnline(false);
      throw e;
    }
  }

  async getFirstAsync<T = any>(sql: string, ...args: any[]): Promise<T | undefined> {
    const key = cacheKey(sql, args);
    try {
      const r = await this.inner.getFirstAsync<T>(sql, ...args);
      writeCache(key, r ?? null);
      setOnline(true);
      return r;
    } catch (e) {
      setOnline(false);
      const cached = readCache<T | null>(key);
      if (cached !== undefined) return cached ?? undefined;
      throw e;
    }
  }

  async getAllAsync<T = any>(sql: string, ...args: any[]): Promise<T[]> {
    const key = cacheKey(sql, args);
    try {
      const r = await this.inner.getAllAsync<T>(sql, ...args);
      writeCache(key, r);
      setOnline(true);
      return r;
    } catch (e) {
      setOnline(false);
      const cached = readCache<T[]>(key);
      if (cached !== undefined) return cached;
      throw e;
    }
  }
}

export function getDb(): IDb {
  if (!_wrapper) throw new Error('DB não inicializado — chame initDatabase() primeiro');
  return _wrapper;
}

export async function initDatabase(): Promise<IDb> {
  if (_wrapper) return _wrapper;
  if (_ready) return _ready;
  _ready = (async () => {
    const url = import.meta.env.VITE_DATABASE_URL as string | undefined;
    if (!url) {
      throw new Error('VITE_DATABASE_URL ausente. Defina em .env');
    }
    const inner = await connectPg(url);
    _wrapper = new CachedDb(inner);
    setOnline(true);
    return _wrapper;
  })();
  return _ready;
}

export async function resetDatabase(): Promise<void> {
  const db = await initDatabase();
  const tables = ['audit_logs','settings','notifications','overtime_usage','work_days','punch_records','shifts','users'];
  for (const t of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
  const { SCHEMA_PG_STATEMENTS } = await import('./schemaPg');
  for (const stmt of SCHEMA_PG_STATEMENTS) {
    await db.execAsync(stmt);
  }
  // Limpa cache local
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
  }
}

export { ONLINE_EVENT };
