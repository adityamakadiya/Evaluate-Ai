-- Drop redundant indexes on activity_timeline.created_at.
--
-- `created_at` is the DB insertion time; timeline queries must order by
-- `occurred_at` (the real event time) so a bulk backfill doesn't clump
-- every row into the sync timestamp. The baseline indexes in
-- 000_initial_schema.sql (idx_timeline_dev, idx_timeline_team) already
-- cover the hot read paths on (developer_id, occurred_at DESC) and
-- (team_id, occurred_at DESC); leaving the created_at indexes in place
-- costs write amplification for no query benefit.

DROP INDEX IF EXISTS idx_timeline_team_created;
DROP INDEX IF EXISTS idx_timeline_dev_created;
