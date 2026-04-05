import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

const ALLOWED_SORT_COLUMNS = new Set([
  'started_at',
  'ended_at',
  'total_turns',
  'total_cost_usd',
  'avg_prompt_score',
  'efficiency_score',
  'model',
  'tool',
]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
  const sort = ALLOWED_SORT_COLUMNS.has(searchParams.get('sort') ?? '')
    ? searchParams.get('sort')!
    : 'started_at';
  const order = (searchParams.get('order') ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const sessions = query(
    `SELECT
       id,
       tool,
       model,
       started_at as startedAt,
       ended_at as endedAt,
       total_turns as totalTurns,
       total_cost_usd as totalCostUsd,
       avg_prompt_score as avgPromptScore,
       efficiency_score as efficiencyScore,
       project_dir as projectDir,
       git_branch as gitBranch
     FROM sessions
     ORDER BY ${sort} ${order}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const totalRow = queryOne<{ total: number }>('SELECT COUNT(*) as total FROM sessions');
  const total = totalRow?.total ?? 0;

  return NextResponse.json({ sessions, total });
}
