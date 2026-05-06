import initSqlJsImport from 'sql.js/dist/sql-wasm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const initSqlJs = (initSqlJsImport as unknown as { default?: typeof initSqlJsImport }).default ?? initSqlJsImport;
import { SCHEMA_SQL } from './schema';
import { connectPg, PgDbWrapper } from './dbPg';

const STORAGE_KEY = 'banco_de_horas_db_v1';
const IDB_NAME = 'bdh';
const IDB_STORE = 'sqlite';

let _SQL: SqlJsStatic | null = null;
let _db: Database | null = null;
let _wrapper: IDb | null = null;
let _ready: Promise<IDb> | null = null;
let _persistTimer: number | null = null;
let _backend: 'neon' | 'sqljs' | null = null;

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

async function loadSql(): Promise<SqlJsStatic> {
  if (_SQL) return _SQL;
  _SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  return _SQL;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIdb(): Promise<Uint8Array | null> {
  try {
    const idb = await openIdb();
    return await new Promise<Uint8Array | null>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
      req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIdb(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, STORAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[db] persist failed', e);
  }
}

function schedulePersist() {
  if (!_db) return;
  if (_persistTimer != null) window.clearTimeout(_persistTimer);
  _persistTimer = window.setTimeout(() => {
    if (!_db) return;
    const bytes = _db.export();
    void saveToIdb(bytes);
  }, 250);
}

function bindStmt(stmt: ReturnType<Database['prepare']>, args: any[]) {
  if (args.length) stmt.bind(args as any);
}

export class DbWrapper implements IDb {
  constructor(private db: Database) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
    schedulePersist();
  }

  async runAsync(sql: string, ...args: any[]): Promise<RunResult> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const stmt = this.db.prepare(sql);
    try {
      bindStmt(stmt, flat);
      stmt.step();
    } finally {
      stmt.free();
    }
    const res = this.db.exec('SELECT last_insert_rowid() AS id, changes() AS c');
    const row = res[0]?.values[0] ?? [0, 0];
    schedulePersist();
    return { lastInsertRowId: row[0] as number, changes: row[1] as number };
  }

  async getFirstAsync<T = any>(sql: string, ...args: any[]): Promise<T | undefined> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const stmt = this.db.prepare(sql);
    try {
      bindStmt(stmt, flat);
      if (stmt.step()) return stmt.getAsObject() as T;
      return undefined;
    } finally {
      stmt.free();
    }
  }

  async getAllAsync<T = any>(sql: string, ...args: any[]): Promise<T[]> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const stmt = this.db.prepare(sql);
    const out: T[] = [];
    try {
      bindStmt(stmt, flat);
      while (stmt.step()) out.push(stmt.getAsObject() as T);
    } finally {
      stmt.free();
    }
    return out;
  }
}

export function getDb(): IDb {
  if (!_wrapper) throw new Error('DB not initialized — call initDatabase() first');
  return _wrapper;
}

export function getBackend(): 'neon' | 'sqljs' | null {
  return _backend;
}

async function initSqlJsBackend(): Promise<IDb> {
  const SQL = await loadSql();
  const persisted = await loadFromIdb();
  _db = persisted ? new SQL.Database(persisted) : new SQL.Database();
  _db.exec('PRAGMA foreign_keys = ON');
  _db.exec(SCHEMA_SQL.replace(/PRAGMA journal_mode\s*=\s*WAL\s*;?/i, ''));
  schedulePersist();
  _backend = 'sqljs';
  return new DbWrapper(_db);
}

async function initNeonBackend(url: string): Promise<IDb> {
  const wrapper = await connectPg(url);
  _backend = 'neon';
  return wrapper as PgDbWrapper;
}

export async function initDatabase(): Promise<IDb> {
  if (_wrapper) return _wrapper;
  if (_ready) return _ready;
  _ready = (async () => {
    const mode = (import.meta.env.VITE_DB_MODE as string) || 'auto';
    const url = import.meta.env.VITE_DATABASE_URL as string | undefined;

    if (mode === 'sqljs' || (!url && mode !== 'neon')) {
      _wrapper = await initSqlJsBackend();
      console.info('[db] backend: sql.js (offline)');
      return _wrapper;
    }

    if (mode === 'neon') {
      if (!url) throw new Error('VITE_DATABASE_URL ausente — modo neon requer URL');
      _wrapper = await initNeonBackend(url);
      console.info('[db] backend: neon');
      return _wrapper;
    }

    try {
      _wrapper = await initNeonBackend(url!);
      console.info('[db] backend: neon');
    } catch (e) {
      console.warn('[db] neon falhou, fallback sql.js offline', e);
      _wrapper = await initSqlJsBackend();
      console.info('[db] backend: sql.js (fallback)');
    }
    return _wrapper;
  })();
  return _ready;
}

export async function resetDatabase(): Promise<void> {
  await initDatabase();
  const db = _wrapper;
  if (!db) return;
  const tables = ['audit_logs','settings','notifications','overtime_usage','work_days','punch_records','shifts','users'];
  if (_backend === 'sqljs' && _db) {
    _db.exec(tables.map(t => `DROP TABLE IF EXISTS ${t};`).join('\n'));
    _db.exec(SCHEMA_SQL.replace(/PRAGMA journal_mode\s*=\s*WAL\s*;?/i, ''));
    schedulePersist();
    return;
  }
  for (const t of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
  const { SCHEMA_PG_STATEMENTS } = await import('./schemaPg');
  for (const stmt of SCHEMA_PG_STATEMENTS) {
    await db.execAsync(stmt);
  }
}
