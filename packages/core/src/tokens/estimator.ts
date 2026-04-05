import { encodingForModel } from 'js-tiktoken';

// Use cl100k_base encoding — works for Claude and GPT-4 models
let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel('gpt-4o');
  }
  return encoder;
}

/**
 * Estimate the number of tokens in a text string.
 * Uses tiktoken cl100k_base encoding which is a reasonable
 * approximation for both Claude and GPT-4 family models.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  try {
    return getEncoder().encode(text).length;
  } catch {
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}

/**
 * Estimate context window usage percentage.
 * Takes cumulative tokens used and model's context window size.
 */
export function estimateContextUsage(
  totalTokens: number,
  contextWindow: number
): number {
  if (contextWindow <= 0) return 0;
  return Math.min(100, (totalTokens / contextWindow) * 100);
}
