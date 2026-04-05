import Database from 'better-sqlite3';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

const DB_PATH = join(homedir(), '.evaluateai-v2', 'db.sqlite');

let _db: Database.Database | null = null;

/**
 * Get a read-only better-sqlite3 connection to the EvaluateAI database.
 * Returns null if the database file does not exist yet.
 */
export function getDb(): Database.Database | null {
  if (_db) return _db;

  if (!existsSync(DB_PATH)) {
    return null;
  }

  _db = new Database(DB_PATH, { readonly: true });
  _db.pragma('journal_mode = WAL');
  return _db;
}

/**
 * Helper to run a query and return rows, or an empty array if the DB is missing.
 */
export function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(sql).all(...params) as T[];
  } catch {
    return [];
  }
}

/**
 * Helper to run a query and return a single row, or null.
 */
export function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare(sql).get(...params) as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper to execute a write statement (for config updates).
 * Opens a writable connection since the default is read-only.
 */
export function execute(sql: string, params: unknown[] = []): Database.RunResult | null {
  if (!existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH);
  try {
    return db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}
