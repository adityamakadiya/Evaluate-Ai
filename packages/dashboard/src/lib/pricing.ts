// --------------- Model Pricing (dashboard-local) ---------------
// Kept in sync with packages/core/src/models/pricing.ts
// Per 1M tokens, USD

export interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
};

const SONNET_FALLBACK: ModelPricing = PRICING['claude-sonnet-4-6'];

/**
 * Strip context-window suffixes that Claude Code appends to model IDs.
 * e.g. "claude-opus-4-6[1m]" → "claude-opus-4-6"
 */
export function normalizeModelId(modelId: string): string {
  return modelId.replace(/\[\d+[km]?\]$/i, '').trim();
}

/**
 * Get pricing for a model. Normalizes the ID first, then tries exact match,
 * then partial match. Falls back to Sonnet pricing.
 */
export function getModelPricing(modelId: string): ModelPricing {
  const cleanId = normalizeModelId(modelId);

  // Exact match
  if (PRICING[cleanId]) return PRICING[cleanId];

  // Partial match (e.g. "opus" → "claude-opus-4-6")
  const lower = cleanId.toLowerCase();
  for (const [id, pricing] of Object.entries(PRICING)) {
    if (id.includes(lower) || lower.includes(id)) return pricing;
  }

  return SONNET_FALLBACK;
}

/**
 * Calculate cost in USD from token counts and model ID.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  const p = getModelPricing(modelId);
  return (
    inputTokens * p.input +
    outputTokens * p.output +
    cacheReadTokens * p.cacheRead +
    cacheWriteTokens * p.cacheWrite
  ) / 1_000_000;
}
