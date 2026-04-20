-- Performance indexes for /api/dashboard/overview and other team-scoped
-- aggregations. Complements the baseline indexes in 000_initial_schema.sql;
-- every statement is idempotent so this migration is safe to re-run.
--
-- Context: the overview route filters by (team_id, time_col) and orders by
-- time_col DESC. Baseline indexes covered (team_id, started_at) on ai_sessions
-- and (team_id, is_read, created_at) on alerts, but left other hot paths
-- without a matching composite index — forcing sequential scans on growing
-- tables.

CREATE INDEX IF NOT EXISTS idx_code_changes_team_created
  ON code_changes (team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_team_created
  ON tasks (team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_created
  ON tasks (assignee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_team_created
  ON activity_timeline (team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_dev_created
  ON activity_timeline (developer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_dev_read_created
  ON alerts (developer_id, is_read, created_at DESC);
