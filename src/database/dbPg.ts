import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { SCHEMA_PG_STATEMENTS } from './schemaPg';
import type { RunResult } from './db';

function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function isInsert(sql: string): boolean {
  return /^\s*INSERT\b/i.test(sql);
}

function hasReturning(sql: string): boolean {
  return /\bRETURNING\b/i.test(sql);
}

export class PgDbWrapper {
  constructor(private sql: NeonQueryFunction<false, false>) {}

  async execAsync(sqlText: string): Promise<void> {
    const parts = sqlText
      .split(/;\s*(?=\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of parts) {
      await this.sql.query(stmt, []);
    }
  }

  async runAsync(sqlText: string, ...args: any[]): Promise<RunResult> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    let text = toPgPlaceholders(sqlText);
    let returningId = false;
    if (isInsert(text) && !hasReturning(text)) {
      text = text.replace(/\s*;?\s*$/, '') + ' RETURNING id';
      returningId = true;
    }
    const rows = (await this.sql.query(text, flat as any[])) as any[];
    let lastInsertRowId = 0;
    if (returningId && rows.length) lastInsertRowId = Number(rows[0].id ?? 0);
    return { lastInsertRowId, changes: rows.length };
  }

  async getFirstAsync<T = any>(sqlText: string, ...args: any[]): Promise<T | undefined> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const text = toPgPlaceholders(sqlText);
    const rows = (await this.sql.query(text, flat as any[])) as any[];
    return rows[0] as T | undefined;
  }

  async getAllAsync<T = any>(sqlText: string, ...args: any[]): Promise<T[]> {
    const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const text = toPgPlaceholders(sqlText);
    const rows = (await this.sql.query(text, flat as any[])) as any[];
    return rows as T[];
  }
}

export async function connectPg(url: string): Promise<PgDbWrapper> {
  const sql = neon(url);
  const wrapper = new PgDbWrapper(sql);
  for (const stmt of SCHEMA_PG_STATEMENTS) {
    await sql.query(stmt, []);
  }
  return wrapper;
}
