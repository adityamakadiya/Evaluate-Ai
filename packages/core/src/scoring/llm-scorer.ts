import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import type { LLMScoreBreakdown } from '../types.js';
import { getTurnByHash, updateTurn, createScoringCall } from '../db/supabase.js';
import { ulid } from 'ulid';

const SCORING_MODEL = 'claude-haiku-4-5-20251001';

const SCORING_PROMPT = `You are a prompt quality scorer for AI coding tools.

Score this developer prompt on 4 dimensions (each 0-25, total 0-100):

1. SPECIFICITY (0-25): Does it name files, functions, line numbers, or specific identifiers?
2. CONTEXT (0-25): Does it include error messages, what was tried, reproduction steps, or why this matters?
3. CLARITY (0-25): Is the expected outcome stated? Is there one clear ask (not multiple)?
4. ACTIONABILITY (0-25): Can the AI act immediately without asking clarifying questions?

Also provide:
- A one-sentence suggestion to improve the prompt
- Whether a cheaper model (Haiku) could handle this task
- Estimated tokens the improved prompt would save

Respond in JSON only, no markdown fences:
{
  "specificity": 0-25,
  "context": 0-25,
  "clarity": 0-25,
  "actionability": 0-25,
  "total": 0-100,
  "suggestion": "one sentence improvement",
  "cheaper_model_viable": true/false,
  "recommended_model": "haiku|sonnet|opus",
  "tokens_saved_est": number
}`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Score a prompt using Claude Haiku.
 * Results are cached by SHA256 hash of the prompt text.
 */
export async function scoreLLM(
  promptText: string,
  context?: { projectDir?: string; gitBranch?: string }
): Promise<LLMScoreBreakdown | null> {
  try {
    const hash = hashPrompt(promptText);

    // Check cache via Supabase — look for a turn with the same prompt_hash that has a score
    const cached = await checkCache(hash);
    if (cached) return cached;

    const userMessage = `Prompt to score:
"""
${promptText}
"""

${context?.projectDir ? `Project: ${context.projectDir}` : ''}
${context?.gitBranch ? `Branch: ${context.gitBranch}` : ''}`.trim();

    const response = await getClient().messages.create({
      model: SCORING_MODEL,
      max_tokens: 512,
      system: SCORING_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text from response
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const parsed = JSON.parse(text);
    const result: LLMScoreBreakdown = {
      specificity: clamp(parsed.specificity, 0, 25),
      context: clamp(parsed.context, 0, 25),
      clarity: clamp(parsed.clarity, 0, 25),
      actionability: clamp(parsed.actionability, 0, 25),
      total: clamp(parsed.total, 0, 100),
      suggestion: parsed.suggestion ?? '',
      cheaperModelViable: parsed.cheaper_model_viable ?? false,
      recommendedModel: parsed.recommended_model ?? 'sonnet',
      tokensSavedEst: parsed.tokens_saved_est ?? 0,
    };

    // Log scoring cost to Supabase
    await cacheResult(result, response.usage);

    return result;
  } catch {
    // Graceful fallback — don't break the hook
    return null;
  }
}

/**
 * Score a prompt and update the turn record in Supabase.
 * This is the async fire-and-forget version called from hooks.
 */
export async function scoreLLMAndUpdate(
  turnId: string,
  promptText: string,
  context?: { projectDir?: string; gitBranch?: string }
): Promise<void> {
  const result = await scoreLLM(promptText, context);
  if (!result) return;

  await updateTurn(turnId, {
    llmScore: result.total,
    scoreBreakdown: JSON.stringify(result),
    suggestionText: result.suggestion || undefined,
    tokensSavedEst: result.tokensSavedEst || undefined,
  });
}

function hashPrompt(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function checkCache(hash: string): Promise<LLMScoreBreakdown | null> {
  try {
    const existing = await getTurnByHash(hash);
    if (existing && existing.scoreBreakdown) {
      return JSON.parse(existing.scoreBreakdown) as LLMScoreBreakdown;
    }
  } catch {
    // Cache miss is fine
  }
  return null;
}

async function cacheResult(
  _result: LLMScoreBreakdown,
  usage: { input_tokens: number; output_tokens: number }
): Promise<void> {
  try {
    const cost =
      (usage.input_tokens * 0.8) / 1_000_000 +
      (usage.output_tokens * 4) / 1_000_000;

    await createScoringCall({
      id: ulid(),
      turnId: null,
      model: SCORING_MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: cost,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
