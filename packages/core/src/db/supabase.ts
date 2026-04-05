import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDb } from './client.js';
import { sessions, turns, toolEvents, config } from './schema.js';
import { eq, isNull } from 'drizzle-orm';

let _supabase: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Initialize Supabase client. Call once during setup.
 */
export function initSupabase(cfg: SupabaseConfig): SupabaseClient {
  _supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false },
  });
  return _supabase;
}

/**
 * Get the Supabase client. Returns null if not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  // Try to load from local config
  try {
    const db = getDb();
    const urlRow = db.select().from(config).where(eq(config.key, 'supabase_url')).get();
    const keyRow = db.select().from(config).where(eq(config.key, 'supabase_anon_key')).get();

    if (urlRow?.value && keyRow?.value) {
      return initSupabase({ url: urlRow.value, anonKey: keyRow.value });
    }
  } catch {
    // Not configured yet
  }

  return null;
}

/**
 * Save Supabase credentials to local config.
 */
export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.insert(config)
    .values({ key: 'supabase_url', value: cfg.url, updatedAt: now })
    .onConflictDoUpdate({ target: config.key, set: { value: cfg.url, updatedAt: now } })
    .run();

  db.insert(config)
    .values({ key: 'supabase_anon_key', value: cfg.anonKey, updatedAt: now })
    .onConflictDoUpdate({ target: config.key, set: { value: cfg.anonKey, updatedAt: now } })
    .run();

  // Initialize the client
  initSupabase(cfg);
}

/**
 * Sync unsynced local data to Supabase.
 * Called periodically (every 60s) or manually via `evalai sync`.
 *
 * Strategy: SQLite is source of truth locally.
 * Sessions/turns are pushed to Supabase with synced_at tracking.
 */
export async function syncToSupabase(): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured', synced: 0 };
  }

  const db = getDb();
  let synced = 0;

  try {
    // 1. Sync completed sessions that haven't been synced
    const unsyncedSessions = db.select()
      .from(sessions)
      .where(isNull(sessions.analyzedAt))
      .all()
      .filter(s => s.endedAt !== null); // Only sync completed sessions

    // Actually, we need a synced_at column. For now, sync all completed sessions.
    // We'll use upsert to handle duplicates.
    const completedSessions = db.select()
      .from(sessions)
      .all()
      .filter(s => s.endedAt !== null);

    if (completedSessions.length > 0) {
      // Batch upsert sessions
      const { error: sessErr } = await supabase
        .from('sessions')
        .upsert(
          completedSessions.map(s => ({
            id: s.id,
            tool: s.tool,
            integration: s.integration,
            project_dir: s.projectDir,
            git_repo: s.gitRepo,
            git_branch: s.gitBranch,
            model: s.model,
            started_at: s.startedAt,
            ended_at: s.endedAt,
            total_turns: s.totalTurns,
            total_input_tokens: s.totalInputTokens,
            total_output_tokens: s.totalOutputTokens,
            total_cost_usd: s.totalCostUsd,
            total_tool_calls: s.totalToolCalls,
            files_changed: s.filesChanged,
            avg_prompt_score: s.avgPromptScore,
            efficiency_score: s.efficiencyScore,
            token_waste_ratio: s.tokenWasteRatio,
            context_peak_pct: s.contextPeakPct,
            analysis: s.analysis,
            analyzed_at: s.analyzedAt,
          })),
          { onConflict: 'id' }
        );

      if (sessErr) throw sessErr;
      synced += completedSessions.length;
    }

    // 2. Sync turns for completed sessions
    const sessionIds = completedSessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const allTurns = db.select()
        .from(turns)
        .all()
        .filter(t => sessionIds.includes(t.sessionId));

      if (allTurns.length > 0) {
        // Batch in chunks of 100
        for (let i = 0; i < allTurns.length; i += 100) {
          const chunk = allTurns.slice(i, i + 100);
          const { error: turnErr } = await supabase
            .from('turns')
            .upsert(
              chunk.map(t => ({
                id: t.id,
                session_id: t.sessionId,
                turn_number: t.turnNumber,
                prompt_text: t.promptText,
                prompt_hash: t.promptHash,
                prompt_tokens_est: t.promptTokensEst,
                heuristic_score: t.heuristicScore,
                anti_patterns: t.antiPatterns,
                llm_score: t.llmScore,
                score_breakdown: t.scoreBreakdown,
                suggestion_text: t.suggestionText,
                suggestion_accepted: t.suggestionAccepted,
                tokens_saved_est: t.tokensSavedEst,
                response_tokens_est: t.responseTokensEst,
                tool_calls: t.toolCalls,
                latency_ms: t.latencyMs,
                was_retry: t.wasRetry,
                context_used_pct: t.contextUsedPct,
                created_at: t.createdAt,
              })),
              { onConflict: 'id' }
            );

          if (turnErr) throw turnErr;
          synced += chunk.length;
        }
      }

      // 3. Sync tool events
      const allToolEvents = db.select()
        .from(toolEvents)
        .all()
        .filter(te => sessionIds.includes(te.sessionId));

      if (allToolEvents.length > 0) {
        for (let i = 0; i < allToolEvents.length; i += 100) {
          const chunk = allToolEvents.slice(i, i + 100);
          const { error: teErr } = await supabase
            .from('tool_events')
            .upsert(
              chunk.map(te => ({
                id: te.id,
                session_id: te.sessionId,
                turn_id: te.turnId,
                tool_name: te.toolName,
                tool_input_summary: te.toolInputSummary,
                success: te.success,
                execution_ms: te.executionMs,
                created_at: te.createdAt,
              })),
              { onConflict: 'id' }
            );

          if (teErr) throw teErr;
          synced += chunk.length;
        }
      }
    }

    return { success: true, synced, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, synced };
  }
}

export interface SyncResult {
  success: boolean;
  error: string | null;
  synced: number;
}

/**
 * Check if Supabase is configured and reachable.
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('sessions').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
