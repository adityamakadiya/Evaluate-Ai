# Core Package — Development Rules

## What This Package Does

Shared logic used by CLI and dashboard:
- Supabase client and database operations (all data in Supabase PostgreSQL)
- Heuristic scoring engine (intent-aware, 10 anti-patterns, 4+ signals)
- LLM scorer (Claude Haiku, cached)
- Token estimation (tiktoken)
- Model pricing (7 models)
- Efficiency calculator
- Session analyzer
- Transcript parser (reads Claude Code JSONL)

## Rules

### Exports
- All public API goes through `src/index.ts`
- Every new function/type must be exported from index.ts
- Use named exports only (no default exports)

### Database
- Supabase PostgreSQL only — no local SQLite
- Schema defined in `src/db/supabase-schema.sql` (run in Supabase SQL Editor)
- Client in `src/db/supabase.ts` using @supabase/supabase-js
- All reads/writes go directly to Supabase
- Requires SUPABASE_URL and SUPABASE_ANON_KEY env vars

### Scoring
- Scorer is in `src/scoring/heuristic.ts`
- ALWAYS classify intent first, then apply intent-specific rules
- Never penalize research prompts for missing file paths/errors
- Baseline scores: research=75, debug=65, others=70
- Anti-pattern points: high=-15, medium=-8 to -10, low=-3 to -5
- Positive signal points: +5 to +10
- Always clamp final score to 0-100
- Return `intent` field in HeuristicResult

### Testing
- Tests in `src/__tests__/`
- Use vitest
- Every test group uses a fresh temp SQLite DB
- No external API calls in tests
- Test both happy path and edge cases
- Currently 152 tests — don't reduce this number

### Types
- All shared types in `src/types.ts`
- Use interfaces for objects, types for unions
- All DB column types should match the schema

### Adding New Features
1. Add types to `src/types.ts`
2. Add implementation in appropriate directory
3. Export from `src/index.ts`
4. Add tests in `src/__tests__/`
5. Run `pnpm --filter evaluateai-core test` before committing
6. Run `pnpm --filter evaluateai-core build` to verify TypeScript compiles
