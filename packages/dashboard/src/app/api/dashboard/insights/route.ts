import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/dashboard/insights?days=7
 *
 * Returns aggregated anti-pattern rankings, tool usage stats, and retry rates.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 7), 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const supabase = getSupabaseAdmin();

  try {
    // ── Anti-patterns ──────────────────────────────────────
    const { data: turnsData } = await supabase
      .from('ai_turns')
      .select('anti_patterns, developer_id, was_retry')
      .eq('team_id', ctx.teamId)
      .gte('created_at', since)
      .not('anti_patterns', 'is', null);

    const patternMap = new Map<string, { count: number; developers: Set<string> }>();
    let totalTurns = 0;
    let retryCount = 0;

    for (const turn of turnsData ?? []) {
      totalTurns++;
      if (turn.was_retry) retryCount++;

      const patterns = turn.anti_patterns as string[] | null;
      if (!patterns || !Array.isArray(patterns)) continue;

      for (const p of patterns) {
        const entry = patternMap.get(p) ?? { count: 0, developers: new Set<string>() };
        entry.count++;
        if (turn.developer_id) entry.developers.add(turn.developer_id);
        patternMap.set(p, entry);
      }
    }

    const antiPatterns = [...patternMap.entries()]
      .map(([pattern, { count, developers }]) => ({
        pattern,
        count,
        developers: developers.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── Tool usage (from session-level summaries, computed from transcript at session_end) ──
    const { data: sessionsWithTools } = await supabase
      .from('ai_sessions')
      .select('tool_usage_summary, developer_id')
      .eq('team_id', ctx.teamId)
      .gte('started_at', since)
      .not('tool_usage_summary', 'is', null);

    const toolMap = new Map<string, {
      count: number;
      developers: Set<string>;
    }>();

    for (const session of sessionsWithTools ?? []) {
      const summary = session.tool_usage_summary as Record<string, number> | null;
      if (!summary || typeof summary !== 'object') continue;

      for (const [toolName, count] of Object.entries(summary)) {
        const entry = toolMap.get(toolName) ?? { count: 0, developers: new Set<string>() };
        entry.count += count;
        if (session.developer_id) entry.developers.add(session.developer_id);
        toolMap.set(toolName, entry);
      }
    }

    const toolUsage = [...toolMap.entries()]
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        developers: stats.developers.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    // ── Retry rate by developer ────────────────────────────
    const retryByDev = new Map<string, { retries: number; total: number }>();
    for (const turn of turnsData ?? []) {
      if (!turn.developer_id) continue;
      const entry = retryByDev.get(turn.developer_id) ?? { retries: 0, total: 0 };
      entry.total++;
      if (turn.was_retry) entry.retries++;
      retryByDev.set(turn.developer_id, entry);
    }

    // Resolve developer names
    const devIds = [...retryByDev.keys()];
    const devNames: Record<string, string> = {};
    if (devIds.length > 0) {
      const { data: devRows } = await supabase
        .from('team_members')
        .select('id, name')
        .in('id', devIds);
      for (const d of devRows ?? []) {
        devNames[d.id] = d.name;
      }
    }

    const retryRates = [...retryByDev.entries()]
      .map(([devId, stats]) => ({
        developerId: devId,
        developerName: devNames[devId] ?? 'Unknown',
        retries: stats.retries,
        total: stats.total,
        rate: stats.total > 0 ? Math.round((stats.retries / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    return NextResponse.json({
      days,
      antiPatterns,
      toolUsage,
      retryRate: totalTurns > 0 ? Math.round((retryCount / totalTurns) * 100) : 0,
      retryRates,
      totalTurns,
    });
  } catch (err) {
    console.error('Insights API error:', err);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
