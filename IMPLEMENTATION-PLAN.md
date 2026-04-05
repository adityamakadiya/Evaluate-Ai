# EvaluateAI v2 — Complete Implementation Plan

> AI-powered developer intelligence platform that hooks into CLI-based AI tools to track, score, and optimize how developers use AI.

**Created:** 2026-04-05
**Target:** Solo developers + small teams
**Stack:** TypeScript monorepo (pnpm + Turborepo)

---

## Table of Contents

1. [Decisions Locked](#1-decisions-locked)
2. [What This Product Actually Solves](#2-what-this-product-actually-solves)
3. [Architecture Overview](#3-architecture-overview)
4. [Integration Strategy (3-Tier)](#4-integration-strategy-3-tier)
5. [Data Capture — What We Capture at Each Hook](#5-data-capture--what-we-capture-at-each-hook)
6. [Data Model](#6-data-model)
7. [Scoring System (Dual-Layer)](#7-scoring-system-dual-layer)
8. [Session Analysis Engine](#8-session-analysis-engine)
9. [Real-Time Prompt Suggestions](#9-real-time-prompt-suggestions)
10. [CLI Design](#10-cli-design)
11. [Dashboard Design](#11-dashboard-design)
12. [Project Structure](#12-project-structure)
13. [Tech Stack](#13-tech-stack)
14. [5-Week Implementation Plan](#14-5-week-implementation-plan)
15. [What's Different from Old EvaluateAI](#15-whats-different-from-old-evaluateai)
16. [Business Model](#16-business-model)
17. [Market Fit & Real Pain Points](#17-market-fit--real-pain-points)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Post-Launch Roadmap (v0.2+)](#19-post-launch-roadmap-v02)

---

## 1. Decisions Locked

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Name | **EvaluateAI** | Fresh product, new repo |
| Language | **TypeScript** | Same ecosystem as Claude Code |
| MVP Integration | **Hooks-first** | Zero friction, native Claude Code support. Proxy for non-Claude tools. |
| Prompt Rewriting | **Suggestions only** (no blocking) | Non-intrusive, builds developer trust |
| Dashboard | **Local-only** (SQLite → Next.js) | No cloud dependency for MVP |
| Scoring | **LLM scoring** (Haiku) + heuristics | Real intelligence, not just regex |
| Target | **Solo devs + small teams** | HN launch, organic growth |

---

## 2. What This Product Actually Solves

```
PROBLEM                                    → SOLUTION
──────────────────────────────────────────────────────────────────────
"I spent $200 on Claude this month         → Per-session cost tracking
 but don't know where it went"               with project attribution

"I retry the same prompt 5 times"          → Real-time prompt scoring
                                             + concrete suggestions

"I use Opus for everything"                → Model recommendations
                                             per task complexity

"My context window fills up and            → Context pressure tracking
 work gets lost"                             + warnings

"No way to measure if AI is               → Efficiency scores, trends,
 actually helping my team"                   ROI dashboard

"New devs take 3 weeks to learn            → Shared templates + team
 good prompting"                             analytics (v0.2)
```

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DEVELOPER MACHINE                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  Claude Code CLI (unmodified)                               │     │
│  │                                                             │     │
│  │  Hooks (settings.json):                                     │     │
│  │   SessionStart      → evalai: create session record         │     │
│  │   UserPromptSubmit  → evalai: score prompt, suggest rewrite │     │
│  │   PreToolUse        → evalai: log tool usage, track tokens  │     │
│  │   PostToolUse       → evalai: capture result metadata       │     │
│  │   Stop              → evalai: session summary + score       │     │
│  │   SessionEnd        → evalai: finalize session, run analysis│     │
│  └──────────────┬──────────────────────────────────────────────┘     │
│                 │ JSON events via stdin                               │
│                 ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  evalai daemon (local, always-on)                           │     │
│  │                                                             │     │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ │     │
│  │  │ Event       │ │ Heuristic    │ │ SQLite               │ │     │
│  │  │ Processor   │→│ Scorer       │→│ (sessions, turns,    │ │     │
│  │  │             │ │ (10 patterns)│ │  scores, api_calls)  │ │     │
│  │  └─────────────┘ └──────────────┘ └──────────┬───────────┘ │     │
│  │                                               │             │     │
│  │  ┌──────────────────────────────────────┐     │             │     │
│  │  │ API Proxy (:9999) — FOR NON-CLAUDE   │     │             │     │
│  │  │ TOOLS (Codex, Cursor, Aider)         │     │             │     │
│  │  │ Captures exact token counts + cost   │     │             │     │
│  │  └──────────────────────────────────────┘     │             │     │
│  │                                               │             │     │
│  │  ┌──────────────────────────────────────┐     │             │     │
│  │  │ Local Dashboard (:3456)              │◄────┘             │     │
│  │  │ Next.js — reads SQLite directly      │                   │     │
│  │  │ Overview | Sessions | Analytics      │                   │     │
│  │  └──────────────────────────────────────┘                   │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                 │ Batch sync (every 60s, opt-in)                      │
└─────────────────┼────────────────────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CLOUD (SaaS — Phase 2+)                         │
│                                                                      │
│  ┌────────────┐   ┌──────────────┐   ┌─────────────────────────┐    │
│  │ Ingestion  │──▶│ Processing   │──▶│ Storage                 │    │
│  │ API        │   │ Workers      │   │                         │    │
│  │ (Hono)     │   │              │   │ PostgreSQL: sessions,   │    │
│  │            │   │ • Scorer     │   │   turns, teams, users   │    │
│  │ Auth:      │   │ • Analyzer   │   │                         │    │
│  │ API key    │   │   (Batch API │   │ TimescaleDB: metrics    │    │
│  │ per team   │   │    50% off)  │   │                         │    │
│  └────────────┘   │ • Pattern    │   │ S3/R2: raw logs         │    │
│                   │   Learner    │   │                         │    │
│  ┌────────────┐   └──────────────┘   └─────────────────────────┘    │
│  │ Dashboard  │                                                      │
│  │ (Next.js)  │◄─── REST + WebSocket ────────────────────────────   │
│  │ Team view  │                                                      │
│  └────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Design Principle

**No daemon, no proxy, no wrapper needed for Claude Code.** Hooks are invoked directly by Claude Code — each hook is a fast CLI command that reads stdin, writes to SQLite, and exits.

The proxy exists ONLY for non-Claude tools (Codex, Aider, Cursor). The MCP server exists for IDE integration.

---

## 4. Integration Strategy (3-Tier)

### Tier 1: Claude Code Hooks (Primary — Zero Friction)

This is the **killer feature**. Claude Code already sends structured JSON to hooks on every event:

```jsonc
// .claude/settings.json — installed by `evalai init`
{
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": "evalai hook session-start"
    }],
    "UserPromptSubmit": [{
      "type": "command",
      "command": "evalai hook prompt-submit"
      // Can show suggestion via stderr output
      // Exit code 0 = allow (always — we don't block)
    }],
    "PreToolUse": [{
      "type": "command",
      "command": "evalai hook pre-tool",
      "matcher": { "toolName": ".*" }
    }],
    "PostToolUse": [{
      "type": "command",
      "command": "evalai hook post-tool",
      "matcher": { "toolName": ".*" }
    }],
    "Stop": [{
      "type": "command",
      "command": "evalai hook stop"
    }],
    "SessionEnd": [{
      "type": "command",
      "command": "evalai hook session-end"
    }]
  }
}
```

**What this gives us for free:**
- Every prompt the developer types (UserPromptSubmit)
- Every tool call with full arguments (PreToolUse/PostToolUse)
- Session boundaries (SessionStart/SessionEnd)
- Response metadata (Stop)
- Ability to show suggestions in real-time

**No PTY needed. No proxy needed. No wrapper needed.** For Claude Code users, hooks ARE the integration layer.

### Tier 2: API Proxy (For Non-Claude Tools)

For Codex CLI, Aider, Continue, and other tools that don't have hook systems:

```typescript
// packages/proxy/src/server.ts
const TOOL_CONFIGS: Record<string, ToolConfig> = {
  codex:  { envVar: 'OPENAI_BASE_URL',    host: 'api.openai.com',    parser: parseOpenAI },
  aider:  { envVar: 'OPENAI_BASE_URL',    host: 'api.openai.com',    parser: parseOpenAI },
  cursor: { envVar: 'OPENAI_BASE_URL',    host: 'api.openai.com',    parser: parseOpenAI },
  // Claude Code doesn't need this — hooks cover it
};
```

The proxy:
- Runs on localhost:9999
- Intercepts API calls, extracts token counts + cost
- Forwards request/response unchanged
- Writes to same SQLite DB
- Adds < 5ms latency

### Tier 3: MCP Server (For IDE Integration)

Build an MCP server that any tool can connect to:

```jsonc
// .mcp.json — works in Claude Code, VS Code, any MCP client
{
  "mcpServers": {
    "evaluateai": {
      "command": "evalai",
      "args": ["mcp-serve"],
      "env": {}
    }
  }
}
```

**MCP tools exposed:**
- `evalai_score_prompt` — score a prompt and get suggestions
- `evalai_session_stats` — get current session metrics
- `evalai_suggest_model` — recommend cheaper model for this task
- `evalai_get_template` — suggest a template for this task type

This means any MCP-compatible tool gets optimization for free.

### Why Hooks Over Proxy/PTY/Wrapper

| Approach | Overhead | Setup | Reliability | Data Quality |
|----------|----------|-------|-------------|--------------|
| **Hooks (chosen)** | 0ms added | `evalai init` | Native, maintained by Anthropic | Structured JSON events |
| Proxy | 5ms/request | Env var + daemon | Port conflicts, cert issues | Raw HTTP |
| PTY wrapper | 1-2ms lag | Shell alias | Terminal escape codes | Unstructured text |
| Shell hooks | 0ms | .zshrc edit | Command-level only | No streaming data |

---

## 5. Data Capture — What We Capture at Each Hook

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│ Hook Event          │ Data Captured                                        │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ SessionStart        │ session_id, tool, project_dir, git_branch, git_repo  │
│                     │ model, timestamp                                     │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ UserPromptSubmit    │ prompt_text, prompt_tokens (estimated),              │
│                     │ prompt_score, anti_patterns[], turn_number           │
│                     │ ──── SHOWS SUGGESTION IF SCORE < THRESHOLD ────     │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ PreToolUse          │ tool_name, tool_args (file paths, commands),         │
│                     │ is this a retry of a failed tool?                    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ PostToolUse         │ tool_name, success/failure, output_size,             │
│                     │ files_changed, execution_time_ms                     │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Stop                │ response_summary, total_tokens_this_turn,            │
│                     │ tool_calls_made, was_useful (heuristic)              │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ SessionEnd          │ total_turns, total_tokens, total_cost,               │
│                     │ duration, files_changed, efficiency_score            │
│                     │ → triggers async session analysis                    │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

### Data Flow Per Hook

```
SessionStart:
  → INSERT INTO sessions (id, project_dir, git_repo, git_branch, model, started_at)

UserPromptSubmit:
  → INSERT INTO turns (id, session_id, turn_number, prompt_text, prompt_hash,
                        prompt_tokens_est, heuristic_score, anti_patterns, created_at)
  → UPDATE sessions SET total_turns = total_turns + 1
  → Check prompt_hash against prior turns → set was_retry = true if match
  → Async: queue LLM scoring → UPDATE turns SET llm_score, score_breakdown
  → If score < threshold: print suggestion to stderr

PreToolUse:
  → INSERT INTO tool_events (id, session_id, tool_name, tool_input_summary, created_at)
  → UPDATE sessions SET total_tool_calls = total_tool_calls + 1

PostToolUse:
  → UPDATE tool_events SET success, execution_ms WHERE id = matching event
  → If tool = "Edit" or "Write": UPDATE sessions SET files_changed += 1

Stop:
  → UPDATE turns SET response_tokens_est, latency_ms WHERE latest turn
  → UPDATE sessions SET total_input_tokens, total_output_tokens, total_cost_usd

SessionEnd:
  → UPDATE sessions SET ended_at, avg_prompt_score, efficiency_score,
                        token_waste_ratio, context_peak_pct
  → Spawn detached: session analysis via Haiku
  → UPDATE sessions SET analysis, analyzed_at (when complete)
```

---

## 6. Data Model

### SQLite Schema

```sql
-- Location: ~/.evaluateai-v2/db.sqlite

-- ============================================================
-- SESSIONS: One row per AI conversation
-- ============================================================
CREATE TABLE sessions (
  id                  TEXT PRIMARY KEY,     -- from Claude Code session_id
  tool                TEXT NOT NULL,        -- 'claude-code', 'codex', 'aider'
  integration         TEXT NOT NULL,        -- 'hooks', 'proxy', 'mcp'
  project_dir         TEXT,
  git_repo            TEXT,
  git_branch          TEXT,
  model               TEXT,
  started_at          TEXT NOT NULL,
  ended_at            TEXT,

  -- Aggregates (updated incrementally, finalized on session-end)
  total_turns         INTEGER DEFAULT 0,
  total_input_tokens  INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd      REAL DEFAULT 0,
  total_tool_calls    INTEGER DEFAULT 0,
  files_changed       INTEGER DEFAULT 0,

  -- Scores (calculated on session-end)
  avg_prompt_score    REAL,
  efficiency_score    REAL,
  token_waste_ratio   REAL,
  context_peak_pct    REAL,

  -- LLM Analysis (filled async after session-end)
  analysis            TEXT,                 -- JSON from Haiku analysis
  analyzed_at         TEXT
);

-- ============================================================
-- TURNS: One row per user prompt within a session
-- ============================================================
CREATE TABLE turns (
  id                  TEXT PRIMARY KEY,     -- ULID
  session_id          TEXT NOT NULL REFERENCES sessions(id),
  turn_number         INTEGER NOT NULL,

  -- User prompt
  prompt_text         TEXT,                 -- nullable (privacy mode)
  prompt_hash         TEXT NOT NULL,        -- SHA256 for dedup detection
  prompt_tokens_est   INTEGER,

  -- Heuristic scoring (instant)
  heuristic_score     REAL,
  anti_patterns       TEXT,                 -- JSON: ["vague_verb", "no_file_ref"]

  -- LLM scoring (async)
  llm_score           REAL,
  score_breakdown     TEXT,                 -- JSON: {specificity, context, clarity, actionability}

  -- Suggestion tracking
  suggestion_text     TEXT,
  suggestion_accepted BOOLEAN,
  tokens_saved_est    INTEGER,

  -- AI response metadata (from Stop hook)
  response_tokens_est INTEGER,
  tool_calls          TEXT,                 -- JSON: [{name, success}]
  latency_ms          INTEGER,

  -- Derived
  was_retry           BOOLEAN DEFAULT FALSE,
  context_used_pct    REAL,
  created_at          TEXT NOT NULL
);

-- ============================================================
-- TOOL_EVENTS: Individual tool calls within a turn
-- ============================================================
CREATE TABLE tool_events (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT NOT NULL REFERENCES sessions(id),
  turn_id             TEXT REFERENCES turns(id),
  tool_name           TEXT NOT NULL,
  tool_input_summary  TEXT,
  success             BOOLEAN,
  execution_ms        INTEGER,
  created_at          TEXT NOT NULL
);

-- ============================================================
-- API_CALLS: Raw API data (from proxy, for non-Claude tools)
-- ============================================================
CREATE TABLE api_calls (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT REFERENCES sessions(id),
  provider            TEXT NOT NULL,        -- 'anthropic', 'openai'
  model               TEXT NOT NULL,
  input_tokens        INTEGER NOT NULL,
  output_tokens       INTEGER NOT NULL,
  cache_read_tokens   INTEGER DEFAULT 0,
  cache_write_tokens  INTEGER DEFAULT 0,
  cost_usd            REAL NOT NULL,
  latency_ms          INTEGER NOT NULL,
  status_code         INTEGER NOT NULL,
  created_at          TEXT NOT NULL
);

-- ============================================================
-- SCORING_CALLS: Track our own LLM scoring costs
-- ============================================================
CREATE TABLE scoring_calls (
  id                  TEXT PRIMARY KEY,
  turn_id             TEXT REFERENCES turns(id),
  model               TEXT NOT NULL,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  cost_usd            REAL,
  created_at          TEXT NOT NULL
);

-- ============================================================
-- CONFIG: User preferences
-- ============================================================
CREATE TABLE config (
  key                 TEXT PRIMARY KEY,
  value               TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sessions_project ON sessions(project_dir);
CREATE INDEX idx_turns_session ON turns(session_id, turn_number);
CREATE INDEX idx_turns_hash ON turns(prompt_hash);
CREATE INDEX idx_turns_created ON turns(created_at);
CREATE INDEX idx_tool_events_session ON tool_events(session_id);
CREATE INDEX idx_api_calls_session ON api_calls(session_id);
```

---

## 7. Scoring System (Dual-Layer)

### Layer 1: Heuristic Scorer (0ms, always runs)

**Baseline: 70 points.** Anti-patterns deduct. Positive signals add. Capped at 0-100.

#### Anti-Patterns (deductions)

| ID | Severity | Points | Detection | Fix Hint |
|----|----------|--------|-----------|----------|
| `vague_verb` | HIGH | -15 | `/^(fix\|make\|do\|help\|improve\|change\|update)\b.{0,20}$/i` | "Add: which file, what behavior, what error" |
| `paraphrased_error` | HIGH | -15 | Mentions "error" without code block | "Paste the exact error message in backticks" |
| `too_short` | HIGH | -15 | Word count < 8 | "Add context: file path, function name, expected behavior" |
| `retry_detected` | HIGH | -15 | prompt_hash matches earlier turn in session | "Explain what was wrong with the prior answer" |
| `no_file_ref` | MEDIUM | -10 | Mentions code concepts without file path | "Specify the file path and function name" |
| `multi_question` | MEDIUM | -10 | 3+ question marks | "One question per turn — split into steps" |
| `overlong_prompt` | MEDIUM | -10 | Word count > 500 | "Split into task description + separate context" |
| `no_expected_output` | MEDIUM | -10 | Long prompt without success criteria | "Describe what success looks like" |
| `unanchored_ref` | LOW | -5 | Starts with "it"/"that"/"the issue"/"this" | "Re-state what 'it' refers to — AI may lose context" |
| `filler_words` | LOW | -5 | "please"/"could you"/"would you mind" | "Filler words cost tokens — remove for efficiency" |

#### Positive Signals (bonuses)

| ID | Points | Detection |
|----|--------|-----------|
| `has_file_path` | +10 | Contains `/path/file.ext` pattern |
| `has_code_block` | +10 | Contains triple-backtick code blocks |
| `has_error_msg` | +10 | Code block containing "error"/"exception"/"traceback" |
| `has_constraints` | +10 | Contains "must"/"should not"/"without"/"preserve"/"don't change" |

#### Score Calculation

```
score = 70
      - sum(matched anti_pattern deductions)
      + sum(matched positive_signal bonuses)
score = clamp(score, 0, 100)
```

### Layer 2: LLM Scorer (Haiku, async, cached)

**When:** After heuristic score, fire-and-forget async call to Haiku.
**Cost:** ~$0.0003 per call.
**Cache:** By SHA256 of prompt text. Same prompt never scored twice.

#### Scoring Prompt

```
You are a prompt quality scorer for AI coding tools.

Score this developer prompt on 4 dimensions (each 0-25, total 0-100):

1. SPECIFICITY (0-25): Does it name files, functions, line numbers?
2. CONTEXT (0-25): Does it include error messages, what was tried, why it matters?
3. CLARITY (0-25): Is the expected outcome stated? One clear ask?
4. ACTIONABILITY (0-25): Can the AI act immediately without asking questions?

Also provide:
- A one-sentence suggestion to improve the prompt
- Whether a cheaper model could handle this task
- Estimated tokens the improved prompt would save

Prompt to score:
"""
{prompt_text}
"""

Project: {project_dir}, Branch: {git_branch}

Respond in JSON only:
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
}
```

### Efficiency Score (Per Session)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EFFICIENCY SCORE (0-100)                      │
│                                                                 │
│  Score = 0.30 × PromptQuality                                  │
│        + 0.25 × TurnEfficiency                                  │
│        + 0.20 × CostEfficiency                                  │
│        + 0.15 × ModelFit                                        │
│        + 0.10 × OutcomeSignal                                   │
│                                                                 │
│  PromptQuality   = avg(turn_scores) / 100              [0-1]   │
│  TurnEfficiency  = min(1, ideal_turns / actual_turns)  [0-1]   │
│  CostEfficiency  = 1 - token_waste_ratio               [0-1]   │
│  ModelFit        = cheapest_viable_cost / actual_cost   [0-1]   │
│  OutcomeSignal   = (files_changed > 0 && retry < 20%)  [0-1]   │
│                                                                 │
│  Token Waste = retry_tokens + filler_tokens + redundant_context │
│  Context Pressure = max_context_used% across all turns          │
└─────────────────────────────────────────────────────────────────┘

Ideal Turns Estimation:
  - Simple question (< 50 token prompt, no code refs): 1 turn
  - Bug fix with error message: 1-2 turns
  - Feature implementation: 2-4 turns
  - Complex refactoring: 3-6 turns
```

---

## 8. Session Analysis Engine

### Post-Session LLM Analysis

**Trigger:** SessionEnd hook → spawns detached background process.
**Model:** Claude Haiku (~$0.001 per analysis).

#### Analysis Prompt

```
Analyze this AI coding session for efficiency:

Session: {tool} on {git_repo}:{git_branch}
Turns: {total_turns} | Tokens: {total_tokens} | Cost: ${cost}
Duration: {duration_minutes}min

Turn-by-turn data:
{turns_formatted}

Return JSON:
{
  "efficiency_score": 0-100,
  "summary": "one sentence summary of what happened",
  "wasted_turns": [{"turn": N, "reason": "why this was wasteful"}],
  "optimal_turn_count": N,
  "spiral_detected": bool,
  "model_recommendations": [
    {"turn": N, "used": "sonnet", "recommended": "haiku", "savings_usd": 0.XX}
  ],
  "rewritten_first_prompt": "how the first prompt should have been written",
  "top_tip": "most impactful improvement for this user"
}
```

### Using Batch API for Cost Savings (50% Off)

For non-urgent analysis, queue sessions and use Anthropic's Batch API:

```typescript
// packages/core/src/analysis/batch-analyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function queueSessionAnalysis(sessions: Session[]) {
  const requests = sessions.map(session => ({
    custom_id: session.id,
    params: {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: buildAnalysisPrompt(session)
      }]
    }
  }));

  const batch = await client.messages.batches.create({ requests });
  return batch.id;
  // Batch completes async, typically < 1 hour
  // 50% cost reduction vs real-time API calls
}
```

### Analysis Cost Math

| Component | Tokens | Cost (Haiku) |
|-----------|--------|--------------|
| System prompt | ~200 | — |
| Session data (5 turns avg) | ~800 | — |
| Total input | ~1000 | $0.0008 |
| Output | ~500 | $0.0004 |
| **Per analysis** | **~1500** | **~$0.0012** |
| **Per day (10 sessions)** | | **~$0.012** |
| **Per month** | | **~$0.36** |
| **With Batch API (50% off)** | | **~$0.18/month** |

---

## 9. Real-Time Prompt Suggestions

Using `UserPromptSubmit` hook — suggestions shown via stderr, prompt always allowed through:

```typescript
// packages/cli/src/hooks/prompt-submit.ts

async function handlePromptSubmit(event: UserPromptSubmitEvent) {
  const { prompt, session_id } = event;

  // Layer 1: instant heuristic score
  const heuristic = scoreHeuristic(prompt);

  // Write to DB immediately
  await insertTurn(session_id, prompt, heuristic);

  // Show suggestion if score is low (never block)
  if (heuristic.score < getThreshold() && heuristic.quickTip) {
    // stderr output appears as hook feedback in Claude Code
    console.error(`[EvaluateAI] Score: ${heuristic.score}/100`);
    console.error(`Tip: ${heuristic.quickTip}`);
    if (heuristic.suggestion) {
      console.error(`Suggested: "${heuristic.suggestion}"`);
    }
  }

  // Layer 2: async LLM scoring (fire and forget)
  if (getConfig('scoring') === 'llm') {
    scoreLLMAsync(session_id, prompt).catch(() => {});
  }

  // Always allow the prompt through
  process.exit(0);
}
```

**What the developer sees:**

```
> fix the login bug

  [EvaluateAI] Score: 31/100
  Tip: Add file path and paste the exact error message
  Suggested: "Fix the null reference in src/auth/middleware.ts
  where req.user is undefined after JWT expiry"
```

The suggestion is informational. The original prompt goes through unchanged.

---

## 10. CLI Design

### Commands

```bash
# ─── SETUP ─────────────────────────────────────
evalai init                    # Install hooks into Claude Code settings.json
evalai init --check            # Verify hooks are correctly installed
evalai init --uninstall        # Remove hooks

# ─── HOOK HANDLERS (called by Claude Code) ─────
evalai hook session-start      # Handle SessionStart event
evalai hook prompt-submit      # Handle UserPromptSubmit event
evalai hook pre-tool           # Handle PreToolUse event
evalai hook post-tool          # Handle PostToolUse event
evalai hook stop               # Handle Stop event
evalai hook session-end        # Handle SessionEnd event

# ─── STATS ─────────────────────────────────────
evalai stats                   # Today's summary
evalai stats --week            # This week
evalai stats --month           # This month
evalai stats --compare         # vs previous period

# ─── SESSIONS ──────────────────────────────────
evalai sessions                # List recent sessions
evalai sessions <id>           # Detailed view of one session

# ─── DASHBOARD ─────────────────────────────────
evalai dashboard               # Start local dashboard on :3456
evalai dashboard --port 8080   # Custom port

# ─── CONFIG ────────────────────────────────────
evalai config                  # Show current config
evalai config set <key> <value>
# Keys: privacy (off|local|hash), scoring (heuristic|llm),
#        threshold (0-100), dashboard-port (1024-65535)

# ─── DATA ──────────────────────────────────────
evalai export --csv            # Export sessions to CSV
evalai export --json           # Export as JSON
evalai reset                   # Clear all data (with confirmation)
```

### CLI Output Examples

#### `evalai stats`

```
  EvaluateAI — Today (Apr 5, 2026)
  ─────────────────────────────────────────
  Sessions:    6          Cost:     $0.84
  Turns:       23         Tokens:   89,400
  Avg Score:   71/100     Efficiency: 68/100

  vs Yesterday: cost ↓12%  score ↑4pts  turns/session ↓0.8

  Top Issues:
    vague_verb ×3   no_file_ref ×2   retry ×1

  Tip: Adding file paths to prompts would save ~1,200 tokens today.
```

#### `evalai sessions`

```
  Recent Sessions
  ─────────────────────────────────────────────────────────────
  ID       Task                    Turns  Cost    Score  Time
  a3f9c2   Fix auth middleware       3    $0.02    82   2h ago
  b7e1d4   Add pagination to API    7    $0.09    54   4h ago
  c2a8f6   Write unit tests         2    $0.01    91   6h ago
  d9b3e1   Debug memory leak       11    $0.14    38   yesterday
  ─────────────────────────────────────────────────────────────
```

---

## 11. Dashboard Design

### Overview Page (/)

```
┌──────────────────────────────────────────────────────────────────┐
│  EvaluateAI                                       [Settings ⚙]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐  │
│  │ $4.20        │ │ 189K         │ │ 73/100       │ │ 14     │  │
│  │ This Week    │ │ Tokens       │ │ Avg Score    │ │Sessions│  │
│  │ ↓18% ✓      │ │ ↓12% ✓      │ │ ↑8pts ✓     │ │        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘  │
│                                                                  │
│  ┌─ Cost Trend (30d) ──────────┐ ┌─ Score Trend (30d) ────────┐ │
│  │ $3│                         │ │ 100│                        │ │
│  │   │▇▇                       │ │    │          ▁▃▅▆▇▇▇      │ │
│  │ $2│  ▇▇▇                    │ │  75│    ▁▃▅▆▇▇             │ │
│  │   │     ▇▇▆▅▃▂▁            │ │  50│▅▇▇                    │ │
│  │ $0└─────────────            │ │  25└─────────────           │ │
│  └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│  ┌─ Top Issues ────────────────┐ ┌─ Model Usage ──────────────┐  │
│  │ vague_verb:    8x this week │ │ ████████ Sonnet  55%       │  │
│  │ no_file_ref:   5x           │ │ █████    Haiku   30%       │  │
│  │ retry:         3x           │ │ ███      Opus    15%       │  │
│  └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│  ┌─ Recent Sessions ───────────────────────────────────────────┐ │
│  │ Fix auth middleware   │ 3 turns │ $0.02 │ Score: 82  ✓     │ │
│  │ Add pagination        │ 7 turns │ $0.09 │ Score: 54  ⚠     │ │
│  │ Write unit tests      │ 2 turns │ $0.01 │ Score: 91  ✓     │ │
│  │ Debug memory leak     │ 11 turns│ $0.14 │ Score: 38  ✗     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Session Detail (/sessions/[id])

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Sessions   Fix auth middleware · Sonnet · 3 turns · $0.02     │
├────────────────────────────────┬─────────────────────────────────┤
│                                │                                 │
│  TURN TIMELINE                 │  SESSION METRICS                │
│                                │                                 │
│  Turn 1                        │  Efficiency:    82/100          │
│  ┌──────────────────────────┐  │  Token Waste:   12%             │
│  │ Heuristic: 31  LLM: 28  │  │  Context Peak:  34%             │
│  │                          │  │  Cost:          $0.021          │
│  │ "fix the auth bug"       │  │                                 │
│  │                          │  │  COST PER TURN                  │
│  │ Suggestion shown:        │  │  T1: ████████  $0.008          │
│  │ "Fix null reference in   │  │  T2: ██████    $0.007          │
│  │  src/auth/middleware.ts   │  │  T3: █████     $0.006          │
│  │  where req.user is..."   │  │                                 │
│  │                          │  │  CONTEXT USAGE                  │
│  │ Anti-patterns:           │  │  T1: ██        12%              │
│  │  vague_verb, too_short   │  │  T2: █████     28%              │
│  └──────────────────────────┘  │  T3: ██████    34%              │
│                                │                                 │
│  [Response: 2 files modified]  │  MODEL RECOMMENDATION            │
│                                │  Haiku could handle T3           │
│  Turn 2                        │  Savings: $0.003                │
│  ┌──────────────────────────┐  │                                 │
│  │ Score: 71                │  │                                 │
│  │ "The fix works but now   │  │                                 │
│  │  the refresh token..."   │  │                                 │
│  └──────────────────────────┘  │                                 │
│                                │                                 │
├────────────────────────────────┴─────────────────────────────────┤
│  LLM Analysis:                                                   │
│  "Good session. The weak first prompt caused a clarification     │
│   round. Including the file path and error message upfront       │
│   would have reduced this to 2 turns. Savings: $0.007."         │
└──────────────────────────────────────────────────────────────────┘
```

### Team View (/team) — Phase 2

```
┌─────────────────────────────────────────────────────────┐
│  Team Analytics · Acme Engineering (5 members)          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Team Summary (This Week)                               │
│  Total spend: $89.20 (↓22% vs last week)               │
│  Total sessions: 187                                    │
│  Avg efficiency: 71/100                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Member     │ Sessions │ Cost   │ Score │ Trend  │   │
│  ├────────────┼──────────┼────────┼───────┼────────┤   │
│  │ Alice      │    42    │ $18.50 │  82   │  ↑ +8  │   │
│  │ Bob        │    38    │ $22.10 │  68   │  ↑ +3  │   │
│  │ Charlie    │    51    │ $31.40 │  59   │  ↓ -2  │   │
│  │ Diana      │    34    │ $11.20 │  88   │  ↑ +5  │   │
│  │ Eve        │    22    │ $6.00  │  76   │  ── 0  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Common Issues (team-wide)                              │
│  1. vague_verb pattern: 34 occurrences (Charlie: 18)    │
│  2. retry_detected: 12 occurrences                      │
│  3. model_mismatch: Opus for simple tasks 23x           │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Project Structure

```
evaluateai-v2/
├── packages/
│   ├── core/                           # Shared logic (zero side effects)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts                   # Drizzle ORM schema
│   │   │   │   ├── client.ts                   # SQLite connection
│   │   │   │   └── migrations/
│   │   │   │       └── 0001_initial.sql
│   │   │   ├── scoring/
│   │   │   │   ├── heuristic.ts                # 10 anti-patterns + 4 signals
│   │   │   │   ├── llm-scorer.ts               # Haiku scoring + cache
│   │   │   │   ├── efficiency.ts               # Session efficiency calc
│   │   │   │   └── types.ts
│   │   │   ├── analysis/
│   │   │   │   ├── session-analyzer.ts         # Post-session LLM analysis
│   │   │   │   └── batch-analyzer.ts           # Batch API for bulk analysis
│   │   │   ├── models/
│   │   │   │   └── pricing.ts                  # Model cost table + recommender
│   │   │   ├── tokens/
│   │   │   │   └── estimator.ts                # tiktoken-based estimation
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                            # CLI + Hook Handlers
│   │   ├── src/
│   │   │   ├── index.ts                        # Commander.js entry
│   │   │   ├── commands/
│   │   │   │   ├── init.ts                     # Install/check/uninstall hooks
│   │   │   │   ├── stats.ts                    # Usage statistics
│   │   │   │   ├── sessions.ts                 # Browse sessions
│   │   │   │   ├── dashboard.ts                # Launch local dashboard
│   │   │   │   ├── config.ts                   # Configuration
│   │   │   │   └── export.ts                   # CSV/JSON export
│   │   │   ├── hooks/                          # Claude Code hook handlers
│   │   │   │   ├── handler.ts                  # Shared hook logic
│   │   │   │   ├── session-start.ts
│   │   │   │   ├── prompt-submit.ts            # Score + suggest
│   │   │   │   ├── pre-tool.ts
│   │   │   │   ├── post-tool.ts
│   │   │   │   ├── stop.ts
│   │   │   │   └── session-end.ts              # Finalize + trigger analysis
│   │   │   └── utils/
│   │   │       ├── display.ts                  # chalk terminal formatting
│   │   │       └── paths.ts                    # ~/.evaluateai-v2/ helpers
│   │   ├── bin/
│   │   │   └── evalai.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── proxy/                          # API Proxy (Tier 2)
│   │   ├── src/
│   │   │   ├── server.ts                       # Fastify proxy
│   │   │   ├── interceptors/
│   │   │   │   ├── anthropic.ts
│   │   │   │   └── openai.ts
│   │   │   └── recorder.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/                     # MCP Server (Tier 3)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── tools/
│   │   │       ├── score-prompt.ts
│   │   │       ├── session-stats.ts
│   │   │       ├── suggest-model.ts
│   │   │       └── get-template.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── dashboard/                      # Local Web UI
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                    # Overview
│       │   │   ├── sessions/
│       │   │   │   ├── page.tsx                # Session browser
│       │   │   │   └── [id]/page.tsx           # Session detail
│       │   │   ├── analytics/page.tsx          # Charts
│       │   │   ├── settings/page.tsx           # Config
│       │   │   └── api/                        # API routes (read SQLite)
│       │   │       ├── sessions/route.ts
│       │   │       ├── stats/route.ts
│       │   │       └── config/route.ts
│       │   ├── components/
│       │   │   ├── stats-cards.tsx
│       │   │   ├── cost-chart.tsx
│       │   │   ├── score-trend.tsx
│       │   │   ├── session-table.tsx
│       │   │   ├── turn-timeline.tsx
│       │   │   ├── anti-pattern-list.tsx
│       │   │   ├── model-donut.tsx
│       │   │   ├── context-usage.tsx
│       │   │   └── efficiency-gauge.tsx
│       │   └── lib/
│       │       ├── db.ts
│       │       └── utils.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── package.json                        # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .eslintrc.json
├── LICENSE
├── README.md
└── IMPLEMENTATION-PLAN.md
```

---

## 13. Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Runtime | Node.js 20+ LTS | Stable, widely available |
| Language | TypeScript 5.x | Type safety across monorepo |
| Monorepo | pnpm + Turborepo | Fast, reliable, great caching |
| Database | SQLite via better-sqlite3 | Zero config, offline-first |
| ORM | Drizzle ORM | Type-safe SQL, great SQLite support |
| CLI framework | Commander.js | Standard, well-documented |
| Terminal UI | chalk + cli-table3 | Colors + tables |
| LLM API | @anthropic-ai/sdk | Official SDK |
| Token counting | js-tiktoken | Offline estimation |
| Proxy | Fastify | Fast, low overhead |
| MCP | @modelcontextprotocol/sdk | Official MCP SDK |
| Dashboard | Next.js 15 + shadcn/ui | SSR, API routes, dark theme |
| Charts | Recharts | React-native charting |
| CSS | Tailwind CSS 4.x | Rapid UI |
| Testing | Vitest | Fast, TypeScript-native |

### No External Services Required (MVP)

- No Docker, no PostgreSQL, no Redis
- Only external dependency: Anthropic API key (for LLM scoring)
- Everything else runs locally

---

## 14. 5-Week Implementation Plan

### Week 1: Foundation (Days 1-5)

```
Day 1: Monorepo Setup
├── pnpm workspace + Turborepo
├── Shared tsconfig, ESLint, Prettier
├── .gitignore, CI workflow
├── All 5 package directories created
└── DELIVERABLE: `pnpm build` works across all packages

Day 2: Core — Database
├── SQLite schema with Drizzle ORM (all 6 tables)
├── All indexes
├── Migration system
├── DB client with auto-init (~/.evaluateai-v2/db.sqlite)
└── DELIVERABLE: create session → insert turns → query back

Day 3: Core — Heuristic Scorer
├── 10 anti-pattern detectors
├── 4 positive signal detectors
├── Score calculation (baseline 70, deductions, bonuses)
├── 20+ unit tests
└── DELIVERABLE: scorePrompt("fix bug") → { score: 25, patterns: [...] }

Day 4: Core — Token Estimator + Model Pricing
├── js-tiktoken integration
├── Model pricing table (all Claude + GPT-4 models)
├── Cost calculator: (tokens, model) → cost_usd
├── Model recommender: (prompt, complexity) → model
└── DELIVERABLE: estimateTokens("text") and calculateCost() work

Day 5: Core — LLM Scorer
├── @anthropic-ai/sdk Haiku integration
├── Scoring prompt + response parsing
├── Cache by SHA256 (in scoring_calls table)
├── Graceful fallback to heuristic on API failure
└── DELIVERABLE: scoreLLM("fix bug") → { total: 28, suggestion: "..." }
```

**Week 1 Milestone:** `import { scorePrompt } from '@evaluateai/core'` works with both heuristic and LLM scoring.

---

### Week 2: Hook Integration (Days 6-10)

```
Day 6: CLI — Project Setup
├── Commander.js with subcommands
├── bin/evalai.ts entry point
├── npm link for local development
├── Path helpers (~/.evaluateai-v2/)
└── DELIVERABLE: `evalai --help` works

Day 7: CLI — Init Command
├── Detect Claude Code settings.json location
├── Merge hooks (don't overwrite existing config)
├── Write all 6 hook entries
├── --check and --uninstall flags
└── DELIVERABLE: `evalai init` installs hooks correctly

Day 8: Hooks — Session Start + End
├── session-start: read stdin → create session record
├── session-end: finalize aggregates, calculate scores
├── Git context extraction (repo URL, branch)
├── Edge cases: duplicate sessions, missing fields
└── DELIVERABLE: sessions auto-created and finalized

Day 9: Hooks — Prompt Submit (THE KEY HOOK)
├── Read prompt from stdin JSON
├── Run heuristic scorer (0ms)
├── Insert turn record
├── Detect retry (prompt_hash match)
├── Show suggestion via stderr if score < threshold
├── Queue async LLM scoring
└── DELIVERABLE: bad prompts get suggestions, all prompts scored

Day 10: Hooks — Tool Events + Stop
├── pre-tool: log tool event
├── post-tool: update with success/failure
├── stop: update turn with response metadata
├── Full integration test: all 6 hooks in sequence
└── DELIVERABLE: complete session lifecycle captured
```

**Week 2 Milestone:** Use Claude Code normally → sessions auto-tracked, scored, stored. Bad prompts get suggestions.

---

### Week 3: CLI + Analysis (Days 11-15)

```
Day 11: CLI — Stats Command
├── Today / week / month / compare views
├── Formatted terminal output with colors + trends
├── Top anti-patterns summary
└── DELIVERABLE: `evalai stats --week` shows real data

Day 12: CLI — Sessions Command
├── List recent sessions (table format)
├── Detail view with turn-by-turn breakdown
└── DELIVERABLE: `evalai sessions` and `evalai sessions <id>`

Day 13: Core — Session Analyzer
├── Post-session analysis prompt for Haiku
├── Background execution (spawned by session-end hook)
├── Parse + store analysis JSON
├── Batch API support for bulk analysis
└── DELIVERABLE: sessions auto-analyzed after completion

Day 14: Core — Efficiency Calculator
├── All 5 components calculated
├── Token waste ratio
├── Context pressure tracking
├── Ideal turn estimation heuristic
└── DELIVERABLE: efficiency_score populated on every session

Day 15: CLI — Config + Export
├── Config get/set with validation
├── Privacy modes (off / local / hash)
├── CSV and JSON export
├── Reset with confirmation
└── DELIVERABLE: full config management working
```

**Week 3 Milestone:** Complete CLI tool — capture, score, analyze, report, configure.

---

### Week 4: Dashboard (Days 16-20)

```
Day 16: Dashboard Setup
├── Next.js 15 + Tailwind + shadcn/ui
├── Dark theme, sidebar layout
├── API routes reading SQLite
├── `evalai dashboard` command
└── DELIVERABLE: dashboard starts and loads data

Day 17: Overview Page
├── Stat cards with trend percentages
├── Cost trend chart (30 days)
├── Score trend chart (30 days)
├── Top anti-patterns + model usage donut
├── Recent sessions list
└── DELIVERABLE: overview page with real data

Day 18: Session Browser
├── Sortable data table
├── Filters: date, score, model
├── Search by prompt text
├── Pagination
└── DELIVERABLE: browse and filter all sessions

Day 19: Session Detail
├── Turn timeline with scores + suggestions
├── Metrics sidebar (efficiency, waste, context, cost)
├── Cost per turn bar chart
├── Context usage progression
├── LLM analysis section
└── DELIVERABLE: full session drill-down

Day 20: Analytics + Settings
├── Analytics: cost breakdown, score distribution, patterns
├── Settings: privacy, scoring, threshold, hook status
├── Data management: export, reset
└── DELIVERABLE: all dashboard pages complete
```

**Week 4 Milestone:** `evalai dashboard` opens full local UI with all data.

---

### Week 5: Polish + Launch (Days 21-25)

```
Day 21: Edge Cases + Error Handling
├── Offline mode (LLM → heuristic fallback)
├── No API key handling
├── Empty state UX
├── Hook failures never break Claude Code (exit 0 on error)
└── DELIVERABLE: robust error handling everywhere

Day 22: Proxy + MCP Server
├── Fastify proxy for OpenAI-compatible tools
├── MCP server with 4 tools
├── Integration tests
└── DELIVERABLE: Tier 2 + Tier 3 integration working

Day 23: Testing
├── Unit tests: scoring, pricing, tokens
├── Integration tests: hook lifecycle
├── Dashboard component tests
├── E2E: init → hooks → stats verification
└── DELIVERABLE: CI green, good test coverage

Day 24: Documentation
├── README with install + quickstart + screenshots
├── CONTRIBUTING.md
├── In-app help for every command
├── Dashboard empty state onboarding
└── DELIVERABLE: docs complete

Day 25: Launch
├── npm publish @evaluateai/cli
├── GitHub release + changelog
├── Demo video (2 min)
├── HN: "Show HN: EvaluateAI — AI usage intelligence for developers"
├── Reddit: r/ClaudeAI, r/ChatGPTCoding, r/programming
└── DELIVERABLE: v1.0.0 live
```

---

## 15. What's Different from Old EvaluateAI

| Old EvaluateAI (v1) | New EvaluateAI (v2) |
|---|---|
| Proxy-based capture (port 9999) | **Hooks-first** (native, zero overhead) |
| Daemon process required | **No daemon** — hooks are CLI commands |
| `ANTHROPIC_BASE_URL` env var needed | **Nothing to configure** — hooks auto-installed |
| JSONL file watching (chokidar) | **Direct event capture** from Claude Code |
| Heuristic scoring only | **LLM scoring** (Haiku) + heuristics |
| No session analysis | **Post-session LLM analysis** with Batch API |
| PTY wrapper planned | **Not needed** — hooks replace PTY |
| Single tool (Claude) | **3-tier: Hooks + Proxy + MCP** for all tools |
| No dashboard | **Full Next.js dashboard** |
| No team features planned | **Team view designed** for v0.2 |

---

## 16. Business Model

### Pricing Tiers

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Free** | $0 | Solo devs | Local-only, heuristic scoring, basic stats, 30-day retention |
| **Pro** | $12/mo | Power users | LLM scoring, session analysis, full dashboard, unlimited retention |
| **Team** | $25/user/mo | Eng teams 5-50 | Team dashboard, shared templates, manager view, API |
| **Enterprise** | Custom | Large orgs 50+ | SSO/SAML, audit logs, on-prem, SLA |

### Revenue Path

```
Phase 1 (Month 1-6):   Free + Pro
                        Target: 1,000 free → 100 Pro ($1,200/mo)

Phase 2 (Month 6-12):  Add Team tier
                        Target: 20 teams × 10 users ($5,000/mo)

Phase 3 (Month 12-24): Enterprise
                        Target: 5 contracts ($50K+ ARR each)

Expansion: Dev tool → Team analytics → Enterprise AI observability
```

---

## 17. Market Fit & Real Pain Points

### Why Existing Tools Fail

| Tool | What It Shows | What's Missing |
|------|---------------|----------------|
| Anthropic Console | API usage, rate limits | No developer-level analytics, no prompt feedback |
| OpenAI Dashboard | Total tokens, cost/day | No per-session breakdown, no optimization |
| LangSmith/LangFuse | LLM app observability | Designed for production apps, not CLI workflows |
| Helicone | Request logging, cost | No intelligence layer, no optimization |

### Why Teams Pay

1. **Cost control** — "We spent $4,200 on AI last month. Where did it go?"
2. **Onboarding** — "New hires take 3 weeks to learn prompting. Templates cut it to 3 days."
3. **Standardization** — "5 devs, 5 styles, inconsistent results"
4. **ROI justification** — "Prove AI tools are making us more productive"

---

## 18. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Privacy: devs won't log prompts** | HIGH | Default local-only. Cloud opt-in. Hash mode. |
| **Developer resistance ("surveillance")** | HIGH | Self-improvement framing. Team features opt-in. You own data. |
| **Hook format changes** | MEDIUM | Version-pin format. Test against Claude Code releases. |
| **LLM scoring cost** | LOW | Haiku $0.0003/call. Cache by hash. Daily cap. |
| **Scoring accuracy questioned** | MEDIUM | Relative to own history. Show breakdown. Customizable threshold. |
| **Slow hooks break Claude Code** | HIGH | Catch all errors → exit 0. Async LLM. Target < 50ms. |

### Privacy Architecture

```
Privacy Modes:
  "off"   — No prompt text stored (only hashes + scores)
  "local" — Full text stored in local SQLite only (DEFAULT)
  "hash"  — SHA256 hashes only (dedup detection works, no text)
```

---

## 19. Post-Launch Roadmap (v0.2+)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Team sync** | High | 2 weeks | Cloud upload, team dashboard, PostgreSQL |
| **CLAUDE.md auto-updater** | High | 1 week | Auto-update project instructions from sessions |
| **Template library** | Medium | 1 week | Promote great prompts to reusable templates |
| **Weekly digest** | Medium | 2 days | Summary email with tips |
| **VS Code extension** | Low | 2 weeks | Inline scoring in VS Code |
| **Pattern learner** | Medium | 1 week | Weekly batch: find user-specific patterns |
| **Prompt caching analysis** | Low | 3 days | Track cache hit rates, recommend caching strategy |
| **CLI auto-update** | Low | 1 day | Check for new versions |

---

## Summary

```
EvaluateAI v2:

  Hook into Claude Code → Score every prompt → Show suggestions →
  Track sessions → Analyze efficiency → Display in dashboard →
  Help developers get better at AI.

  3-Tier Integration:
    Tier 1: Claude Code hooks (native, zero overhead) — MVP
    Tier 2: API proxy (Codex, Aider, Cursor) — Week 5
    Tier 3: MCP server (any MCP client) — Week 5

  Dual-Layer Scoring:
    Layer 1: Heuristic (10 patterns, 0ms, always)
    Layer 2: LLM (Haiku, async, cached, $0.0003/call)

  5 Weeks → v1.0.0 → npm publish → HN launch

  Zero friction. Zero overhead. Real intelligence.
```

---

*EvaluateAI v2 — Complete Implementation Plan v1.0 — April 5, 2026*
