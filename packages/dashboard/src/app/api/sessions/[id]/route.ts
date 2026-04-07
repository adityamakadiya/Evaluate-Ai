import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = getSupabase();

    const { data: session, error: sessionErr } = await supabase
      .from('ai_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [{ data: turnsData }, { data: toolEventsData }] = await Promise.all([
      supabase
        .from('ai_turns')
        .select('*')
        .eq('session_id', id)
        .order('turn_number', { ascending: true }),
      supabase
        .from('ai_tool_events')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
    ]);

    // Parse analysis — it's JSONB in Supabase so it may already be an object
    let parsedAnalysis = null;
    if (session.analysis != null) {
      if (typeof session.analysis === 'string') {
        try { parsedAnalysis = JSON.parse(session.analysis); } catch { parsedAnalysis = null; }
      } else {
        parsedAnalysis = session.analysis;
      }
    }

    // Transform session to camelCase
    const sessionOut = {
      id: session.id,
      tool: session.tool,
      integration: session.integration,
      model: session.model,
      projectDir: session.project_dir,
      gitRepo: session.git_repo,
      gitBranch: session.git_branch,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      totalTurns: session.total_turns,
      totalInputTokens: session.total_input_tokens,
      totalOutputTokens: session.total_output_tokens,
      totalCostUsd: session.total_cost_usd,
      totalToolCalls: session.total_tool_calls,
      filesChanged: session.files_changed,
      avgPromptScore: session.avg_prompt_score,
      efficiencyScore: session.efficiency_score,
      tokenWasteRatio: session.token_waste_ratio,
      contextPeakPct: session.context_peak_pct,
      analyzedAt: session.analyzed_at,
    };

    // Transform turns to camelCase, parse JSONB fields
    const parsedTurns = (turnsData ?? []).map(t => ({
      id: t.id,
      turnNumber: t.turn_number,
      promptText: t.prompt_text,
      promptHash: t.prompt_hash,
      promptTokensEst: t.prompt_tokens_est,
      heuristicScore: t.heuristic_score,
      antiPatterns: t.anti_patterns ?? [],
      llmScore: t.llm_score,
      scoreBreakdown: t.score_breakdown ?? null,
      suggestionText: t.suggestion_text,
      suggestionAccepted: t.suggestion_accepted == null ? null : Boolean(t.suggestion_accepted),
      tokensSavedEst: t.tokens_saved_est,
      responseTokensEst: t.response_tokens_est,
      toolCalls: t.tool_calls ?? [],
      latencyMs: t.latency_ms,
      wasRetry: Boolean(t.was_retry),
      contextUsedPct: t.context_used_pct,
      createdAt: t.created_at,
    }));

    // Transform tool events to camelCase
    const parsedToolEvents = (toolEventsData ?? []).map(e => ({
      id: e.id,
      sessionId: e.session_id,
      turnId: e.turn_id,
      toolName: e.tool_name,
      toolInputSummary: e.tool_input_summary,
      success: e.success == null ? null : Boolean(e.success),
      executionMs: e.execution_ms,
      createdAt: e.created_at,
    }));

    return NextResponse.json({
      session: sessionOut,
      turns: parsedTurns,
      toolEvents: parsedToolEvents,
      analysis: parsedAnalysis,
    });
  } catch (err) {
    console.error('Session detail API error:', err);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
