import type { HeuristicResult, AntiPattern } from '../types.js';
import type { AntiPatternDef, PositiveSignalDef } from './types.js';

// ============================================================
// Prompt Intent Classification
// ============================================================

export type PromptIntent =
  | 'research'      // "how does X work?", "explain Y", "what is Z?"
  | 'debug'         // "fix bug", "error in", "not working"
  | 'feature'       // "add", "create", "implement", "build"
  | 'refactor'      // "refactor", "optimize", "clean up", "restructure"
  | 'review'        // "review", "check", "is this correct"
  | 'generate'      // "write tests", "generate", "create boilerplate"
  | 'config'        // "configure", "set up", "install", "deploy"
  | 'general';      // fallback

const INTENT_PATTERNS: Array<{ intent: PromptIntent; patterns: RegExp[] }> = [
  {
    intent: 'research',
    patterns: [
      /^(how|what|why|when|where|which|who|can|does|is|are|explain|describe|tell me|list|compare|difference|understand)\b/i,
      /\b(how does|how do|how can|how to|what is|what are|explain|describe|overview|concept|theory|difference between|pros and cons|best practice)\b/i,
      /\?$/,
    ],
  },
  {
    intent: 'debug',
    patterns: [
      /\b(fix|bug|error|crash|broken|not working|fails|failure|issue|problem|debug|exception|undefined|null|NaN|timeout|500|404|403)\b/i,
      /\b(TypeError|ReferenceError|SyntaxError|ENOENT|ECONNREFUSED|segfault|panic|traceback)\b/i,
    ],
  },
  {
    intent: 'feature',
    patterns: [
      /^(add|create|implement|build|make|develop|design)\b/i,
      /\b(new feature|add support|implement|build a|create a|add a)\b/i,
    ],
  },
  {
    intent: 'refactor',
    patterns: [
      /\b(refactor|optimize|clean up|restructure|simplify|improve performance|reduce|consolidate|extract|split|merge)\b/i,
    ],
  },
  {
    intent: 'review',
    patterns: [
      /\b(review|check|is this correct|look at|audit|evaluate|assess|feedback|opinion)\b/i,
    ],
  },
  {
    intent: 'generate',
    patterns: [
      /\b(write tests|generate|create boilerplate|scaffold|template|stub|mock|seed data)\b/i,
    ],
  },
  {
    intent: 'config',
    patterns: [
      /\b(configure|config|set up|setup|install|deploy|migrate|upgrade|update dependencies|CI|CD|docker|kubernetes|nginx)\b/i,
    ],
  },
];

export function classifyIntent(text: string): PromptIntent {
  const lower = text.toLowerCase().trim();

  // Score each intent by how many patterns match
  let bestIntent: PromptIntent = 'general';
  let bestScore = 0;

  for (const { intent, patterns } of INTENT_PATTERNS) {
    const matches = patterns.filter(p => p.test(lower)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestIntent = intent;
    }
  }

  return bestIntent;
}

// ============================================================
// Intent-Specific Scoring Rules
// Each intent has different criteria for what makes a good prompt
// ============================================================

interface IntentScoringRules {
  baseline: number;
  antiPatterns: string[];        // which anti-patterns apply to this intent
  positiveSignals: string[];     // which positive signals apply
  bonusSignals: Array<{ id: string; points: number; test: RegExp; label: string; hint: string }>;
}

const INTENT_RULES: Record<PromptIntent, IntentScoringRules> = {
  research: {
    baseline: 75,  // Research prompts start higher — they're naturally shorter
    antiPatterns: ['too_short_research', 'multi_question', 'unanchored_ref', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_specific_topic', 'has_scope', 'has_context_why'],
    bonusSignals: [
      { id: 'has_specific_topic', points: 10, test: /\b(hook|component|api|function|module|pattern|algorithm|protocol|framework|library|concept)\b/i, label: 'Specific Topic', hint: 'Good — you named a specific concept' },
      { id: 'has_scope', points: 10, test: /\b(in|for|with|using|between|versus|vs)\b/i, label: 'Scoped Question', hint: 'Good — question is focused' },
      { id: 'has_context_why', points: 5, test: /\b(because|since|so that|in order to|trying to|working on|building|my project)\b/i, label: 'Context Provided', hint: 'Good — you explained why you need this' },
    ],
  },
  debug: {
    baseline: 65,  // Debug prompts need more context
    antiPatterns: ['vague_verb', 'paraphrased_error', 'too_short', 'no_file_ref', 'no_expected_output', 'unanchored_ref', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_error_msg', 'has_constraints'],
    bonusSignals: [
      { id: 'has_reproduction', points: 5, test: /\b(when I|after|steps|reproduce|happens when|triggered by)\b/i, label: 'Reproduction Steps', hint: 'Good — you described when the issue occurs' },
    ],
  },
  feature: {
    baseline: 70,
    antiPatterns: ['vague_verb', 'too_short', 'no_expected_output', 'overlong_prompt', 'multi_question', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_constraints'],
    bonusSignals: [
      { id: 'has_acceptance_criteria', points: 10, test: /\b(should|must|accept|return|display|render|respond with|output)\b/i, label: 'Acceptance Criteria', hint: 'Good — you defined what success looks like' },
      { id: 'has_tech_spec', points: 5, test: /\b(endpoint|route|component|schema|table|query|param|prop|type|interface)\b/i, label: 'Technical Spec', hint: 'Good — includes technical details' },
    ],
  },
  refactor: {
    baseline: 70,
    antiPatterns: ['vague_verb', 'too_short', 'no_file_ref', 'overlong_prompt', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_constraints'],
    bonusSignals: [
      { id: 'has_reason', points: 10, test: /\b(because|for|to improve|to reduce|to simplify|too many|duplication|complexity|performance|readability)\b/i, label: 'Reason Given', hint: 'Good — you explained why refactoring' },
    ],
  },
  review: {
    baseline: 75,  // Review prompts are naturally simpler
    antiPatterns: ['too_short', 'unanchored_ref', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_constraints'],
    bonusSignals: [
      { id: 'has_focus_area', points: 10, test: /\b(security|performance|readability|best practice|edge case|error handling|types|naming|architecture)\b/i, label: 'Focus Area', hint: 'Good — you specified what to review for' },
    ],
  },
  generate: {
    baseline: 70,
    antiPatterns: ['vague_verb', 'too_short', 'no_expected_output', 'multi_question', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_constraints'],
    bonusSignals: [
      { id: 'has_framework', points: 5, test: /\b(jest|vitest|pytest|mocha|react|vue|angular|express|fastify|next)\b/i, label: 'Framework Specified', hint: 'Good — framework is specified' },
    ],
  },
  config: {
    baseline: 70,
    antiPatterns: ['vague_verb', 'too_short', 'no_expected_output', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_constraints'],
    bonusSignals: [
      { id: 'has_environment', points: 5, test: /\b(production|staging|development|local|docker|kubernetes|aws|vercel|railway|fly)\b/i, label: 'Environment Specified', hint: 'Good — target environment specified' },
    ],
  },
  general: {
    baseline: 70,
    antiPatterns: ['vague_verb', 'too_short', 'multi_question', 'overlong_prompt', 'unanchored_ref', 'filler_words', 'retry_detected'],
    positiveSignals: ['has_file_path', 'has_code_block', 'has_error_msg', 'has_constraints'],
    bonusSignals: [],
  },
};

// ============================================================
// Universal Anti-Patterns (applied selectively per intent)
// ============================================================

const ALL_ANTI_PATTERNS: Record<string, AntiPatternDef> = {
  vague_verb: {
    id: 'vague_verb',
    severity: 'high',
    points: 15,
    test: /^(fix|make|do|help|improve|change|update)\b.{0,20}$/i,
    hint: 'Add: which file, what specific behavior, what error',
  },
  paraphrased_error: {
    id: 'paraphrased_error',
    severity: 'high',
    points: 15,
    test: (text: string) =>
      /error\s+(says|is|was|shows|giving|throws)/i.test(text) &&
      !/(```|`[^`]+`)/.test(text),
    hint: 'Paste the exact error message in backticks',
  },
  too_short: {
    id: 'too_short',
    severity: 'high',
    points: 15,
    test: (text: string) => text.trim().split(/\s+/).length < 5,
    hint: 'Add more context for better results',
  },
  too_short_research: {
    id: 'too_short',
    severity: 'medium',
    points: 8,  // Less penalty for research — "how does X work?" is fine at 5 words
    test: (text: string) => text.trim().split(/\s+/).length < 3,
    hint: 'Add a bit more detail about what aspect you want to understand',
  },
  retry_detected: {
    id: 'retry_detected',
    severity: 'high',
    points: 15,
    test: () => false, // Checked separately
    hint: 'Explain what was wrong with the prior answer',
  },
  no_file_ref: {
    id: 'no_file_ref',
    severity: 'medium',
    points: 10,
    test: (text: string) =>
      /\b(function|class|method|error|bug|issue|component)\b/i.test(text) &&
      !/[/\\][\w.-]+\.\w{1,5}/.test(text),
    hint: 'Specify the file path and function name',
  },
  multi_question: {
    id: 'multi_question',
    severity: 'medium',
    points: 10,
    test: (text: string) => (text.match(/\?/g) || []).length >= 3,
    hint: 'One question per turn — split into steps',
  },
  overlong_prompt: {
    id: 'overlong_prompt',
    severity: 'medium',
    points: 10,
    test: (text: string) => text.trim().split(/\s+/).length > 500,
    hint: 'Split into task description + separate context',
  },
  no_expected_output: {
    id: 'no_expected_output',
    severity: 'medium',
    points: 8,
    test: (text: string) =>
      text.length > 100 &&
      !/\b(should|expected|want|need|output|result|return|produce|display)\b/i.test(text),
    hint: 'Describe what success looks like',
  },
  unanchored_ref: {
    id: 'unanchored_ref',
    severity: 'low',
    points: 5,
    test: /^(it|that|the issue|the problem|the error|this)\s/i,
    hint: "Re-state what 'it' refers to — AI may lose context",
  },
  filler_words: {
    id: 'filler_words',
    severity: 'low',
    points: 3, // Reduced — politeness is fine, just slightly wasteful
    test: /\b(please|could you|would you mind|would you kindly|help me)\b/i,
    hint: 'Filler words cost tokens — but this is minor',
  },
};

// Universal positive signals
const ALL_POSITIVE_SIGNALS: Record<string, PositiveSignalDef> = {
  has_file_path: { id: 'has_file_path', points: 10, test: /[/\\][\w.-]+\.\w{1,5}/ },
  has_code_block: { id: 'has_code_block', points: 10, test: /```[\s\S]+```/ },
  has_error_msg: { id: 'has_error_msg', points: 10, test: /```[\s\S]*(?:error|exception|traceback|TypeError|ReferenceError|SyntaxError)[\s\S]*```/i },
  has_constraints: { id: 'has_constraints', points: 10, test: /\b(must|should not|without|keep|preserve|don't change|do not|avoid)\b/i },
};

// ============================================================
// Main scoring function
// ============================================================

export function scoreHeuristic(text: string, promptHistory?: string[]): HeuristicResult {
  const intent = classifyIntent(text);
  const rules = INTENT_RULES[intent];

  let score = rules.baseline;
  const matchedAntiPatterns: AntiPattern[] = [];
  const matchedPositiveSignals: string[] = [];

  // Apply only the anti-patterns relevant to this intent
  for (const patternId of rules.antiPatterns) {
    const pattern = ALL_ANTI_PATTERNS[patternId];
    if (!pattern) continue;

    // Special case: retry detection
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

  // Apply universal positive signals relevant to this intent
  for (const signalId of rules.positiveSignals) {
    const signal = ALL_POSITIVE_SIGNALS[signalId];
    if (signal && signal.test.test(text)) {
      score += signal.points;
      matchedPositiveSignals.push(signal.id);
    }
  }

  // Apply intent-specific bonus signals
  for (const bonus of rules.bonusSignals) {
    if (bonus.test.test(text)) {
      score += bonus.points;
      matchedPositiveSignals.push(bonus.id);
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
    intent,
  };
}

// Simple retry detection
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

export { ALL_ANTI_PATTERNS as ANTI_PATTERNS, ALL_POSITIVE_SIGNALS as POSITIVE_SIGNALS };
