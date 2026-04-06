# EvaluateAI

> AI-powered prompt scoring and usage intelligence for Claude Code developers.

EvaluateAI hooks into Claude Code to **score every prompt**, **track costs**, **suggest improvements**, and **visualize your AI usage** — all automatically.

## Install

```bash
npm install -g evaluateai
```

## Quick Start

```bash
# 1. Install hooks into Claude Code (one-time)
evalai init

# 2. Use Claude Code normally — EvaluateAI runs automatically
claude

# 3. Check your stats
evalai stats
```

That's it. After `evalai init`, every Claude Code session is tracked automatically.

## What It Does

When you type a prompt in Claude Code:

```
You: "fix the bug"

  [EvaluateAI] Score: 25/100
  Tip: Add: which file, what specific behavior, what error
```

Good prompts pass silently. Bad prompts get a quick tip.

After your session, check results:

```bash
evalai stats

  Today Stats
  ──────────────────────────────────────────────────
  Sessions:    6          Cost:     $0.84
  Turns:       23         Tokens:   89,400
  Avg Score:   71/100     Efficiency: 68/100

  Top Anti-Patterns
    vague_verb                3x
    no_file_ref               2x

  Tip: Adding file paths to prompts would save ~1,200 tokens today.
```

## How Scoring Works

Prompts are classified by **intent** and scored with tailored rules:

| Intent | Baseline | Example |
|--------|----------|---------|
| Research | 75 | "how does JWT auth work?" → **85** |
| Debug | 65 | "Fix null ref in src/auth.ts:47" → **75** |
| Feature | 70 | "Add pagination to /api/users" → **80** |
| Refactor | 70 | "Refactor src/auth — reduce duplication" → **90** |
| Review | 75 | "Review src/payments.ts for security" → **95** |

**What makes a good prompt:**
- Include file paths: `src/auth/login.ts`
- Paste exact errors in backticks
- State expected behavior
- Add constraints: "don't change the API contract"

**What lowers your score:**
- Vague: "fix the bug" (-15 pts)
- Too short: "help" (-15 pts)
- Paraphrased errors: "the error says something about null" (-15 pts)
- Retrying same prompt (-15 pts)

## Commands

```bash
# Setup
evalai init              # Install hooks into Claude Code
evalai init --check      # Verify hooks are installed
evalai init --uninstall  # Remove hooks

# Stats
evalai stats             # Today's summary
evalai stats --week      # This week
evalai stats --month     # This month
evalai stats --compare   # Compare vs previous period

# Sessions
evalai sessions          # List recent sessions
evalai sessions <id>     # Detailed session view

# Dashboard (local web UI)
evalai dashboard         # Open at http://localhost:3456

# Config
evalai config            # Show current settings
evalai config set scoring heuristic   # Scoring mode: heuristic | llm
evalai config set threshold 60        # Suggestion threshold (0-100)
evalai config set privacy local       # Privacy: off | local | hash

# Data
evalai export --csv      # Export sessions to CSV
evalai export --json     # Export as JSON
evalai sync              # Sync to Supabase (if configured)
```

## Dashboard

Start the local web dashboard:

```bash
evalai dashboard
# Opens http://localhost:3456
```

**Pages:**
- **Overview** — cost trends, score trends, anti-patterns, model usage
- **Sessions** — browse all sessions, click for detail
- **Session Detail** — turn-by-turn scores, AI responses, token breakdown
- **Turn Detail** — full prompt analysis with improvement coaching
- **Analytics** — cost charts, score distribution, efficiency trends
- **Settings** — privacy, scoring mode, threshold

## Cloud Sync (Optional)

Sync data to Supabase for backup or team features:

```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

# Sync
evalai sync
```

## How It Works

EvaluateAI uses Claude Code's native **hook system**. After `evalai init`, hooks are registered in `~/.claude/settings.json`. Claude Code calls them automatically:

```
SessionStart      → Create session record
UserPromptSubmit  → Score prompt, show suggestion if low
PreToolUse        → Log tool usage
PostToolUse       → Track file changes
Stop              → Record response tokens (from transcript)
SessionEnd        → Calculate efficiency, sync to cloud
```

**Zero overhead.** Hooks run in <50ms. Your Claude Code workflow is unchanged.

## Privacy

All data stays local by default (`~/.evaluateai-v2/db.sqlite`).

| Mode | What's Stored |
|------|--------------|
| `local` (default) | Full prompt text in local SQLite |
| `hash` | Only SHA256 hashes (no readable text) |
| `off` | Only scores and metadata (no prompts) |

Cloud sync is opt-in and requires explicit Supabase setup.

## Requirements

- Node.js 18+
- Claude Code CLI installed
- Anthropic API key (only if using LLM scoring mode)

## Links

- **GitHub**: https://github.com/adityamakadiya/Evaluate-Ai
- **npm**: https://www.npmjs.com/package/evaluateai
- **Core package**: https://www.npmjs.com/package/evaluateai-core

## License

MIT
