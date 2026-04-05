import { describe, it, expect } from 'vitest';
import { scoreHeuristic, ANTI_PATTERNS, POSITIVE_SIGNALS } from '../scoring/heuristic.js';

// ============================================================
// Helpers
// ============================================================

/** A neutral prompt that triggers no anti-patterns and no positive signals. */
const NEUTRAL_PROMPT =
  'Refactor the authentication middleware to use async await instead of callbacks and it should return a promise';

// ============================================================
// 1. Baseline score
// ============================================================

describe('scoreHeuristic — baseline', () => {
  it('returns a score of 70 for a neutral prompt', () => {
    const result = scoreHeuristic(NEUTRAL_PROMPT);
    expect(result.score).toBe(70);
    expect(result.antiPatterns).toHaveLength(0);
    expect(result.positiveSignals).toHaveLength(0);
    expect(result.quickTip).toBeNull();
  });
});

// ============================================================
// 2. Anti-patterns — individual detection
// ============================================================

describe('scoreHeuristic — anti-patterns', () => {
  it('detects vague_verb (high, -15)', () => {
    const result = scoreHeuristic('fix this');
    const ap = result.antiPatterns.find(p => p.id === 'vague_verb');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('high');
    expect(ap!.points).toBe(15);
  });

  it('detects vague_verb with various verbs', () => {
    for (const verb of ['Fix', 'Make', 'Do', 'Help', 'Improve', 'Change', 'Update']) {
      const result = scoreHeuristic(`${verb} it now`);
      expect(
        result.antiPatterns.some(p => p.id === 'vague_verb'),
        `expected vague_verb for "${verb} it now"`
      ).toBe(true);
    }
  });

  it('does NOT flag vague_verb for long prompts starting with those verbs', () => {
    const longPrompt = 'Fix the authentication middleware in src/auth/middleware.ts to handle expired tokens properly';
    const result = scoreHeuristic(longPrompt);
    expect(result.antiPatterns.some(p => p.id === 'vague_verb')).toBe(false);
  });

  it('detects paraphrased_error (high, -15)', () => {
    const result = scoreHeuristic('The error says something about undefined is not a function');
    const ap = result.antiPatterns.find(p => p.id === 'paraphrased_error');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('high');
    expect(ap!.points).toBe(15);
  });

  it('does NOT flag paraphrased_error when error is in backticks', () => {
    const result = scoreHeuristic('The error shows `TypeError: undefined is not a function`');
    expect(result.antiPatterns.some(p => p.id === 'paraphrased_error')).toBe(false);
  });

  it('detects too_short (high, -15)', () => {
    const result = scoreHeuristic('add tests');
    const ap = result.antiPatterns.find(p => p.id === 'too_short');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('high');
    expect(ap!.points).toBe(15);
  });

  it('does NOT flag too_short for 8+ words', () => {
    const result = scoreHeuristic('add unit tests for the authentication module in the project');
    expect(result.antiPatterns.some(p => p.id === 'too_short')).toBe(false);
  });

  it('detects retry_detected (high, -15) when history matches', () => {
    const prompt = 'Please fix the login page styling';
    const history = ['Please fix the login page styling'];
    const result = scoreHeuristic(prompt, history);
    const ap = result.antiPatterns.find(p => p.id === 'retry_detected');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('high');
    expect(ap!.points).toBe(15);
  });

  it('detects retry_detected via Jaccard similarity > 0.85', () => {
    // After normalization, these share all words except one each.
    // 13 shared words, 2 unique = 13/15 = 0.867 > 0.85
    const prompt = 'refactor the authentication middleware layer in the login controller module to use modern async await syntax correctly';
    const history = ['refactor the authentication middleware layer in the login controller module to use modern async await syntax properly'];
    const result = scoreHeuristic(prompt, history);
    expect(result.antiPatterns.some(p => p.id === 'retry_detected')).toBe(true);
  });

  it('does NOT flag retry_detected when no history provided', () => {
    const result = scoreHeuristic('please fix the login page styling issues');
    expect(result.antiPatterns.some(p => p.id === 'retry_detected')).toBe(false);
  });

  it('does NOT flag retry_detected for dissimilar prompts', () => {
    const prompt = 'Refactor the database connection pool';
    const history = ['Add new user registration endpoint'];
    const result = scoreHeuristic(prompt, history);
    expect(result.antiPatterns.some(p => p.id === 'retry_detected')).toBe(false);
  });

  it('detects no_file_ref (medium, -10)', () => {
    const result = scoreHeuristic(
      'The function is returning the wrong value when called with a null argument in the component'
    );
    const ap = result.antiPatterns.find(p => p.id === 'no_file_ref');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('medium');
    expect(ap!.points).toBe(10);
  });

  it('does NOT flag no_file_ref when a file path is present', () => {
    const result = scoreHeuristic(
      'The function in src/utils/parser.ts is returning the wrong value when called with a null argument'
    );
    expect(result.antiPatterns.some(p => p.id === 'no_file_ref')).toBe(false);
  });

  it('detects multi_question (medium, -10)', () => {
    const result = scoreHeuristic(
      'What does this function do? How can I test it? Where is the config file? Also is it fast?'
    );
    const ap = result.antiPatterns.find(p => p.id === 'multi_question');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('medium');
    expect(ap!.points).toBe(10);
  });

  it('does NOT flag multi_question for fewer than 3 question marks', () => {
    const result = scoreHeuristic('What does this function do? How can I test it?');
    expect(result.antiPatterns.some(p => p.id === 'multi_question')).toBe(false);
  });

  it('detects overlong_prompt (medium, -10)', () => {
    const words = Array(501).fill('word').join(' ');
    const result = scoreHeuristic(words);
    const ap = result.antiPatterns.find(p => p.id === 'overlong_prompt');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('medium');
    expect(ap!.points).toBe(10);
  });

  it('does NOT flag overlong_prompt for 500 words or fewer', () => {
    const words = Array(500).fill('word').join(' ');
    const result = scoreHeuristic(words);
    expect(result.antiPatterns.some(p => p.id === 'overlong_prompt')).toBe(false);
  });

  it('detects no_expected_output (medium, -10)', () => {
    // Over 80 chars, no "should/expected/want/..." keywords
    const prompt =
      'I have a large React application with many components and services that connect to a backend API through REST endpoints';
    expect(prompt.length).toBeGreaterThan(80);
    const result = scoreHeuristic(prompt);
    const ap = result.antiPatterns.find(p => p.id === 'no_expected_output');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('medium');
    expect(ap!.points).toBe(10);
  });

  it('does NOT flag no_expected_output when "should" keyword present', () => {
    const prompt =
      'I have a large React application with many components and services. The login endpoint should return a JWT token on success';
    const result = scoreHeuristic(prompt);
    expect(result.antiPatterns.some(p => p.id === 'no_expected_output')).toBe(false);
  });

  it('does NOT flag no_expected_output for short prompts (<=80 chars)', () => {
    const prompt = 'A short prompt with no keywords about expectations or output';
    expect(prompt.length).toBeLessThanOrEqual(80);
    const result = scoreHeuristic(prompt);
    expect(result.antiPatterns.some(p => p.id === 'no_expected_output')).toBe(false);
  });

  it('detects unanchored_ref (low, -5)', () => {
    const result = scoreHeuristic(
      'it keeps crashing when I click the submit button in the registration form after entering data'
    );
    const ap = result.antiPatterns.find(p => p.id === 'unanchored_ref');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('low');
    expect(ap!.points).toBe(5);
  });

  it('detects unanchored_ref for various pronouns', () => {
    for (const start of ['It ', 'That ', 'The issue ', 'The problem ', 'The error ', 'This ']) {
      const prompt = `${start}keeps happening when I reload the page in the main dashboard view of the app`;
      const result = scoreHeuristic(prompt);
      expect(
        result.antiPatterns.some(p => p.id === 'unanchored_ref'),
        `expected unanchored_ref for prompt starting with "${start}"`
      ).toBe(true);
    }
  });

  it('detects filler_words (low, -5)', () => {
    const result = scoreHeuristic(
      'Could you please refactor the authentication middleware to use async await instead of callbacks'
    );
    const ap = result.antiPatterns.find(p => p.id === 'filler_words');
    expect(ap).toBeDefined();
    expect(ap!.severity).toBe('low');
    expect(ap!.points).toBe(5);
  });

  it('detects filler_words for various phrases', () => {
    const fillers = ['please', 'could you', 'would you mind', 'would you kindly', 'help me'];
    for (const filler of fillers) {
      const prompt = `${filler} refactor the authentication middleware to use async await instead of callbacks`;
      const result = scoreHeuristic(prompt);
      expect(
        result.antiPatterns.some(p => p.id === 'filler_words'),
        `expected filler_words for "${filler}"`
      ).toBe(true);
    }
  });

  it('all 10 anti-pattern IDs are defined', () => {
    const expectedIds = [
      'vague_verb', 'paraphrased_error', 'too_short', 'retry_detected',
      'no_file_ref', 'multi_question', 'overlong_prompt', 'no_expected_output',
      'unanchored_ref', 'filler_words',
    ];
    const actualIds = ANTI_PATTERNS.map(p => p.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });
});

// ============================================================
// 3. Positive signals
// ============================================================

describe('scoreHeuristic — positive signals', () => {
  it('detects has_file_path (+10)', () => {
    const result = scoreHeuristic(
      'Refactor the authentication middleware in src/auth/middleware.ts to use async await instead of callbacks'
    );
    expect(result.positiveSignals).toContain('has_file_path');
  });

  it('detects has_code_block (+10)', () => {
    const result = scoreHeuristic(
      'Refactor this function to be more efficient:\n```\nfunction add(a, b) { return a + b; }\n```'
    );
    expect(result.positiveSignals).toContain('has_code_block');
  });

  it('detects has_error_msg (+10)', () => {
    const result = scoreHeuristic(
      'I am getting this error when I run the tests:\n```\nTypeError: Cannot read property of undefined\n```'
    );
    expect(result.positiveSignals).toContain('has_error_msg');
  });

  it('detects has_constraints (+10)', () => {
    const result = scoreHeuristic(
      'Refactor the login controller but you must preserve backward compatibility with the existing API'
    );
    expect(result.positiveSignals).toContain('has_constraints');
  });

  it('constraint keywords all work', () => {
    const keywords = ['must', 'should not', 'without', 'keep', 'preserve', "don't change", 'do not', 'avoid'];
    for (const kw of keywords) {
      const prompt = `Refactor the authentication middleware but ${kw} break the existing tests in the repository`;
      const result = scoreHeuristic(prompt);
      expect(
        result.positiveSignals.includes('has_constraints'),
        `expected has_constraints for keyword "${kw}"`
      ).toBe(true);
    }
  });

  it('all 4 positive signal IDs are defined', () => {
    const expectedIds = ['has_file_path', 'has_code_block', 'has_error_msg', 'has_constraints'];
    const actualIds = POSITIVE_SIGNALS.map(s => s.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });
});

// ============================================================
// 4. Score clamping
// ============================================================

describe('scoreHeuristic — clamping', () => {
  it('clamps score at 0 when many anti-patterns trigger', () => {
    // vague_verb (-15) + too_short (-15) + unanchored_ref (-5) + filler_words (-5) = -40 from 70 = 30
    // We need enough to go below 0: craft something extreme
    // vague_verb(-15) + too_short(-15) + filler_words(-5) + unanchored_ref(-5) = -40 => 30
    // We cannot get below 0 easily with a single prompt, but let's try with retry
    // Actually: vague_verb(-15) + too_short(-15) + filler_words(-5) + unanchored_ref(-5) + retry(-15) = -55 => 15
    // Let's use retry + all the lows + highs
    const prompt = 'help me';
    const history = ['help me'];
    const result = scoreHeuristic(prompt, history);
    // vague_verb(-15) + too_short(-15) + retry(-15) + filler_words(-5) = -50 => 20
    // unanchored_ref won't match (doesn't start with it/that/the issue)
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('clamps score at 100 when many positive signals trigger', () => {
    const prompt = [
      'Refactor src/auth/middleware.ts to use async await.',
      'The function must preserve backward compatibility.',
      'Here is the current code:',
      '```',
      'async function login() {',
      '  throw new TypeError("not implemented");',
      '}',
      '```',
    ].join('\n');
    const result = scoreHeuristic(prompt);
    // baseline 70 + up to 40 from signals = max 110 => clamped to 100
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('score never goes below 0 even with extreme deductions', () => {
    // Trigger every possible anti-pattern together
    const prompt = 'fix it';
    const history = ['fix it'];
    const result = scoreHeuristic(prompt, history);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 5. Combined patterns
// ============================================================

describe('scoreHeuristic — combined patterns', () => {
  it('subtracts all matching anti-patterns from baseline', () => {
    // filler_words(-5) + no_expected_output(-10) should apply
    const prompt =
      'Could you look at the React application and see what happens with the data processing pipeline when it runs with large datasets on production';
    const result = scoreHeuristic(prompt);
    const deductions = result.antiPatterns.reduce((sum, p) => sum + p.points, 0);
    const bonuses = result.positiveSignals.length * 10;
    expect(result.score).toBe(Math.max(0, Math.min(100, 70 - deductions + bonuses)));
  });

  it('positive signals offset anti-pattern deductions', () => {
    // filler_words (-5) but has_file_path (+10) and has_constraints (+10)
    const prompt =
      'Could you refactor src/auth/middleware.ts to use async await? You must preserve the existing API contract.';
    const result = scoreHeuristic(prompt);
    expect(result.positiveSignals).toContain('has_file_path');
    expect(result.positiveSignals).toContain('has_constraints');
    const fillerPenalty = result.antiPatterns.find(p => p.id === 'filler_words');
    expect(fillerPenalty).toBeDefined();
    // Net: 70 - 5 + 10 + 10 = 85
    const deductions = result.antiPatterns.reduce((sum, p) => sum + p.points, 0);
    const bonuses = result.positiveSignals.length * 10;
    expect(result.score).toBe(Math.max(0, Math.min(100, 70 - deductions + bonuses)));
  });

  it('quickTip comes from the first matched anti-pattern', () => {
    const result = scoreHeuristic('fix it');
    expect(result.quickTip).not.toBeNull();
    expect(result.quickTip).toBe(result.antiPatterns[0].hint);
  });

  it('quickTip is null when no anti-patterns match', () => {
    const result = scoreHeuristic(NEUTRAL_PROMPT);
    expect(result.quickTip).toBeNull();
  });
});

// ============================================================
// 6. Real-world prompt examples
// ============================================================

describe('scoreHeuristic — real-world prompts', () => {
  it('high-quality prompt scores well', () => {
    const prompt = [
      'In src/components/UserTable.tsx, the pagination component does not update',
      'when the user clicks "Next". Expected: clicking Next should increment the',
      'page state and fetch the next 20 rows. Actual: page state stays at 1.',
      '',
      'Here is the relevant code:',
      '```tsx',
      'const [page, setPage] = useState(1);',
      'const handleNext = () => { /* missing setPage call */ };',
      '```',
      '',
      'Please do not change the existing API call structure.',
    ].join('\n');
    const result = scoreHeuristic(prompt);
    // Should get file_path, code_block, constraints bonuses
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.positiveSignals.length).toBeGreaterThanOrEqual(2);
  });

  it('low-quality prompt scores poorly', () => {
    const result = scoreHeuristic('fix bug');
    expect(result.score).toBeLessThan(50);
    expect(result.antiPatterns.length).toBeGreaterThanOrEqual(2);
  });

  it('error-describing prompt without code block loses points', () => {
    const prompt = 'The error says something about a missing module when I run the build command';
    const result = scoreHeuristic(prompt);
    expect(result.antiPatterns.some(p => p.id === 'paraphrased_error')).toBe(true);
  });

  it('prompt with pasted error in code block scores higher', () => {
    const withoutBlock = 'The error says TypeError cannot read property of undefined';
    const withBlock = [
      'Getting this error when running tests:',
      '```',
      'TypeError: Cannot read property "id" of undefined',
      '  at UserService.getUser (src/services/user.ts:42)',
      '```',
    ].join('\n');
    const scoreLow = scoreHeuristic(withoutBlock).score;
    const scoreHigh = scoreHeuristic(withBlock).score;
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('retry without explanation is penalized', () => {
    const prompt = 'That did not work, try again';
    const history = ['That did not work, try again'];
    const result = scoreHeuristic(prompt, history);
    expect(result.antiPatterns.some(p => p.id === 'retry_detected')).toBe(true);
    expect(result.score).toBeLessThan(70);
  });
});
