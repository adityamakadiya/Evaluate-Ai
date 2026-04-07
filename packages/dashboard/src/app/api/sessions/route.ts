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

  if (!teamId) {
    return NextResponse.json(
      { error: 'team_id is required (pass as query param or x-team-id header)', sessions: [], total: 0 },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const { searchParams } = request.nextUrl;

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
    const sort = ALLOWED_SORT_COLUMNS.has(searchParams.get('sort') ?? '')
      ? searchParams.get('sort')!
      : 'started_at';
    const order = (searchParams.get('order') ?? 'desc').toLowerCase() === 'asc';

    const { data, count } = await supabase
      .from('ai_sessions')
      .select('id, tool, model, started_at, ended_at, total_turns, total_cost_usd, avg_prompt_score, efficiency_score, project_dir, git_branch', { count: 'exact' })
      .eq('team_id', teamId)
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
