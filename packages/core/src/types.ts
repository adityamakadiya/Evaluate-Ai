// ============================================================
// EvaluateAI Core Types
// ============================================================

// --- Session ---

export interface Session {
  id: string;
  tool: string;
  integration: 'hooks' | 'proxy' | 'mcp';
  projectDir: string | null;
  gitRepo: string | null;
  gitBranch: string | null;
  model: string | null;
  startedAt: string;
  endedAt: string | null;

  totalTurns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalToolCalls: number;
  filesChanged: number;

  avgPromptScore: number | null;
  efficiencyScore: number | null;
  tokenWasteRatio: number | null;
  contextPeakPct: number | null;

  analysis: string | null;
  analyzedAt: string | null;
}

// --- Turn ---

export interface Turn {
  id: string;
  sessionId: string;
  turnNumber: number;

  promptText: string | null;
  promptHash: string;
  promptTokensEst: number | null;

  heuristicScore: number | null;
  antiPatterns: string | null; // JSON array

  llmScore: number | null;
  scoreBreakdown: string | null; // JSON object

  suggestionText: string | null;
  suggestionAccepted: boolean | null;
  tokensSavedEst: number | null;

  responseTokensEst: number | null;
  toolCalls: string | null; // JSON array
  latencyMs: number | null;

  wasRetry: boolean;
  contextUsedPct: number | null;

  createdAt: string;
}

// --- Tool Event ---

export interface ToolEvent {
  id: string;
  sessionId: string;
  turnId: string | null;
  toolName: string;
  toolInputSummary: string | null;
  success: boolean | null;
  executionMs: number | null;
  createdAt: string;
}

// --- Scoring ---

export interface AntiPattern {
  id: string;
  severity: 'high' | 'medium' | 'low';
  points: number;
  hint: string;
}

export interface HeuristicResult {
  score: number;
  antiPatterns: AntiPattern[];
  positiveSignals: string[];
  quickTip: string | null;
}

export interface LLMScoreBreakdown {
  specificity: number;
  context: number;
  clarity: number;
  actionability: number;
  total: number;
  suggestion: string;
  cheaperModelViable: boolean;
  recommendedModel: string;
  tokensSavedEst: number;
}

export interface ScoreResult {
  heuristic: HeuristicResult;
  llm: LLMScoreBreakdown | null;
  finalScore: number;
}

// --- Analysis ---

export interface SessionAnalysis {
  efficiencyScore: number;
  summary: string;
  wastedTurns: Array<{ turn: number; reason: string }>;
  optimalTurnCount: number;
  spiralDetected: boolean;
  spiralStartTurn: number | null;
  modelRecommendations: Array<{
    turn: number;
    used: string;
    recommended: string;
    savingsUsd: number;
  }>;
  rewrittenFirstPrompt: string;
  topTip: string;
}

// --- Model Pricing ---

export interface ModelPricing {
  id: string;
  provider: 'anthropic' | 'openai';
  name: string;
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M?: number;
  cacheWritePer1M?: number;
  contextWindow: number;
}

// --- Config ---

export type PrivacyMode = 'off' | 'local' | 'hash';
export type ScoringMode = 'heuristic' | 'llm';

export interface EvalAIConfig {
  privacy: PrivacyMode;
  scoring: ScoringMode;
  threshold: number;
  dashboardPort: number;
}

// --- Hook Events ---

export interface HookEvent {
  type: string;
  session_id?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface SessionStartEvent extends HookEvent {
  type: 'SessionStart';
  session_id: string;
  cwd: string;
  model?: string;
}

export interface PromptSubmitEvent extends HookEvent {
  type: 'UserPromptSubmit';
  session_id: string;
  prompt: string;
  cwd: string;
  model?: string;
}

export interface PreToolUseEvent extends HookEvent {
  type: 'PreToolUse';
  session_id: string;
  tool_name: string;
  tool_input?: string;
}

export interface PostToolUseEvent extends HookEvent {
  type: 'PostToolUse';
  session_id: string;
  tool_name: string;
  success: boolean;
  output_size?: number;
}

export interface StopEvent extends HookEvent {
  type: 'Stop';
  session_id: string;
  response_tokens?: number;
  latency_ms?: number;
}

export interface SessionEndEvent extends HookEvent {
  type: 'SessionEnd';
  session_id: string;
}
