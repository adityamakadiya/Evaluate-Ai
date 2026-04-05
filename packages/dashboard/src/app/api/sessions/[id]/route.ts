import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = queryOne(
    `SELECT
       id,
       tool,
       integration,
       model,
       project_dir as projectDir,
       git_repo as gitRepo,
       git_branch as gitBranch,
       started_at as startedAt,
       ended_at as endedAt,
       total_turns as totalTurns,
       total_input_tokens as totalInputTokens,
       total_output_tokens as totalOutputTokens,
       total_cost_usd as totalCostUsd,
       total_tool_calls as totalToolCalls,
       files_changed as filesChanged,
       avg_prompt_score as avgPromptScore,
       efficiency_score as efficiencyScore,
       token_waste_ratio as tokenWasteRatio,
       context_peak_pct as contextPeakPct,
       analysis,
       analyzed_at as analyzedAt
     FROM sessions
     WHERE id = ?`,
    [id]
  );

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Parse analysis JSON if present
  let parsedAnalysis = null;
  if (typeof (session as Record<string, unknown>).analysis === 'string') {
    try {
      parsedAnalysis = JSON.parse((session as Record<string, unknown>).analysis as string);
    } catch {
      parsedAnalysis = null;
    }
  }

  const turns = query(
    `SELECT
       id,
       turn_number as turnNumber,
       prompt_text as promptText,
       prompt_hash as promptHash,
       prompt_tokens_est as promptTokensEst,
       heuristic_score as heuristicScore,
       anti_patterns as antiPatterns,
       llm_score as llmScore,
       score_breakdown as scoreBreakdown,
       suggestion_text as suggestionText,
       suggestion_accepted as suggestionAccepted,
       tokens_saved_est as tokensSavedEst,
       response_tokens_est as responseTokensEst,
       tool_calls as toolCalls,
       latency_ms as latencyMs,
       was_retry as wasRetry,
       context_used_pct as contextUsedPct,
       created_at as createdAt
     FROM turns
     WHERE session_id = ?
     ORDER BY turn_number ASC`,
    [id]
  );

  // Parse JSON fields in turns
  const parsedTurns = turns.map((t) => {
    const turn = t as Record<string, unknown>;
    return {
      ...turn,
      antiPatterns: parseJson(turn.antiPatterns as string | null),
      scoreBreakdown: parseJson(turn.scoreBreakdown as string | null),
      toolCalls: parseJson(turn.toolCalls as string | null),
      wasRetry: Boolean(turn.wasRetry),
      suggestionAccepted: turn.suggestionAccepted == null ? null : Boolean(turn.suggestionAccepted),
    };
  });

  const toolEvents = query(
    `SELECT
       id,
       session_id as sessionId,
       turn_id as turnId,
       tool_name as toolName,
       tool_input_summary as toolInputSummary,
       success,
       execution_ms as executionMs,
       created_at as createdAt
     FROM tool_events
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [id]
  );

  const parsedToolEvents = toolEvents.map((e) => {
    const evt = e as Record<string, unknown>;
    return {
      ...evt,
      success: evt.success == null ? null : Boolean(evt.success),
    };
  });

  return NextResponse.json({
    session: { ...session, analysis: undefined, analyzedAt: (session as Record<string, unknown>).analyzedAt },
    turns: parsedTurns,
    toolEvents: parsedToolEvents,
    analysis: parsedAnalysis,
  });
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
