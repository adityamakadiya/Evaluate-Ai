import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/client.js';

// ============================================================
// Helpers
// ============================================================

function createTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'evaluateai-test-'));
  return join(dir, 'test.sqlite');
}

let tempPaths: string[] = [];

function getTempDb() {
  const dbPath = createTempDbPath();
  tempPaths.push(dbPath);
  return { dbPath, db: initDb(dbPath) };
}

afterEach(() => {
  closeDb();
  for (const p of tempPaths) {
    try {
      const dir = join(p, '..');
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  tempPaths = [];
});

// ============================================================
// initDb — database creation
// ============================================================

describe('initDb — database creation', () => {
  it('creates a SQLite database file at the given path', () => {
    const { dbPath } = getTempDb();
    // Verify the file is a valid SQLite database by opening it directly
    const raw = new Database(dbPath, { readonly: true });
    const result = raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = result.map(r => r.name);
    expect(tableNames.length).toBeGreaterThan(0);
    raw.close();
  });

  it('creates all expected tables', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const result = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    const tableNames = result.map(r => r.name);
    raw.close();

    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('turns');
    expect(tableNames).toContain('tool_events');
    expect(tableNames).toContain('api_calls');
    expect(tableNames).toContain('scoring_calls');
    expect(tableNames).toContain('config');
  });

  it('creates expected indexes', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const result = raw.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all() as { name: string }[];
    const indexNames = result.map(r => r.name);
    raw.close();

    expect(indexNames).toContain('idx_sessions_started');
    expect(indexNames).toContain('idx_sessions_project');
    expect(indexNames).toContain('idx_turns_session');
    expect(indexNames).toContain('idx_turns_hash');
    expect(indexNames).toContain('idx_turns_created');
    expect(indexNames).toContain('idx_tool_events_session');
    expect(indexNames).toContain('idx_tool_events_turn');
    expect(indexNames).toContain('idx_api_calls_session');
  });

  it('is idempotent — calling initDb twice does not error', () => {
    const dbPath = createTempDbPath();
    tempPaths.push(dbPath);
    closeDb();
    initDb(dbPath);
    closeDb();
    expect(() => initDb(dbPath)).not.toThrow();
  });
});

// ============================================================
// Default config values
// ============================================================

describe('initDb — default config', () => {
  it('inserts default config key-value pairs', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const rows = raw.prepare('SELECT key, value FROM config ORDER BY key').all() as { key: string; value: string }[];
    raw.close();

    const configMap = Object.fromEntries(rows.map(r => [r.key, r.value]));
    expect(configMap['privacy']).toBe('local');
    expect(configMap['scoring']).toBe('llm');
    expect(configMap['threshold']).toBe('50');
    expect(configMap['dashboard_port']).toBe('3456');
  });

  it('default config rows have updated_at timestamps', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const rows = raw.prepare('SELECT key, updated_at FROM config').all() as { key: string; updated_at: string }[];
    raw.close();

    for (const row of rows) {
      expect(row.updated_at).toBeTruthy();
      // Verify it parses as a valid ISO date
      expect(new Date(row.updated_at).getTime()).not.toBeNaN();
    }
  });

  it('does not overwrite existing config on re-init', () => {
    const dbPath = createTempDbPath();
    tempPaths.push(dbPath);

    initDb(dbPath);

    // Manually update a config value
    const raw = new Database(dbPath);
    raw.prepare("UPDATE config SET value = 'hash' WHERE key = 'privacy'").run();
    raw.close();

    closeDb();

    // Re-initialize
    initDb(dbPath);

    const raw2 = new Database(dbPath, { readonly: true });
    const row = raw2.prepare("SELECT value FROM config WHERE key = 'privacy'").get() as { value: string };
    raw2.close();

    expect(row.value).toBe('hash'); // Should NOT be overwritten back to 'local'
  });
});

// ============================================================
// WAL mode
// ============================================================

describe('initDb — WAL mode', () => {
  it('enables WAL journal mode', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const result = raw.pragma('journal_mode') as { journal_mode: string }[];
    raw.close();

    expect(result[0].journal_mode).toBe('wal');
  });

  it('enables foreign keys', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const result = raw.pragma('foreign_keys') as { foreign_keys: number }[];
    raw.close();

    expect(result[0].foreign_keys).toBe(1);
  });
});

// ============================================================
// Table schema verification
// ============================================================

describe('initDb — table schemas', () => {
  it('sessions table has expected columns', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const columns = raw.prepare("PRAGMA table_info('sessions')").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    raw.close();

    expect(colNames).toContain('id');
    expect(colNames).toContain('tool');
    expect(colNames).toContain('integration');
    expect(colNames).toContain('model');
    expect(colNames).toContain('started_at');
    expect(colNames).toContain('total_turns');
    expect(colNames).toContain('total_cost_usd');
    expect(colNames).toContain('avg_prompt_score');
  });

  it('turns table has expected columns', () => {
    const { dbPath } = getTempDb();
    const raw = new Database(dbPath, { readonly: true });
    const columns = raw.prepare("PRAGMA table_info('turns')").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    raw.close();

    expect(colNames).toContain('id');
    expect(colNames).toContain('session_id');
    expect(colNames).toContain('turn_number');
    expect(colNames).toContain('prompt_text');
    expect(colNames).toContain('heuristic_score');
    expect(colNames).toContain('was_retry');
    expect(colNames).toContain('context_used_pct');
  });
});
