import type { HeuristicResult, AntiPattern } from '../types.js';
import type { AntiPatternDef, PositiveSignalDef } from './types.js';

// ============================================================
// Anti-Patterns (deductions from baseline of 70)
// ============================================================

const ANTI_PATTERNS: AntiPatternDef[] = [
  // HIGH severity: -15 each
  {
    id: 'vague_verb',
    severity: 'high',
    points: 15,
    test: /^(fix|make|do|help|improve|change|update)\b.{0,20}$/i,
    hint: 'Add: which file, what specific behavior, what error',
  },
  {
    id: 'paraphrased_error',
    severity: 'high',
    points: 15,
    test: (text: string) =>
      /error\s+(says|is|was|shows|giving|throws)/i.test(text) &&
      !/(```|`[^`]+`)/.test(text),
    hint: 'Paste the exact error message in backticks',
  },
  {
    id: 'too_short',
    severity: 'high',
    points: 15,
    test: (text: string) => text.trim().split(/\s+/).length < 8,
    hint: 'Add context: file path, function name, expected behavior',
  },
  {
    id: 'retry_detected',
    severity: 'high',
    points: 15,
    // This pattern requires history context — checked separately
    test: () => false,
    hint: 'Explain what was wrong with the prior answer',
  },

  // MEDIUM severity: -10 each
  {
    id: 'no_file_ref',
    severity: 'medium',
    points: 10,
    test: (text: string) =>
      /\b(function|class|method|error|bug|issue|component)\b/i.test(text) &&
      !/[/\\][\w.-]+\.\w{1,5}/.test(text),
    hint: 'Specify the file path and function name',
  },
  {
    id: 'multi_question',
    severity: 'medium',
    points: 10,
    test: (text: string) => (text.match(/\?/g) || []).length >= 3,
    hint: 'One question per turn — split into steps',
  },
  {
    id: 'overlong_prompt',
    severity: 'medium',
    points: 10,
    test: (text: string) => text.trim().split(/\s+/).length > 500,
    hint: 'Split into task description + separate context',
  },
  {
    id: 'no_expected_output',
    severity: 'medium',
    points: 10,
    test: (text: string) =>
      text.length > 80 &&
      !/\b(should|expected|want|need|output|result|return|produce|display)\b/i.test(text),
    hint: 'Describe what success looks like',
  },

  // LOW severity: -5 each
  {
    id: 'unanchored_ref',
    severity: 'low',
    points: 5,
    test: /^(it|that|the issue|the problem|the error|this)\s/i,
    hint: "Re-state what 'it' refers to — AI may lose context",
  },
  {
    id: 'filler_words',
    severity: 'low',
    points: 5,
    test: /\b(please|could you|would you mind|would you kindly|help me)\b/i,
    hint: 'Filler words cost tokens — remove for efficiency',
  },
];

// ============================================================
// Positive Signals (bonuses, +10 each)
// ============================================================

const POSITIVE_SIGNALS: PositiveSignalDef[] = [
  {
    id: 'has_file_path',
    points: 10,
    test: /[/\\][\w.-]+\.\w{1,5}/,
  },
  {
    id: 'has_code_block',
    points: 10,
    test: /```[\s\S]+```/,
  },
  {
    id: 'has_error_msg',
    points: 10,
    test: /```[\s\S]*(?:error|exception|traceback|TypeError|ReferenceError|SyntaxError)[\s\S]*```/i,
  },
  {
    id: 'has_constraints',
    points: 10,
    test: /\b(must|should not|without|keep|preserve|don't change|do not|avoid)\b/i,
  },
];

// ============================================================
// Score calculation
// ============================================================

export function scoreHeuristic(text: string, promptHistory?: string[]): HeuristicResult {
  const BASELINE = 70;
  let score = BASELINE;
  const matchedAntiPatterns: AntiPattern[] = [];
  const matchedPositiveSignals: string[] = [];

  // Check anti-patterns
  for (const pattern of ANTI_PATTERNS) {
    // Special case: retry detection uses history
    if (pattern.id === 'retry_detected') {
      if (promptHistory && isRetry(text, promptHistory)) {
        score -= pattern.points;
        matchedAntiPatterns.push({
          id: pattern.id,
          severity: pattern.severity,
          points: pattern.points,
          hint: pattern.hint,
        });
      }
      continue;
    }

    const matched =
      pattern.test instanceof RegExp
        ? pattern.test.test(text)
        : pattern.test(text);

    if (matched) {
      score -= pattern.points;
      matchedAntiPatterns.push({
        id: pattern.id,
        severity: pattern.severity,
        points: pattern.points,
        hint: pattern.hint,
      });
    }
  }

  // Check positive signals
  for (const signal of POSITIVE_SIGNALS) {
    if (signal.test.test(text)) {
      score += signal.points;
      matchedPositiveSignals.push(signal.id);
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Generate quick tip from highest-severity unmatched improvement
  const quickTip = matchedAntiPatterns.length > 0
    ? matchedAntiPatterns[0].hint
    : null;

  return {
    score,
    antiPatterns: matchedAntiPatterns,
    positiveSignals: matchedPositiveSignals,
    quickTip,
  };
}

// Simple retry detection: check if text is very similar to any prior prompt
function isRetry(text: string, history: string[]): boolean {
  const normalized = normalizeText(text);
  for (const prior of history) {
    const priorNorm = normalizeText(prior);
    if (normalized === priorNorm) return true;
    if (jaccardSimilarity(normalized, priorNorm) > 0.85) return true;
  }
  return false;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export { ANTI_PATTERNS, POSITIVE_SIGNALS };
