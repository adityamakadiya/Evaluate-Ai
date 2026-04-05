import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import * as schema from './schema.js';

const DATA_DIR = join(homedir(), '.evaluateai-v2');
const DB_PATH = join(DATA_DIR, 'db.sqlite');

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

export function getDataDir(): string {
  return DATA_DIR;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  return initDb();
}

export function initDb(dbPath?: string): BetterSQLite3Database<typeof schema> {
  const path = dbPath ?? DB_PATH;
  const dir = dbPath ? join(path, '..') : DATA_DIR;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  _sqlite = new Database(path);

  // Enable WAL mode for concurrent reads/writes
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('busy_timeout = 5000');
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });

  // Run migrations inline (simple approach for local SQLite)
  runMigrations(_sqlite);

  return _db;
}

export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      tool                TEXT NOT NULL,
      integration         TEXT NOT NULL,
      project_dir         TEXT,
      git_repo            TEXT,
      git_branch          TEXT,
      model               TEXT,
      started_at          TEXT NOT NULL,
      ended_at            TEXT,
      total_turns         INTEGER NOT NULL DEFAULT 0,
      total_input_tokens  INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_usd      REAL NOT NULL DEFAULT 0,
      total_tool_calls    INTEGER NOT NULL DEFAULT 0,
      files_changed       INTEGER NOT NULL DEFAULT 0,
      avg_prompt_score    REAL,
      efficiency_score    REAL,
      token_waste_ratio   REAL,
      context_peak_pct    REAL,
      analysis            TEXT,
      analyzed_at         TEXT
    );

    CREATE TABLE IF NOT EXISTS turns (
      id                  TEXT PRIMARY KEY,
      session_id          TEXT NOT NULL REFERENCES sessions(id),
      turn_number         INTEGER NOT NULL,
      prompt_text         TEXT,
      prompt_hash         TEXT NOT NULL,
      prompt_tokens_est   INTEGER,
      heuristic_score     REAL,
      anti_patterns       TEXT,
      llm_score           REAL,
      score_breakdown     TEXT,
      suggestion_text     TEXT,
      suggestion_accepted INTEGER,
      tokens_saved_est    INTEGER,
      response_tokens_est INTEGER,
      tool_calls          TEXT,
      latency_ms          INTEGER,
      was_retry           INTEGER NOT NULL DEFAULT 0,
      context_used_pct    REAL,
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_events (
      id                  TEXT PRIMARY KEY,
      session_id          TEXT NOT NULL REFERENCES sessions(id),
      turn_id             TEXT REFERENCES turns(id),
      tool_name           TEXT NOT NULL,
      tool_input_summary  TEXT,
      success             INTEGER,
      execution_ms        INTEGER,
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_calls (
      id                  TEXT PRIMARY KEY,
      session_id          TEXT REFERENCES sessions(id),
      provider            TEXT NOT NULL,
      model               TEXT NOT NULL,
      input_tokens        INTEGER NOT NULL,
      output_tokens       INTEGER NOT NULL,
      cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
      cost_usd            REAL NOT NULL,
      latency_ms          INTEGER NOT NULL,
      status_code         INTEGER NOT NULL,
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scoring_calls (
      id                  TEXT PRIMARY KEY,
      turn_id             TEXT REFERENCES turns(id),
      model               TEXT NOT NULL,
      input_tokens        INTEGER,
      output_tokens       INTEGER,
      cost_usd            REAL,
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key                 TEXT PRIMARY KEY,
      value               TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_dir);
    CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, turn_number);
    CREATE INDEX IF NOT EXISTS idx_turns_hash ON turns(prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_turns_created ON turns(created_at);
    CREATE INDEX IF NOT EXISTS idx_tool_events_session ON tool_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_tool_events_turn ON tool_events(turn_id);
    CREATE INDEX IF NOT EXISTS idx_api_calls_session ON api_calls(session_id);
  `);

  // Insert default config if not exists
  const now = new Date().toISOString();
  const defaults = [
    ['privacy', 'local'],
    ['scoring', 'llm'],
    ['threshold', '50'],
    ['dashboard_port', '3456'],
  ];
  const insert = db.prepare(
    'INSERT OR IGNORE INTO config (key, value, updated_at) VALUES (?, ?, ?)'
  );
  for (const [key, value] of defaults) {
    insert.run(key, value, now);
  }
}
