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

function isPermissionError(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? '';
  return /permission denied|must be owner/i.test(msg);
}

function isMissingTableError(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? '';
  return /relation .* does not exist/i.test(msg);
}

export async function connectPg(url: string): Promise<PgDbWrapper> {
  const sql = neon(url);
  const wrapper = new PgDbWrapper(sql);

  // Tenta criar schema. Se a role não tiver CREATE em public, ignora silenciosamente
  // — assume que o owner já criou as tabelas via SQL editor do Neon.
  let permissionDenied = false;
  for (const stmt of SCHEMA_PG_STATEMENTS) {
    try {
      await sql.query(stmt, []);
    } catch (e) {
      if (isPermissionError(e)) {
        permissionDenied = true;
        break;
      }
      throw e;
    }
  }

  // Smoke test: verifica que `users` existe.
  try {
    await sql.query('SELECT 1 FROM users LIMIT 1', []);
  } catch (e) {
    if (isMissingTableError(e)) {
      const setupSql = SCHEMA_PG_STATEMENTS.map((s) => s.trim() + ';').join('\n\n');
      const hint = permissionDenied
        ? 'Sua role Neon não tem permissão para CREATE TABLE. Conecte-se ao Neon como owner (ou use o SQL Editor do console) e rode o schema abaixo, OU conceda permissões à role atual:\n\n' +
          'GRANT USAGE, CREATE ON SCHEMA public TO <sua_role>;\n' +
          'GRANT ALL ON ALL TABLES IN SCHEMA public TO <sua_role>;\n' +
          'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO <sua_role>;\n\n' +
          'Schema completo:\n\n' + setupSql
        : 'Tabelas não existem. Execute o schema no Neon:\n\n' + setupSql;
      console.error('[db] schema ausente.\n' + hint);
      throw new Error('Banco Neon sem as tabelas necessárias. Veja console (instruções de setup).');
    }
    throw e;
  }

  return wrapper;
}
