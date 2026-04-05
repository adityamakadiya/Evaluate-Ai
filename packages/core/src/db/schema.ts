import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ============================================================
// SESSIONS
// ============================================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  tool: text('tool').notNull(),
  integration: text('integration').notNull(), // 'hooks' | 'proxy' | 'mcp'
  projectDir: text('project_dir'),
  gitRepo: text('git_repo'),
  gitBranch: text('git_branch'),
  model: text('model'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),

  totalTurns: integer('total_turns').default(0).notNull(),
  totalInputTokens: integer('total_input_tokens').default(0).notNull(),
  totalOutputTokens: integer('total_output_tokens').default(0).notNull(),
  totalCostUsd: real('total_cost_usd').default(0).notNull(),
  totalToolCalls: integer('total_tool_calls').default(0).notNull(),
  filesChanged: integer('files_changed').default(0).notNull(),

  avgPromptScore: real('avg_prompt_score'),
  efficiencyScore: real('efficiency_score'),
  tokenWasteRatio: real('token_waste_ratio'),
  contextPeakPct: real('context_peak_pct'),

  analysis: text('analysis'),
  analyzedAt: text('analyzed_at'),
}, (table) => [
  index('idx_sessions_started').on(table.startedAt),
  index('idx_sessions_project').on(table.projectDir),
]);

// ============================================================
// TURNS
// ============================================================
export const turns = sqliteTable('turns', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  turnNumber: integer('turn_number').notNull(),

  promptText: text('prompt_text'),
  promptHash: text('prompt_hash').notNull(),
  promptTokensEst: integer('prompt_tokens_est'),

  heuristicScore: real('heuristic_score'),
  antiPatterns: text('anti_patterns'), // JSON array

  llmScore: real('llm_score'),
  scoreBreakdown: text('score_breakdown'), // JSON object

  suggestionText: text('suggestion_text'),
  suggestionAccepted: integer('suggestion_accepted', { mode: 'boolean' }),
  tokensSavedEst: integer('tokens_saved_est'),

  responseTokensEst: integer('response_tokens_est'),
  toolCalls: text('tool_calls'), // JSON array
  latencyMs: integer('latency_ms'),

  wasRetry: integer('was_retry', { mode: 'boolean' }).default(false).notNull(),
  contextUsedPct: real('context_used_pct'),

  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_turns_session').on(table.sessionId, table.turnNumber),
  index('idx_turns_hash').on(table.promptHash),
  index('idx_turns_created').on(table.createdAt),
]);

// ============================================================
// TOOL EVENTS
// ============================================================
export const toolEvents = sqliteTable('tool_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  turnId: text('turn_id').references(() => turns.id),
  toolName: text('tool_name').notNull(),
  toolInputSummary: text('tool_input_summary'),
  success: integer('success', { mode: 'boolean' }),
  executionMs: integer('execution_ms'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_tool_events_session').on(table.sessionId),
  index('idx_tool_events_turn').on(table.turnId),
]);

// ============================================================
// API CALLS (from proxy, for non-Claude tools)
// ============================================================
export const apiCalls = sqliteTable('api_calls', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cacheReadTokens: integer('cache_read_tokens').default(0).notNull(),
  cacheWriteTokens: integer('cache_write_tokens').default(0).notNull(),
  costUsd: real('cost_usd').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  statusCode: integer('status_code').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_api_calls_session').on(table.sessionId),
]);

// ============================================================
// SCORING CALLS (track our own LLM scoring costs)
// ============================================================
export const scoringCalls = sqliteTable('scoring_calls', {
  id: text('id').primaryKey(),
  turnId: text('turn_id').references(() => turns.id),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd: real('cost_usd'),
  createdAt: text('created_at').notNull(),
});

// ============================================================
// CONFIG
// ============================================================
export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
