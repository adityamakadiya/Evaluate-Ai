import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PeriodStats {
  sessions: number;
  turns: number;
  tokens: number;
  cost: number;
  avgScore: number | null;
  efficiency: number | null;
}

function periodStats(fromDate: string, toDate: string): PeriodStats {
  const row = query<{
    sessions: number;
    turns: number;
    tokens: number;
    cost: number;
    avgScore: number | null;
    efficiency: number | null;
  }>(
    `SELECT
       COUNT(*) as sessions,
       COALESCE(SUM(total_turns), 0) as turns,
       COALESCE(SUM(total_input_tokens + total_output_tokens), 0) as tokens,
       COALESCE(SUM(total_cost_usd), 0) as cost,
       AVG(avg_prompt_score) as avgScore,
       AVG(efficiency_score) as efficiency
     FROM sessions
     WHERE started_at >= ? AND started_at < ?`,
    [fromDate, toDate]
  )[0];

  return row ?? { sessions: 0, turns: 0, tokens: 0, cost: 0, avgScore: null, efficiency: null };
}

export async function GET() {
  const now = new Date();

  // Today boundaries
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  // Week boundaries (Monday-based)
  const dayOfWeek = now.getDay() || 7; // Sunday=7
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = prevWeekStart.toISOString().slice(0, 10);

  // Month boundaries
  const monthStartStr = `${todayStr.slice(0, 7)}-01`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStartStr = prevMonthDate.toISOString().slice(0, 10).slice(0, 7) + '-01';
  const prevMonthEndStr = monthStartStr;

  // Gather period stats
  const today = periodStats(todayStr, tomorrowStr);
  const thisWeek = periodStats(weekStartStr, tomorrowStr);
  const thisMonth = periodStats(monthStartStr, tomorrowStr);
  const previousDay = periodStats(yesterdayStr, todayStr);
  const previousWeek = periodStats(prevWeekStartStr, weekStartStr);
  const previousMonth = periodStats(prevMonthStartStr, prevMonthEndStr);

  // Cost trend (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const costTrend = query<{ date: string; cost: number }>(
    `SELECT DATE(started_at) as date, COALESCE(SUM(total_cost_usd), 0) as cost
     FROM sessions
     WHERE started_at >= ?
     GROUP BY DATE(started_at)
     ORDER BY date`,
    [thirtyDaysAgo]
  );

  // Score trend (last 30 days)
  const scoreTrend = query<{ date: string; score: number }>(
    `SELECT DATE(started_at) as date, AVG(avg_prompt_score) as score
     FROM sessions
     WHERE started_at >= ? AND avg_prompt_score IS NOT NULL
     GROUP BY DATE(started_at)
     ORDER BY date`,
    [thirtyDaysAgo]
  );

  // Top anti-patterns
  const topAntiPatterns = query<{ pattern: string; count: number }>(
    `SELECT j.value as pattern, COUNT(*) as count
     FROM turns, json_each(turns.anti_patterns) as j
     WHERE turns.anti_patterns IS NOT NULL AND turns.anti_patterns != '[]'
     GROUP BY j.value
     ORDER BY count DESC
     LIMIT 10`
  );

  // Model usage
  const modelUsage = query<{ model: string; count: number; cost: number }>(
    `SELECT model, COUNT(*) as count, COALESCE(SUM(total_cost_usd), 0) as cost
     FROM sessions
     WHERE model IS NOT NULL
     GROUP BY model
     ORDER BY count DESC`
  );

  // Recent sessions with first prompt as task name
  const recentSessions = query<{
    id: string;
    task: string;
    turns: number;
    cost: number;
    score: number | null;
    startedAt: string;
  }>(
    `SELECT
       s.id,
       COALESCE(
         SUBSTR(t.prompt_text, 1, 80) || CASE WHEN LENGTH(t.prompt_text) > 80 THEN '...' ELSE '' END,
         'Session ' || SUBSTR(s.id, 1, 8)
       ) as task,
       s.total_turns as turns,
       s.total_cost_usd as cost,
       s.avg_prompt_score as score,
       s.started_at as startedAt
     FROM sessions s
     LEFT JOIN turns t ON t.session_id = s.id AND t.turn_number = 1
     ORDER BY s.started_at DESC
     LIMIT 15`
  );

  return NextResponse.json({
    today,
    thisWeek,
    thisMonth,
    previousDay,
    previousWeek,
    previousMonth,
    costTrend,
    scoreTrend,
    topAntiPatterns,
    modelUsage,
    recentSessions,
  });
}
