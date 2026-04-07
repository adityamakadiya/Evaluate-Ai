import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

function getTeamId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('team_id')
    || request.headers.get('x-team-id')
    || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = getTeamId(request);
    const supabase = getSupabase();
    const now = new Date();
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    // Week boundaries
    const dayOfWeek = now.getDay() || 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // 30 days ago
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    // Fetch developer info
    let memberQuery = supabase
      .from('team_members')
      .select('id, name, email, role, github_username, evaluateai_installed')
      .eq('id', id);
    if (teamId) memberQuery = memberQuery.eq('team_id', teamId);
    const { data: member } = await memberQuery.single();

    if (!member) {
      return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
    }

    const devId = member.id;

    // AI sessions this week
    let weekQ = supabase.from('ai_sessions')
      .select('id, model, total_cost_usd, avg_prompt_score, total_turns, total_input_tokens, total_output_tokens, started_at')
      .eq('developer_id', devId)
      .gte('started_at', weekStartStr)
      .order('started_at', { ascending: false });
    if (teamId) weekQ = weekQ.eq('team_id', teamId);
    const { data: weekSessions } = await weekQ;

    // AI sessions last 30 days for trends
    let monthQ = supabase.from('ai_sessions')
      .select('id, model, total_cost_usd, avg_prompt_score, started_at')
      .eq('developer_id', devId)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false });
    if (teamId) monthQ = monthQ.eq('team_id', teamId);
    const { data: monthSessions } = await monthQ;

    // Code changes this week
    let weekCodeQ = supabase.from('code_changes')
      .select('id, type, title, description, repo, files_changed, additions, deletions, branch, created_at')
      .eq('developer_id', devId)
      .gte('created_at', weekStartStr)
      .order('created_at', { ascending: false });
    if (teamId) weekCodeQ = weekCodeQ.eq('team_id', teamId);
    const { data: weekCode } = await weekCodeQ;

    // Code changes last 30 days
    let monthCodeQ = supabase.from('code_changes')
      .select('type, created_at')
      .eq('developer_id', devId)
      .gte('created_at', thirtyDaysAgo);
    if (teamId) monthCodeQ = monthCodeQ.eq('team_id', teamId);
    const { data: monthCode } = await monthCodeQ;

    // Tasks
    let tasksQ = supabase.from('tasks')
      .select('id, title, status, source, created_at')
      .eq('assignee_id', devId)
      .order('created_at', { ascending: false });
    if (teamId) tasksQ = tasksQ.eq('team_id', teamId);
    const { data: devTasks } = await tasksQ;

    // Anti-patterns from ai_turns
    const sessionIds = (weekSessions ?? []).map(s => s.id);
    let antiPatterns: { pattern: string; count: number }[] = [];
    if (sessionIds.length > 0) {
      const { data: turnData } = await supabase
        .from('ai_turns')
        .select('anti_patterns')
        .in('session_id', sessionIds)
        .not('anti_patterns', 'is', null);

      const patternCounts: Record<string, number> = {};
      for (const row of turnData ?? []) {
        const patterns = row.anti_patterns;
        if (!Array.isArray(patterns)) continue;
        for (const p of patterns) {
          const pid = typeof p === 'string' ? p : (p as Record<string, unknown>)?.id;
          if (typeof pid === 'string') {
            patternCounts[pid] = (patternCounts[pid] ?? 0) + 1;
          }
        }
      }
      antiPatterns = Object.entries(patternCounts)
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    // Model usage breakdown
    const modelMap: Record<string, { count: number; cost: number }> = {};
    for (const s of monthSessions ?? []) {
      const m = s.model ?? 'unknown';
      if (!modelMap[m]) modelMap[m] = { count: 0, cost: 0 };
      modelMap[m].count++;
      modelMap[m].cost += s.total_cost_usd ?? 0;
    }
    const modelUsage = Object.entries(modelMap)
      .map(([model, { count, cost }]) => ({ model, count, cost }))
      .sort((a, b) => b.count - a.count);

    // Compute stats
    const totalAiCost = (weekSessions ?? []).reduce((s, r) => s + (r.total_cost_usd ?? 0), 0);
    const scores = (weekSessions ?? []).filter(s => s.avg_prompt_score != null).map(s => s.avg_prompt_score!);
    const avgPromptScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const commitsWeek = (weekCode ?? []).filter(c => c.type === 'commit').length;
    const prsWeek = (weekCode ?? []).filter(c => c.type === 'pr_opened' || c.type === 'pr_merged').length;
    const reviewsWeek = (weekCode ?? []).filter(c => c.type === 'review').length;

    const tasksCompleted = (devTasks ?? []).filter(t => t.status === 'completed').length;
    const tasksAssigned = (devTasks ?? []).length;

    // Commits per day (last 30 days)
    const commitsByDay: Record<string, number> = {};
    for (const c of monthCode ?? []) {
      if (c.type === 'commit') {
        const d = (c.created_at as string).slice(0, 10);
        commitsByDay[d] = (commitsByDay[d] ?? 0) + 1;
      }
    }
    const commitsPerDay = Object.entries(commitsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Score trend (last 30 days)
    const scoreByDate: Record<string, { sum: number; count: number }> = {};
    for (const s of monthSessions ?? []) {
      if (s.avg_prompt_score != null) {
        const d = (s.started_at as string).slice(0, 10);
        if (!scoreByDate[d]) scoreByDate[d] = { sum: 0, count: 0 };
        scoreByDate[d].sum += s.avg_prompt_score;
        scoreByDate[d].count++;
      }
    }
    const scoreTrend = Object.entries(scoreByDate)
      .map(([date, { sum, count }]) => ({ date, score: Math.round(sum / count) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate insights
    const insights: string[] = [];

    // Model cost insight
    const topModel = modelUsage[0];
    const altModel = modelUsage.find(m => m.model !== topModel?.model);
    if (topModel && altModel && topModel.cost > altModel.cost * 2) {
      const potentialSavings = Math.round((topModel.cost - altModel.cost) * 100) / 100;
      insights.push(
        `Uses ${topModel.model} for ${Math.round((topModel.count / (monthSessions ?? []).length) * 100)}% of queries — switching to ${altModel.model} could save ~$${potentialSavings.toFixed(2)}/week`
      );
    }

    // Score trend insight
    if (scoreTrend.length >= 7) {
      const firstWeek = scoreTrend.slice(0, Math.ceil(scoreTrend.length / 2));
      const secondWeek = scoreTrend.slice(Math.ceil(scoreTrend.length / 2));
      const avgFirst = firstWeek.reduce((s, r) => s + r.score, 0) / firstWeek.length;
      const avgSecond = secondWeek.reduce((s, r) => s + r.score, 0) / secondWeek.length;
      if (avgSecond > avgFirst + 5) {
        insights.push(`Prompt score improved from ${Math.round(avgFirst)} to ${Math.round(avgSecond)} this month`);
      } else if (avgFirst > avgSecond + 5) {
        insights.push(`Prompt score declined from ${Math.round(avgFirst)} to ${Math.round(avgSecond)} — may need coaching`);
      }
    }

    // Anti-pattern insight
    const retryPattern = antiPatterns.find(p => p.pattern.includes('retry'));
    if (retryPattern && retryPattern.count >= 3) {
      insights.push(`Retries prompts ${retryPattern.count}x/week — prompt coaching would improve efficiency`);
    }

    // Task alignment insight
    if (tasksAssigned > 0 && tasksCompleted < tasksAssigned * 0.5) {
      const unplanned = commitsWeek - tasksCompleted;
      if (unplanned > 3) {
        insights.push(`${unplanned} unplanned commits — may need task re-alignment`);
      }
    }

    // Inactive insight
    if ((weekSessions ?? []).length === 0) {
      insights.push(`Hasn't used AI tools this week — may not have evaluateai installed`);
    }

    return NextResponse.json({
      developer: {
        id: member.id,
        userId: devId,
        name: member.name,
        email: member.email,
        role: member.role,
        githubUsername: member.github_username,
        evaluateaiInstalled: member.evaluateai_installed ?? false,
      },
      stats: {
        totalAiCost,
        avgPromptScore,
        commits: commitsWeek,
        prs: prsWeek,
        reviews: reviewsWeek,
        tasksCompleted,
        tasksAssigned,
        sessionsThisWeek: (weekSessions ?? []).length,
      },
      sessions: (weekSessions ?? []).map(s => ({
        id: s.id,
        model: s.model,
        cost: s.total_cost_usd,
        score: s.avg_prompt_score,
        turns: s.total_turns,
        inputTokens: s.total_input_tokens,
        outputTokens: s.total_output_tokens,
        startedAt: s.started_at,
      })),
      codeChanges: (weekCode ?? []).map(c => ({
        id: c.id,
        type: c.type,
        title: c.title,
        description: c.description,
        repo: c.repo,
        filesChanged: c.files_changed,
        additions: c.additions,
        deletions: c.deletions,
        branch: c.branch,
        createdAt: c.created_at,
      })),
      tasks: (devTasks ?? []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        source: t.source,
        createdAt: t.created_at,
      })),
      modelUsage,
      antiPatterns,
      commitsPerDay,
      scoreTrend,
      insights,
    });
  } catch (err) {
    console.error('Developer detail API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
