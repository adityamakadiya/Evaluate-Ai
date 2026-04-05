import type { ModelPricing } from '../types.js';

// ============================================================
// Model Pricing Table (per 1M tokens, USD)
// Updated: April 2026
// ============================================================

const MODEL_PRICING: ModelPricing[] = [
  // Anthropic
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    name: 'Claude Opus 4.6',
    inputPer1M: 15,
    outputPer1M: 75,
    cacheReadPer1M: 1.5,
    cacheWritePer1M: 18.75,
    contextWindow: 200_000,
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    name: 'Claude Sonnet 4.6',
    inputPer1M: 3,
    outputPer1M: 15,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
    contextWindow: 200_000,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    name: 'Claude Haiku 4.5',
    inputPer1M: 0.8,
    outputPer1M: 4,
    cacheReadPer1M: 0.08,
    cacheWritePer1M: 1,
    contextWindow: 200_000,
  },

  // OpenAI
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    inputPer1M: 2.5,
    outputPer1M: 10,
    contextWindow: 128_000,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    contextWindow: 128_000,
  },
  {
    id: 'o3',
    provider: 'openai',
    name: 'o3',
    inputPer1M: 10,
    outputPer1M: 40,
    contextWindow: 200_000,
  },
  {
    id: 'o3-mini',
    provider: 'openai',
    name: 'o3 Mini',
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    contextWindow: 200_000,
  },
];

/**
 * Get pricing info for a model by ID or partial match.
 */
export function getModelPricing(modelId: string): ModelPricing | null {
  // Exact match first
  const exact = MODEL_PRICING.find(m => m.id === modelId);
  if (exact) return exact;

  // Partial match (e.g., "sonnet" matches "claude-sonnet-4-6")
  const normalized = modelId.toLowerCase();
  return MODEL_PRICING.find(m =>
    m.id.includes(normalized) || m.name.toLowerCase().includes(normalized)
  ) ?? null;
}

/**
 * Calculate cost in USD for a given number of tokens.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string,
  cacheReadTokens = 0,
  cacheWriteTokens = 0
): number {
  const pricing = getModelPricing(modelId);
  if (!pricing) {
    // Fallback: use Sonnet pricing as default
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }

  let cost = 0;
  cost += (inputTokens * pricing.inputPer1M) / 1_000_000;
  cost += (outputTokens * pricing.outputPer1M) / 1_000_000;

  if (pricing.cacheReadPer1M && cacheReadTokens > 0) {
    cost += (cacheReadTokens * pricing.cacheReadPer1M) / 1_000_000;
  }
  if (pricing.cacheWritePer1M && cacheWriteTokens > 0) {
    cost += (cacheWriteTokens * pricing.cacheWritePer1M) / 1_000_000;
  }

  return cost;
}

/**
 * Recommend the cheapest viable model for a given task.
 * Simple heuristic based on prompt complexity.
 */
export function recommendModel(
  promptText: string,
  provider: 'anthropic' | 'openai' = 'anthropic'
): { model: ModelPricing; reason: string } {
  const wordCount = promptText.trim().split(/\s+/).length;
  const hasCodeBlock = /```[\s\S]+```/.test(promptText);
  const hasMultipleFiles = (promptText.match(/[/\\][\w.-]+\.\w{1,5}/g) || []).length > 2;
  const isQuestion = promptText.trim().endsWith('?') && wordCount < 30;
  const isComplex = wordCount > 200 || hasMultipleFiles;

  if (provider === 'anthropic') {
    if (isQuestion && !hasCodeBlock) {
      return {
        model: MODEL_PRICING.find(m => m.id === 'claude-haiku-4-5-20251001')!,
        reason: 'Simple question — Haiku is sufficient',
      };
    }
    if (isComplex) {
      return {
        model: MODEL_PRICING.find(m => m.id === 'claude-sonnet-4-6')!,
        reason: 'Complex task with multiple files — Sonnet recommended',
      };
    }
    return {
      model: MODEL_PRICING.find(m => m.id === 'claude-sonnet-4-6')!,
      reason: 'Standard coding task — Sonnet is cost-effective',
    };
  }

  // OpenAI
  if (isQuestion && !hasCodeBlock) {
    return {
      model: MODEL_PRICING.find(m => m.id === 'gpt-4o-mini')!,
      reason: 'Simple question — GPT-4o Mini is sufficient',
    };
  }
  return {
    model: MODEL_PRICING.find(m => m.id === 'gpt-4o')!,
    reason: 'Standard task — GPT-4o recommended',
  };
}

/**
 * Get the context window size for a model.
 */
export function getContextWindow(modelId: string): number {
  const pricing = getModelPricing(modelId);
  return pricing?.contextWindow ?? 200_000;
}

export { MODEL_PRICING };
