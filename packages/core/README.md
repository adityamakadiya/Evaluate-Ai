# evaluateai-core

Core scoring engine, database layer, and analysis tools for [EvaluateAI](https://www.npmjs.com/package/evaluateai).

## Install

```bash
npm install evaluateai-core
```

## Usage

```typescript
import {
  scoreHeuristic,
  estimateTokens,
  calculateCost,
  recommendModel,
  initDb,
} from 'evaluateai-core';

// Score a prompt
const result = scoreHeuristic("fix the bug");
console.log(result.score);        // 25
console.log(result.intent);       // "debug"
console.log(result.antiPatterns); // [{ id: "vague_verb", ... }]
console.log(result.quickTip);    // "Add: which file, what behavior, what error"

// Score a research prompt (won't be penalized for missing file paths)
const research = scoreHeuristic("how does JWT authentication work?");
console.log(research.score);   // 85
console.log(research.intent);  // "research"

// Estimate tokens
const tokens = estimateTokens("Hello world");
console.log(tokens); // 2

// Calculate cost
const cost = calculateCost(1000, 500, "claude-sonnet-4-6");
console.log(cost); // 0.0105

// Get model recommendation
const rec = recommendModel("What is a React hook?");
console.log(rec.model.name);  // "Claude Haiku 4.5"
console.log(rec.reason);      // "Simple question — Haiku is sufficient"
```

## API

### Scoring

#### `scoreHeuristic(text: string, promptHistory?: string[]): HeuristicResult`

Scores a prompt using intent-aware heuristic analysis.

**Returns:**
```typescript
{
  score: number;           // 0-100
  intent: string;          // 'research' | 'debug' | 'feature' | ...
  antiPatterns: AntiPattern[];
  positiveSignals: string[];
  quickTip: string | null;
}
```

**Intent types and baselines:**

| Intent | Baseline | Triggered By |
|--------|----------|-------------|
| research | 75 | "how", "what", "explain", "?" |
| debug | 65 | "fix", "error", "bug", "broken" |
| feature | 70 | "add", "create", "implement" |
| refactor | 70 | "refactor", "optimize", "clean up" |
| review | 75 | "review", "check", "audit" |
| generate | 70 | "write tests", "scaffold" |
| config | 70 | "configure", "deploy", "set up" |
| general | 70 | fallback |

### Tokens

#### `estimateTokens(text: string): number`

Estimates token count using tiktoken (cl100k_base encoding).

### Pricing

#### `calculateCost(inputTokens, outputTokens, modelId, cacheRead?, cacheWrite?): number`

Calculates exact cost in USD. Supports all Claude and GPT-4 models.

#### `recommendModel(promptText, provider?): { model, reason }`

Recommends the cheapest viable model for a prompt.

#### `getModelPricing(modelId): ModelPricing | null`

Returns pricing info for a model.

### Database

#### `initDb(path?): Database`

Initializes SQLite database with all tables and migrations.

#### `getDb(): Database`

Returns the active database connection.

### Analysis

#### `analyzeSession(session, turns): SessionAnalysis | null`

Analyzes a completed session using Claude Haiku (requires API key).

### Transcript

#### `getLatestResponse(transcriptPath): TranscriptResponse | null`

Reads the latest AI response from a Claude Code transcript JSONL file.

#### `getSessionSummary(transcriptPath): TranscriptSummary | null`

Reads full session summary with exact token counts from transcript.

### Supabase

#### `syncToSupabase(): SyncResult`

Syncs local SQLite data to Supabase cloud.

## Links

- **CLI tool**: https://www.npmjs.com/package/evaluateai
- **GitHub**: https://github.com/adityamakadiya/Evaluate-Ai

## License

MIT
