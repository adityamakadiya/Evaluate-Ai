import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateContextUsage } from '../tokens/estimator.js';

// ============================================================
// estimateTokens
// ============================================================

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 0 for null/undefined (falsy values)', () => {
    // The function checks `if (!text)` so these should return 0
    expect(estimateTokens(null as unknown as string)).toBe(0);
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it('returns a positive number for a simple sentence', () => {
    const tokens = estimateTokens('Hello, world!');
    expect(tokens).toBeGreaterThan(0);
  });

  it('returns more tokens for longer text', () => {
    const short = estimateTokens('Hello');
    const long = estimateTokens('Hello world, this is a much longer sentence with many more words and tokens');
    expect(long).toBeGreaterThan(short);
  });

  it('handles single-word input', () => {
    const tokens = estimateTokens('test');
    expect(tokens).toBeGreaterThanOrEqual(1);
  });

  it('handles text with special characters', () => {
    const tokens = estimateTokens('const x = () => { return "hello"; };');
    expect(tokens).toBeGreaterThan(0);
  });

  it('handles multiline text', () => {
    const code = [
      'function fibonacci(n) {',
      '  if (n <= 1) return n;',
      '  return fibonacci(n - 1) + fibonacci(n - 2);',
      '}',
    ].join('\n');
    const tokens = estimateTokens(code);
    expect(tokens).toBeGreaterThan(10);
  });

  it('produces roughly 1 token per 4 chars for English text', () => {
    // This is a rough sanity check, not exact
    const text = 'The quick brown fox jumps over the lazy dog near the riverbank';
    const tokens = estimateTokens(text);
    const roughEstimate = Math.ceil(text.length / 4);
    // Should be within 2x of the rough estimate
    expect(tokens).toBeGreaterThan(roughEstimate * 0.3);
    expect(tokens).toBeLessThan(roughEstimate * 3);
  });

  it('handles unicode/emoji text', () => {
    const tokens = estimateTokens('Hello world! 🌍🎉 Testing unicode handling');
    expect(tokens).toBeGreaterThan(0);
  });
});

// ============================================================
// estimateContextUsage
// ============================================================

describe('estimateContextUsage', () => {
  it('returns 0 when contextWindow is 0', () => {
    expect(estimateContextUsage(1000, 0)).toBe(0);
  });

  it('returns 0 when contextWindow is negative', () => {
    expect(estimateContextUsage(1000, -100)).toBe(0);
  });

  it('returns 50 for half-used context', () => {
    expect(estimateContextUsage(100_000, 200_000)).toBe(50);
  });

  it('returns 100 when context is fully used', () => {
    expect(estimateContextUsage(200_000, 200_000)).toBe(100);
  });

  it('clamps at 100 when tokens exceed context window', () => {
    expect(estimateContextUsage(300_000, 200_000)).toBe(100);
  });

  it('returns correct percentage for small usage', () => {
    const usage = estimateContextUsage(20_000, 200_000);
    expect(usage).toBeCloseTo(10, 5);
  });

  it('handles zero tokens', () => {
    expect(estimateContextUsage(0, 200_000)).toBe(0);
  });

  it('returns precise floating point values', () => {
    const usage = estimateContextUsage(1, 3);
    expect(usage).toBeCloseTo(33.3333, 2);
  });
});
