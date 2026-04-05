import type { Session, Turn } from '../types.js';

interface EfficiencyInput {
  session: Session;
  turns: Turn[];
}

interface EfficiencyResult {
  score: number;
  components: {
    promptQuality: number;
    turnEfficiency: number;
    costEfficiency: number;
    modelFit: number;
    outcomeSignal: number;
  };
  tokenWasteRatio: number;
  contextPeakPct: number;
}

const WEIGHTS = {
  promptQuality: 0.30,
  turnEfficiency: 0.25,
  costEfficiency: 0.20,
  modelFit: 0.15,
  outcomeSignal: 0.10,
};

/**
 * Calculate session efficiency score (0-100).
 */
export function calculateEfficiency(input: EfficiencyInput): EfficiencyResult {
  const { session, turns } = input;

  // 1. Prompt Quality: average of heuristic scores
  const scores = turns
    .map(t => t.heuristicScore ?? t.llmScore)
    .filter((s): s is number => s !== null);
  const promptQuality = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length / 100
    : 0.5;

  // 2. Turn Efficiency: ideal turns / actual turns
  const idealTurns = estimateIdealTurns(turns);
  const actualTurns = session.totalTurns || turns.length;
  const turnEfficiency = actualTurns > 0
    ? Math.min(1, idealTurns / actualTurns)
    : 1;

  // 3. Cost Efficiency: 1 - token waste ratio
  const wasteRatio = calculateTokenWaste(turns);
  const costEfficiency = 1 - wasteRatio;

  // 4. Model Fit: how well the model matches the task
  // (simplified: penalize if the model is clearly overpowered)
  const modelFit = estimateModelFit(session, turns);

  // 5. Outcome Signal: did the session produce useful results?
  const retryRate = turns.filter(t => t.wasRetry).length / Math.max(1, turns.length);
  const outcomeSignal =
    session.filesChanged > 0 && retryRate < 0.2 ? 1.0 :
    session.filesChanged > 0 || retryRate < 0.2 ? 0.5 :
    0.0;

  // Weighted sum
  const score = Math.round(
    (WEIGHTS.promptQuality * promptQuality +
     WEIGHTS.turnEfficiency * turnEfficiency +
     WEIGHTS.costEfficiency * costEfficiency +
     WEIGHTS.modelFit * modelFit +
     WEIGHTS.outcomeSignal * outcomeSignal) * 100
  );

  // Context peak
  const contextPeakPct = Math.max(
    0,
    ...turns.map(t => t.contextUsedPct ?? 0)
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      promptQuality: Math.round(promptQuality * 100),
      turnEfficiency: Math.round(turnEfficiency * 100),
      costEfficiency: Math.round(costEfficiency * 100),
      modelFit: Math.round(modelFit * 100),
      outcomeSignal: Math.round(outcomeSignal * 100),
    },
    tokenWasteRatio: Math.round(wasteRatio * 100) / 100,
    contextPeakPct: Math.round(contextPeakPct * 10) / 10,
  };
}

/**
 * Estimate ideal number of turns based on first prompt complexity.
 */
function estimateIdealTurns(turns: Turn[]): number {
  if (turns.length === 0) return 1;

  const firstPrompt = turns[0].promptText ?? '';
  const wordCount = firstPrompt.split(/\s+/).length;
  const tokenCount = turns[0].promptTokensEst ?? wordCount * 1.3;
  const hasCode = /```/.test(firstPrompt);
  const isQuestion = firstPrompt.trim().endsWith('?') && wordCount < 30;

  if (isQuestion && !hasCode) return 1;
  if (tokenCount < 50 && !hasCode) return 1;
  if (wordCount < 50) return 2;
  if (wordCount < 150) return 3;
  return 4;
}

/**
 * Calculate token waste ratio from turn data.
 */
function calculateTokenWaste(turns: Turn[]): number {
  if (turns.length === 0) return 0;

  let wastedTokens = 0;
  let totalTokens = 0;

  for (const turn of turns) {
    const promptTokens = turn.promptTokensEst ?? 0;
    const responseTokens = turn.responseTokensEst ?? 0;
    totalTokens += promptTokens + responseTokens;

    // Retry tokens are wasted
    if (turn.wasRetry) {
      wastedTokens += promptTokens + responseTokens;
    }

    // Filler word estimation (~5 tokens per filler match)
    const fillerCount = (turn.promptText?.match(
      /\b(please|could you|would you mind|would you kindly|help me|thanks|thank you)\b/gi
    ) || []).length;
    wastedTokens += fillerCount * 5;
  }

  if (totalTokens === 0) return 0;
  return Math.min(1, wastedTokens / totalTokens);
}

/**
 * Estimate model fit (0-1). Lower if model is overpowered for the task.
 */
function estimateModelFit(session: Session, turns: Turn[]): number {
  const model = session.model?.toLowerCase() ?? '';

  // If using Opus for a session where most prompts are simple questions
  const simplePrompts = turns.filter(t => {
    const text = t.promptText ?? '';
    return text.split(/\s+/).length < 30 && text.endsWith('?');
  }).length;

  const simpleRatio = turns.length > 0 ? simplePrompts / turns.length : 0;

  if (model.includes('opus') && simpleRatio > 0.5) return 0.3;
  if (model.includes('opus') && simpleRatio > 0.2) return 0.6;
  if (model.includes('sonnet')) return 0.85;
  if (model.includes('haiku')) return 1.0;

  return 0.75; // default
}
