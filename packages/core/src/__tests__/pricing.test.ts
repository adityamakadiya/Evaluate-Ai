import { describe, it, expect } from 'vitest';
import {
  getModelPricing,
  calculateCost,
  recommendModel,
  MODEL_PRICING,
} from '../models/pricing.js';

// ============================================================
// getModelPricing
// ============================================================

describe('getModelPricing', () => {
  it('returns exact match for full model ID', () => {
    const pricing = getModelPricing('claude-opus-4-6');
    expect(pricing).not.toBeNull();
    expect(pricing!.id).toBe('claude-opus-4-6');
    expect(pricing!.provider).toBe('anthropic');
    expect(pricing!.inputPer1M).toBe(15);
    expect(pricing!.outputPer1M).toBe(75);
  });

  it('returns exact match for OpenAI model', () => {
    const pricing = getModelPricing('gpt-4o');
    expect(pricing).not.toBeNull();
    expect(pricing!.id).toBe('gpt-4o');
    expect(pricing!.provider).toBe('openai');
  });

  it('returns partial match by name substring', () => {
    const pricing = getModelPricing('sonnet');
    expect(pricing).not.toBeNull();
    expect(pricing!.id).toBe('claude-sonnet-4-6');
  });

  it('returns partial match case-insensitively', () => {
    const pricing = getModelPricing('HAIKU');
    expect(pricing).not.toBeNull();
    expect(pricing!.id).toBe('claude-haiku-4-5-20251001');
  });

  it('returns partial match by display name', () => {
    const pricing = getModelPricing('Opus');
    expect(pricing).not.toBeNull();
    expect(pricing!.id).toBe('claude-opus-4-6');
  });

  it('returns null for unknown model', () => {
    expect(getModelPricing('nonexistent-model-xyz')).toBeNull();
  });

  it('prefers exact match over partial match', () => {
    const pricing = getModelPricing('gpt-4o');
    expect(pricing!.id).toBe('gpt-4o');
    // Not gpt-4o-mini
  });

  it('returns correct context window sizes', () => {
    expect(getModelPricing('claude-opus-4-6')!.contextWindow).toBe(200_000);
    expect(getModelPricing('gpt-4o')!.contextWindow).toBe(128_000);
  });

  it('returns cache pricing for Anthropic models', () => {
    const opus = getModelPricing('claude-opus-4-6')!;
    expect(opus.cacheReadPer1M).toBe(1.5);
    expect(opus.cacheWritePer1M).toBe(18.75);
  });

  it('OpenAI models have no cache pricing', () => {
    const gpt = getModelPricing('gpt-4o')!;
    expect(gpt.cacheReadPer1M).toBeUndefined();
    expect(gpt.cacheWritePer1M).toBeUndefined();
  });
});

// ============================================================
// calculateCost
// ============================================================

describe('calculateCost', () => {
  it('calculates cost for Claude Opus', () => {
    // 1000 input tokens at $15/1M + 500 output tokens at $75/1M
    const cost = calculateCost(1000, 500, 'claude-opus-4-6');
    const expected = (1000 * 15 + 500 * 75) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it('calculates cost for GPT-4o', () => {
    const cost = calculateCost(10_000, 5_000, 'gpt-4o');
    const expected = (10_000 * 2.5 + 5_000 * 10) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it('includes cache read cost when provided', () => {
    const withoutCache = calculateCost(1000, 500, 'claude-sonnet-4-6');
    const withCache = calculateCost(1000, 500, 'claude-sonnet-4-6', 2000);
    const cacheCost = (2000 * 0.3) / 1_000_000;
    expect(withCache).toBeCloseTo(withoutCache + cacheCost, 10);
  });

  it('includes cache write cost when provided', () => {
    const withoutCache = calculateCost(1000, 500, 'claude-sonnet-4-6');
    const withCache = calculateCost(1000, 500, 'claude-sonnet-4-6', 0, 3000);
    const cacheCost = (3000 * 3.75) / 1_000_000;
    expect(withCache).toBeCloseTo(withoutCache + cacheCost, 10);
  });

  it('uses Sonnet fallback pricing for unknown models', () => {
    const cost = calculateCost(1000, 500, 'unknown-model');
    const expected = (1000 * 3 + 500 * 15) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it('returns 0 for 0 input and 0 output tokens', () => {
    expect(calculateCost(0, 0, 'claude-opus-4-6')).toBe(0);
  });

  it('handles large token counts', () => {
    const cost = calculateCost(1_000_000, 1_000_000, 'claude-opus-4-6');
    const expected = 15 + 75; // $15 input + $75 output
    expect(cost).toBeCloseTo(expected, 5);
  });

  it('does not add cache cost for models without cache pricing', () => {
    const withCache = calculateCost(1000, 500, 'gpt-4o', 5000, 5000);
    const withoutCache = calculateCost(1000, 500, 'gpt-4o');
    expect(withCache).toBe(withoutCache);
  });
});

// ============================================================
// recommendModel
// ============================================================

describe('recommendModel', () => {
  describe('Anthropic provider', () => {
    it('recommends Haiku for simple questions', () => {
      const { model, reason } = recommendModel('What is a closure?');
      expect(model.id).toBe('claude-haiku-4-5-20251001');
      expect(reason).toContain('Haiku');
    });

    it('recommends Sonnet for standard coding tasks', () => {
      const { model, reason } = recommendModel(
        'Refactor the authentication middleware in the login controller to use async await instead of promise chains'
      );
      expect(model.id).toBe('claude-sonnet-4-6');
      expect(reason).toContain('Sonnet');
    });

    it('recommends Sonnet for complex tasks with many files', () => {
      const prompt = [
        'Refactor the following files to use the new authentication pattern:',
        'src/auth/middleware.ts',
        'src/auth/login.ts',
        'src/auth/register.ts',
        'Make sure all three integrate with the new JWT service.',
      ].join('\n');
      const { model, reason } = recommendModel(prompt);
      expect(model.id).toBe('claude-sonnet-4-6');
      expect(reason).toContain('Sonnet');
    });

    it('recommends Sonnet for long prompts (>200 words)', () => {
      const longPrompt = Array(201).fill('descriptive word about the task').join(' ');
      const { model } = recommendModel(longPrompt);
      expect(model.id).toBe('claude-sonnet-4-6');
    });

    it('does not recommend Haiku for questions with code blocks', () => {
      const prompt = 'What does this do?\n```\nconst x = 1;\n```';
      const { model } = recommendModel(prompt);
      // Should NOT be Haiku because it has a code block
      expect(model.id).not.toBe('claude-haiku-4-5-20251001');
    });
  });

  describe('OpenAI provider', () => {
    it('recommends GPT-4o Mini for simple questions', () => {
      const { model, reason } = recommendModel('What is a closure?', 'openai');
      expect(model.id).toBe('gpt-4o-mini');
      expect(reason).toContain('Mini');
    });

    it('recommends GPT-4o for standard tasks', () => {
      const { model, reason } = recommendModel(
        'Refactor the authentication middleware to use async await instead of promise chains',
        'openai'
      );
      expect(model.id).toBe('gpt-4o');
      expect(reason).toContain('GPT-4o');
    });
  });
});

// ============================================================
// MODEL_PRICING sanity checks
// ============================================================

describe('MODEL_PRICING', () => {
  it('has entries for all expected models', () => {
    const ids = MODEL_PRICING.map(m => m.id);
    expect(ids).toContain('claude-opus-4-6');
    expect(ids).toContain('claude-sonnet-4-6');
    expect(ids).toContain('claude-haiku-4-5-20251001');
    expect(ids).toContain('gpt-4o');
    expect(ids).toContain('gpt-4o-mini');
    expect(ids).toContain('o3');
    expect(ids).toContain('o3-mini');
  });

  it('all models have positive pricing values', () => {
    for (const model of MODEL_PRICING) {
      expect(model.inputPer1M).toBeGreaterThan(0);
      expect(model.outputPer1M).toBeGreaterThan(0);
      expect(model.contextWindow).toBeGreaterThan(0);
    }
  });
});
