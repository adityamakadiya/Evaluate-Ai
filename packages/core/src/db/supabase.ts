import { getSupabase } from './client.js';
import type { Session, Turn, ToolEvent } from '../types.js';

// ============================================================
// Helper: snake_case DB row -> camelCase TypeScript
// ============================================================

function toSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    tool: row.tool as string,
    projectDir: (row.project_dir as string) ?? null,
    gitRepo: (row.git_repo as string) ?? null,
    gitBranch: (row.git_branch as string) ?? null,
    model: (row.model as string) ?? null,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string) ?? null,
    totalTurns: (row.total_turns as number) ?? 0,
    totalInputTokens: (row.total_input_tokens as number) ?? 0,
    totalOutputTokens: (row.total_output_tokens as number) ?? 0,
    totalCostUsd: (row.total_cost_usd as number) ?? 0,
    totalToolCalls: (row.total_tool_calls as number) ?? 0,
    filesChanged: (row.files_changed as number) ?? 0,
    avgPromptScore: (row.avg_prompt_score as number) ?? null,
    efficiencyScore: (row.efficiency_score as number) ?? null,
    tokenWasteRatio: (row.token_waste_ratio as number) ?? null,
    contextPeakPct: (row.context_peak_pct as number) ?? null,
    analysis: (row.analysis as string) ?? null,
    analyzedAt: (row.analyzed_at as string) ?? null,
  };
}

function toTurn(row: Record<string, unknown>): Turn {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    turnNumber: row.turn_number as number,
    promptText: (row.prompt_text as string) ?? null,
    promptHash: row.prompt_hash as string,
    promptTokensEst: (row.prompt_tokens_est as number) ?? null,
    heuristicScore: (row.heuristic_score as number) ?? null,
    antiPatterns: (row.anti_patterns as string) ?? null,
    llmScore: (row.llm_score as number) ?? null,
    scoreBreakdown: (row.score_breakdown as string) ?? null,
    suggestionText: (row.suggestion_text as string) ?? null,
    suggestionAccepted: (row.suggestion_accepted as boolean) ?? null,
    tokensSavedEst: (row.tokens_saved_est as number) ?? null,
    responseTokensEst: (row.response_tokens_est as number) ?? null,
    responseText: (row.response_text as string) ?? null,
    toolCalls: (row.tool_calls as string) ?? null,
    latencyMs: (row.latency_ms as number) ?? null,
    wasRetry: (row.was_retry as boolean) ?? false,
    contextUsedPct: (row.context_used_pct as number) ?? null,
    intent: (row.intent as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toToolEvent(row: Record<string, unknown>): ToolEvent {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    turnId: (row.turn_id as string) ?? null,
    toolName: row.tool_name as string,
    toolInputSummary: (row.tool_input_summary as string) ?? null,
    success: (row.success as boolean) ?? null,
    executionMs: (row.execution_ms as number) ?? null,
    createdAt: row.created_at as string,
  };
}

// ============================================================
// Session operations
// ============================================================

export async function createSession(data: {
  id: string;
  tool: string;
  integration: string;
  projectDir?: string | null;
  gitRepo?: string | null;
  gitBranch?: string | null;
  model?: string | null;
  startedAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_sessions').insert({
      id: data.id,
      tool: data.tool,
      integration: data.integration,
      project_dir: data.projectDir ?? null,
      git_repo: data.gitRepo ?? null,
      git_branch: data.gitBranch ?? null,
      model: data.model ?? null,
      started_at: data.startedAt,
      total_turns: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      total_tool_calls: 0,
      files_changed: 0,
    });
    if (error) console.error('createSession error:', error.message);
  } catch {
    // Non-critical — don't throw
  }
}

export async function updateSession(
  id: string,
  data: Partial<{
    endedAt: string;
    totalTurns: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    totalToolCalls: number;
    filesChanged: number;
    avgPromptScore: number;
    efficiencyScore: number;
    tokenWasteRatio: number;
    contextPeakPct: number;
    analysis: string;
    analyzedAt: string;
    model: string;
  }>
): Promise<void> {
  try {
    const supabase = getSupabase();
    const row: Record<string, unknown> = {};
    if (data.endedAt !== undefined) row.ended_at = data.endedAt;
    if (data.totalTurns !== undefined) row.total_turns = data.totalTurns;
    if (data.totalInputTokens !== undefined) row.total_input_tokens = data.totalInputTokens;
    if (data.totalOutputTokens !== undefined) row.total_output_tokens = data.totalOutputTokens;
    if (data.totalCostUsd !== undefined) row.total_cost_usd = data.totalCostUsd;
    if (data.totalToolCalls !== undefined) row.total_tool_calls = data.totalToolCalls;
    if (data.filesChanged !== undefined) row.files_changed = data.filesChanged;
    if (data.avgPromptScore !== undefined) row.avg_prompt_score = data.avgPromptScore;
    if (data.efficiencyScore !== undefined) row.efficiency_score = data.efficiencyScore;
    if (data.tokenWasteRatio !== undefined) row.token_waste_ratio = data.tokenWasteRatio;
    if (data.contextPeakPct !== undefined) row.context_peak_pct = data.contextPeakPct;
    if (data.analysis !== undefined) row.analysis = data.analysis;
    if (data.analyzedAt !== undefined) row.analyzed_at = data.analyzedAt;
    if (data.model !== undefined) row.model = data.model;

    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('ai_sessions').update(row).eq('id', id);
    if (error) console.error('updateSession error:', error.message);
  } catch {
    // Non-critical
  }
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return toSession(data);
  } catch {
    return null;
  }
}

export async function getSessions(options?: {
  since?: string;
  limit?: number;
  teamId?: string;
  developerId?: string;
}): Promise<Session[]> {
  try {
    const supabase = getSupabase();
    let query = supabase.from('ai_sessions').select('*');
    if (options?.since) query = query.gte('started_at', options.since);
    if (options?.teamId) query = query.eq('team_id', options.teamId);
    if (options?.developerId) query = query.eq('developer_id', options.developerId);
    query = query.order('started_at', { ascending: false });
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(toSession);
  } catch {
    return [];
  }
}

// ============================================================
// Turn operations
// ============================================================

export async function createTurn(data: {
  id: string;
  sessionId: string;
  turnNumber: number;
  promptText?: string | null;
  promptHash: string;
  promptTokensEst?: number | null;
  heuristicScore?: number | null;
  antiPatterns?: string | null;
  llmScore?: number | null;
  scoreBreakdown?: string | null;
  suggestionText?: string | null;
  suggestionAccepted?: boolean | null;
  tokensSavedEst?: number | null;
  responseTokensEst?: number | null;
  toolCalls?: string | null;
  latencyMs?: number | null;
  wasRetry?: boolean;
  contextUsedPct?: number | null;
  createdAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_turns').insert({
      id: data.id,
      session_id: data.sessionId,
      turn_number: data.turnNumber,
      prompt_text: data.promptText ?? null,
      prompt_hash: data.promptHash,
      prompt_tokens_est: data.promptTokensEst ?? null,
      heuristic_score: data.heuristicScore ?? null,
      anti_patterns: data.antiPatterns ?? null,
      llm_score: data.llmScore ?? null,
      score_breakdown: data.scoreBreakdown ?? null,
      suggestion_text: data.suggestionText ?? null,
      suggestion_accepted: data.suggestionAccepted ?? null,
      tokens_saved_est: data.tokensSavedEst ?? null,
      response_tokens_est: data.responseTokensEst ?? null,
      tool_calls: data.toolCalls ?? null,
      latency_ms: data.latencyMs ?? null,
      was_retry: data.wasRetry ?? false,
      context_used_pct: data.contextUsedPct ?? null,
      created_at: data.createdAt,
    });
    if (error) console.error('createTurn error:', error.message);
  } catch {
    // Non-critical
  }
}

export async function updateTurn(
  id: string,
  data: Partial<{
    llmScore: number;
    scoreBreakdown: string;
    suggestionText: string;
    tokensSavedEst: number;
    responseTokensEst: number;
    latencyMs: number;
    toolCalls: string;
    contextUsedPct: number;
  }>
): Promise<void> {
  try {
    const supabase = getSupabase();
    const row: Record<string, unknown> = {};
    if (data.llmScore !== undefined) row.llm_score = data.llmScore;
    if (data.scoreBreakdown !== undefined) row.score_breakdown = data.scoreBreakdown;
    if (data.suggestionText !== undefined) row.suggestion_text = data.suggestionText;
    if (data.tokensSavedEst !== undefined) row.tokens_saved_est = data.tokensSavedEst;
    if (data.responseTokensEst !== undefined) row.response_tokens_est = data.responseTokensEst;
    if (data.latencyMs !== undefined) row.latency_ms = data.latencyMs;
    if (data.toolCalls !== undefined) row.tool_calls = data.toolCalls;
    if (data.contextUsedPct !== undefined) row.context_used_pct = data.contextUsedPct;

    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('ai_turns').update(row).eq('id', id);
    if (error) console.error('updateTurn error:', error.message);
  } catch {
    // Non-critical
  }
}

export async function getTurnsForSession(sessionId: string): Promise<Turn[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_turns')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });
    if (error || !data) return [];
    return data.map(toTurn);
  } catch {
    return [];
  }
}

export async function getTurnByHash(promptHash: string): Promise<Turn | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_turns')
      .select('*')
      .eq('prompt_hash', promptHash)
      .not('score_breakdown', 'is', null)
      .limit(1)
      .single();
    if (error || !data) return null;
    return toTurn(data);
  } catch {
    return null;
  }
}

// ============================================================
// Tool event operations
// ============================================================

export async function createToolEvent(data: {
  id: string;
  sessionId: string;
  turnId?: string | null;
  toolName: string;
  toolInputSummary?: string | null;
  success?: boolean | null;
  executionMs?: number | null;
  createdAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_tool_events').insert({
      id: data.id,
      session_id: data.sessionId,
      turn_id: data.turnId ?? null,
      tool_name: data.toolName,
      tool_input_summary: data.toolInputSummary ?? null,
      success: data.success ?? null,
      execution_ms: data.executionMs ?? null,
      created_at: data.createdAt,
    });
    if (error) console.error('createToolEvent error:', error.message);
  } catch {
    // Non-critical
  }
}

export async function updateToolEvent(
  id: string,
  data: Partial<{
    success: boolean;
    executionMs: number;
  }>
): Promise<void> {
  try {
    const supabase = getSupabase();
    const row: Record<string, unknown> = {};
    if (data.success !== undefined) row.success = data.success;
    if (data.executionMs !== undefined) row.execution_ms = data.executionMs;

    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('ai_tool_events').update(row).eq('id', id);
    if (error) console.error('updateToolEvent error:', error.message);
  } catch {
    // Non-critical
  }
}

export async function getToolEventsForSession(sessionId: string): Promise<ToolEvent[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_tool_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(toToolEvent);
  } catch {
    return [];
  }
}

// ============================================================
// Activity timeline
// ============================================================

export async function addTimelineEvent(data: {
  id: string;
  teamId?: string | null;
  developerId?: string | null;
  eventType: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('activity_timeline').insert({
      id: data.id,
      team_id: data.teamId ?? null,
      developer_id: data.developerId ?? null,
      event_type: data.eventType,
      title: data.title,
      description: data.description ?? null,
      metadata: data.metadata ?? null,
      is_ai_assisted: true,
      occurred_at: data.createdAt,
    });
    if (error) console.error('addTimelineEvent error:', error.message);
  } catch {
    // Non-critical
  }
}

// ============================================================
// Scoring calls (track LLM scoring costs)
// ============================================================

export async function createScoringCall(data: {
  id: string;
  turnId?: string | null;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  createdAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_scoring_calls').insert({
      id: data.id,
      turn_id: data.turnId ?? null,
      model: data.model,
      input_tokens: data.inputTokens ?? null,
      output_tokens: data.outputTokens ?? null,
      cost_usd: data.costUsd ?? null,
      created_at: data.createdAt,
    });
    if (error) console.error('createScoringCall error:', error.message);
  } catch {
    // Non-critical
  }
}

// ============================================================
// API calls (from proxy)
// ============================================================

export async function createApiCall(data: {
  id: string;
  sessionId?: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd: number;
  latencyMs: number;
  statusCode: number;
  createdAt: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_api_calls').insert({
      id: data.id,
      session_id: data.sessionId ?? null,
      provider: data.provider,
      model: data.model,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      cache_read_tokens: data.cacheReadTokens ?? 0,
      cache_write_tokens: data.cacheWriteTokens ?? 0,
      cost_usd: data.costUsd,
      latency_ms: data.latencyMs,
      status_code: data.statusCode,
      created_at: data.createdAt,
    });
    if (error) console.error('createApiCall error:', error.message);
  } catch {
    // Non-critical
  }
}

// ============================================================
// Stats queries
// ============================================================

export interface Stats {
  totalSessions: number;
  totalTurns: number;
  totalCostUsd: number;
  avgEfficiencyScore: number | null;
  avgPromptScore: number | null;
}

export async function getStats(teamId?: string, since?: string): Promise<Stats> {
  const defaults: Stats = {
    totalSessions: 0,
    totalTurns: 0,
    totalCostUsd: 0,
    avgEfficiencyScore: null,
    avgPromptScore: null,
  };

  try {
    const supabase = getSupabase();
    let query = supabase.from('ai_sessions').select('*');
    if (teamId) query = query.eq('team_id', teamId);
    if (since) query = query.gte('started_at', since);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return defaults;

    const totalSessions = data.length;
    const totalTurns = data.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.total_turns as number) ?? 0), 0);
    const totalCostUsd = data.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.total_cost_usd as number) ?? 0), 0);

    const effScores = data
      .map((s: Record<string, unknown>) => s.efficiency_score as number | null)
      .filter((v): v is number => v !== null);
    const avgEfficiencyScore = effScores.length > 0
      ? effScores.reduce((a, b) => a + b, 0) / effScores.length
      : null;

    const promptScores = data
      .map((s: Record<string, unknown>) => s.avg_prompt_score as number | null)
      .filter((v): v is number => v !== null);
    const avgPromptScore = promptScores.length > 0
      ? promptScores.reduce((a, b) => a + b, 0) / promptScores.length
      : null;

    return { totalSessions, totalTurns, totalCostUsd, avgEfficiencyScore, avgPromptScore };
  } catch {
    return defaults;
  }
}

export interface DeveloperStats {
  totalSessions: number;
  totalTurns: number;
  totalCostUsd: number;
  avgEfficiencyScore: number | null;
  avgPromptScore: number | null;
  recentSessions: Session[];
}

export async function getDeveloperStats(developerId: string, since?: string): Promise<DeveloperStats> {
  const defaults: DeveloperStats = {
    totalSessions: 0,
    totalTurns: 0,
    totalCostUsd: 0,
    avgEfficiencyScore: null,
    avgPromptScore: null,
    recentSessions: [],
  };

  try {
    const supabase = getSupabase();
    let query = supabase.from('ai_sessions').select('*').eq('developer_id', developerId);
    if (since) query = query.gte('started_at', since);
    query = query.order('started_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) return defaults;

    const totalSessions = data.length;
    const totalTurns = data.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.total_turns as number) ?? 0), 0);
    const totalCostUsd = data.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.total_cost_usd as number) ?? 0), 0);

    const effScores = data
      .map((s: Record<string, unknown>) => s.efficiency_score as number | null)
      .filter((v): v is number => v !== null);
    const avgEfficiencyScore = effScores.length > 0
      ? effScores.reduce((a, b) => a + b, 0) / effScores.length
      : null;

    const promptScores = data
      .map((s: Record<string, unknown>) => s.avg_prompt_score as number | null)
      .filter((v): v is number => v !== null);
    const avgPromptScore = promptScores.length > 0
      ? promptScores.reduce((a, b) => a + b, 0) / promptScores.length
      : null;

    const recentSessions = data.slice(0, 10).map(toSession);

    return { totalSessions, totalTurns, totalCostUsd, avgEfficiencyScore, avgPromptScore, recentSessions };
  } catch {
    return defaults;
  }
}

// ============================================================
// Connection check
// ============================================================

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_sessions').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
