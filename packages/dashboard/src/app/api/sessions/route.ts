import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

function getTeamId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('team_id')
    || request.headers.get('x-team-id')
    || null;
}

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
  const teamId = getTeamId(request);
  const developerId = request.nextUrl.searchParams.get('developer_id');
  // team_id is optional — if not provided, returns all sessions (developer view)
  // if developer_id provided, filters to that developer's sessions

  try {
    const supabase = getSupabase();
    const { searchParams } = request.nextUrl;

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
    const sort = ALLOWED_SORT_COLUMNS.has(searchParams.get('sort') ?? '')
      ? searchParams.get('sort')!
      : 'started_at';
    const order = (searchParams.get('order') ?? 'desc').toLowerCase() === 'asc';

    let query = supabase
      .from('ai_sessions')
      .select('id, tool, model, started_at, ended_at, total_turns, total_cost_usd, avg_prompt_score, efficiency_score, project_dir, git_branch, developer_id, team_id', { count: 'exact' });

    if (teamId) query = query.eq('team_id', teamId);
    if (developerId) query = query.eq('developer_id', developerId);

    const { data, count } = await query
      .order(sort, { ascending: order })
      .range(offset, offset + limit - 1);

    const sessions = (data ?? []).map(s => ({
      id: s.id,
      tool: s.tool,
      model: s.model,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      totalTurns: s.total_turns,
      totalCostUsd: s.total_cost_usd,
      avgPromptScore: s.avg_prompt_score,
      efficiencyScore: s.efficiency_score,
      projectDir: s.project_dir,
      gitBranch: s.git_branch,
    }));

    return NextResponse.json({ sessions, total: count ?? 0 });
  } catch (err) {
    console.error('Sessions API error:', err);
    return NextResponse.json({ sessions: [], total: 0 });
  }
}
