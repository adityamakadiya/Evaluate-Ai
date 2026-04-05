-- ============================================================
-- EvaluateAI v2 — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id),
  team_id             UUID,
  tool                TEXT NOT NULL,
  integration         TEXT NOT NULL,
  project_dir         TEXT,
  git_repo            TEXT,
  git_branch          TEXT,
  model               TEXT,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,

  total_turns         INTEGER NOT NULL DEFAULT 0,
  total_input_tokens  INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd      DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_tool_calls    INTEGER NOT NULL DEFAULT 0,
  files_changed       INTEGER NOT NULL DEFAULT 0,

  avg_prompt_score    DOUBLE PRECISION,
  efficiency_score    DOUBLE PRECISION,
  token_waste_ratio   DOUBLE PRECISION,
  context_peak_pct    DOUBLE PRECISION,

  analysis            JSONB,
  analyzed_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TURNS
-- ============================================================
CREATE TABLE IF NOT EXISTS turns (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number         INTEGER NOT NULL,

  prompt_text         TEXT,
  prompt_hash         TEXT NOT NULL,
  prompt_tokens_est   INTEGER,

  heuristic_score     DOUBLE PRECISION,
  anti_patterns       JSONB,

  llm_score           DOUBLE PRECISION,
  score_breakdown     JSONB,

  suggestion_text     TEXT,
  suggestion_accepted BOOLEAN,
  tokens_saved_est    INTEGER,

  response_tokens_est INTEGER,
  tool_calls          JSONB,
  latency_ms          INTEGER,

  was_retry           BOOLEAN NOT NULL DEFAULT FALSE,
  context_used_pct    DOUBLE PRECISION,

  created_at          TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- TOOL EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_events (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_id             TEXT REFERENCES turns(id) ON DELETE SET NULL,
  tool_name           TEXT NOT NULL,
  tool_input_summary  TEXT,
  success             BOOLEAN,
  execution_ms        INTEGER,
  created_at          TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- API CALLS (from proxy)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_calls (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,
  input_tokens        INTEGER NOT NULL,
  output_tokens       INTEGER NOT NULL,
  cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_usd            DOUBLE PRECISION NOT NULL,
  latency_ms          INTEGER NOT NULL,
  status_code         INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- SCORING CALLS
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_calls (
  id                  TEXT PRIMARY KEY,
  turn_id             TEXT REFERENCES turns(id) ON DELETE SET NULL,
  model               TEXT NOT NULL,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  cost_usd            DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- TEAMS (for team features)
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_team ON sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_dir);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_turns_hash ON turns(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_turns_created ON turns(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_events_session ON tool_events(session_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_session ON api_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Sessions: users can see their own + their team's sessions
CREATE POLICY sessions_own ON sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY sessions_team ON sessions FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Turns: accessible if session is accessible
CREATE POLICY turns_access ON turns FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid()
         OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Tool events: same as turns
CREATE POLICY tool_events_access ON tool_events FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid()
         OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Teams: members can see their teams
CREATE POLICY teams_member ON teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY teams_create ON teams FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Team members: can see own team members
CREATE POLICY team_members_access ON team_members FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- FUNCTIONS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS: Useful aggregations
-- ============================================================

-- Daily stats per user
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  user_id,
  DATE(started_at) as day,
  COUNT(*) as session_count,
  SUM(total_turns) as total_turns,
  SUM(total_input_tokens) as total_input_tokens,
  SUM(total_output_tokens) as total_output_tokens,
  SUM(total_cost_usd) as total_cost,
  AVG(avg_prompt_score) as avg_score,
  AVG(efficiency_score) as avg_efficiency
FROM sessions
WHERE ended_at IS NOT NULL
GROUP BY user_id, DATE(started_at);

-- Team stats
CREATE OR REPLACE VIEW team_stats AS
SELECT
  s.team_id,
  tm.user_id,
  DATE(s.started_at) as day,
  COUNT(*) as session_count,
  SUM(s.total_cost_usd) as total_cost,
  AVG(s.avg_prompt_score) as avg_score,
  AVG(s.efficiency_score) as avg_efficiency
FROM sessions s
JOIN team_members tm ON s.user_id = tm.user_id AND s.team_id = tm.team_id
WHERE s.ended_at IS NOT NULL
GROUP BY s.team_id, tm.user_id, DATE(s.started_at);
