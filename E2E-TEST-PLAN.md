# EvaluateAI v2 -- End-to-End Manual Test Plan

> A comprehensive manual test plan covering the complete user journey from installation to dashboard verification. Intended for QA and developers validating releases.

**Version:** 2.0
**Last Updated:** 2026-04-05
**Estimated Time:** 60-90 minutes for full pass

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation Testing](#2-installation-testing)
3. [Initialization Testing](#3-initialization-testing)
4. [Hook Integration Testing](#4-hook-integration-testing-with-real-claude-code)
5. [Data Verification](#5-data-verification)
6. [Dashboard Testing](#6-dashboard-testing)
7. [Scoring Accuracy Testing](#7-scoring-accuracy-testing)
8. [Edge Cases](#8-edge-cases)
9. [Supabase Sync Testing](#9-supabase-sync-testing)
10. [Regression Checklist](#10-regression-checklist)

---

## 1. Prerequisites

### Required Software

| Software | Minimum Version | Verify With |
|----------|----------------|-------------|
| Node.js | 18.x or later | `node --version` |
| pnpm | 8.x or later | `pnpm --version` |
| Claude Code CLI | Latest | `claude --version` |
| Git | Any recent | `git --version` |
| SQLite3 (optional, for manual DB inspection) | Any | `sqlite3 --version` |

### API Key Requirements

- **Claude Code** must be authenticated (run `claude` and complete login if needed).
- **Anthropic API key** (for LLM scoring mode): set via `ANTHROPIC_API_KEY` environment variable. Without this, LLM scoring silently falls back to heuristic-only mode.
- **Supabase credentials** (optional, for Section 9 only): project URL and anon key from your Supabase dashboard.

### Environment Preparation

```bash
# Clone the monorepo
git clone <repo-url> && cd Evaluate-Ai

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

---

## 2. Installation Testing

### 2.1 Global Install (Production Path)

```bash
npm install -g @evaluateai/cli
```

**Expected:** Installs without errors. The `evalai` binary is available globally.

### 2.2 Local Link (Development Path)

```bash
cd packages/cli
pnpm link --global
```

**Expected:** `evalai` command is available in any terminal session.

### 2.3 Version Check

```bash
evalai --version
```

**Expected output (example):**
```
0.1.0
```

**Verify:** Output matches the version in `packages/cli/package.json`.

### 2.4 Help Output

```bash
evalai --help
```

**Expected output:**
```
Usage: evalai [options] [command]

EvaluateAI -- AI coding assistant quality analyzer

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  init            Initialize EvaluateAI: install hooks, create data directory, set up database
  stats           Show usage statistics
  sessions        List and inspect sessions
  config          View or set configuration values
  export          Export data to JSON or CSV
  sync            Sync local data to Supabase cloud
  hook            Handle a Claude Code hook event (internal)
  help [command]  display help for command
```

**Verify all 7 commands are listed:** init, stats, sessions, config, export, sync, hook.

---

## 3. Initialization Testing

### 3.1 Full Init

```bash
evalai init
```

**Expected output:**
```
  EvaluateAI Init
  ───────────────

  Creating data directory...
  [green] ~/.evaluateai-v2/ ready
  Initializing database...
  [green] Database initialized
  Installing hooks into Claude Code...
  [green] 6 hooks installed

  Setup complete!
  Run `evalai init --check` to verify.
  Run `evalai init --supabase` to enable cloud sync.
```

### 3.2 Verify Hook Installation

```bash
evalai init --check
```

**Expected output:**
```
  Hook Status
  ───────────

  [green checkmark] SessionStart
  [green checkmark] UserPromptSubmit
  [green checkmark] PreToolUse
  [green checkmark] PostToolUse
  [green checkmark] Stop
  [green checkmark] SessionEnd

  All hooks installed correctly.
```

**All 6 hooks must show green.** If any show red, `evalai init` did not write correctly.

### 3.3 Verify Settings File

```bash
cat ~/.claude/settings.json
```

**Expected:** The file contains a `hooks` key with entries for all 6 events. Each entry has:
- `"command": "evalai hook <EventName>"`
- `"timeout": 10000`

**Verify:** Any pre-existing user hooks (not from EvaluateAI) are preserved.

### 3.4 Verify Data Directory

```bash
ls -la ~/.evaluateai-v2/
```

**Expected:** Directory exists and contains:
- `db.sqlite` (or `db.sqlite3`) -- the SQLite database file

### 3.5 Verify Database Tables

```bash
sqlite3 ~/.evaluateai-v2/db.sqlite ".tables"
```

**Expected tables:** `sessions`, `turns`, `tool_events`, `config` (and possibly migration-related tables).

### 3.6 Verify Default Config

```bash
evalai config
```

**Expected output includes defaults:**
```
  Configuration
  ─────────────

  privacy          off
  scoring          heuristic
  threshold        50
  dashboard_port   3456
```

### 3.7 Uninstall and Reinstall

```bash
evalai init --uninstall
evalai init --check
```

**Expected after uninstall:** All 6 hooks show red X marks, message says "Some hooks are missing."

```bash
evalai init
evalai init --check
```

**Expected after reinstall:** All 6 hooks show green again.

---

## 4. Hook Integration Testing (with Real Claude Code)

> This section requires a real Claude Code session. Open a terminal in a **git repository** with actual code.

### 4.1 Start a Session

```bash
cd /path/to/any-git-repo
claude
```

**Expected:** Claude Code starts normally. No errors from EvaluateAI hooks. The SessionStart hook fires silently and creates a session record.

### 4.2 Test a BAD Prompt (Low Score)

Inside Claude Code, type:

```
fix the bug
```

**Expected behavior:**
1. EvaluateAI feedback appears in the output:
   ```
   [EvaluateAI] Score: 40/100
   Tip: Add: which file, what specific behavior, what error
   Suggested: Add: which file, what specific behavior, what error; Add context: file path, function name, expected behavior
   ```
2. The score should be below 50 (the default threshold).
3. Claude Code continues to process the prompt normally -- EvaluateAI never blocks.

**Anti-patterns expected:** `vague_verb`, `too_short`, `no_file_ref`.

### 4.3 Test a GOOD Prompt (High Score)

Inside Claude Code, type:

```
In src/utils/parser.ts, the parseConfig function throws "Cannot read property 'name' of undefined" when the input JSON has a missing `name` field. Add a null check on line 42 and return a default config object instead of throwing. Keep the existing behavior for valid inputs.
```

**Expected behavior:**
1. **No** `[EvaluateAI]` feedback appears (score is above threshold).
2. The turn is still recorded in the database with a high score.

**Positive signals expected:** `has_file_path`, `has_constraints`, `has_error_msg` (if error is in backticks).

### 4.4 Test a Retry (Repeat Prompt)

Type the same bad prompt from step 4.2 again:

```
fix the bug
```

**Expected:** Score is even lower due to `retry_detected` anti-pattern (additional -15 points).

### 4.5 End the Session

Exit Claude Code (Ctrl+C or type `/exit`).

**Expected:** The SessionEnd hook fires, finalizing the session. No errors visible.

### 4.6 Verify Data After Session

Immediately after exiting, run:

```bash
evalai stats
```

**Expected output (example):**
```
  Today Stats
  ───────────

  Sessions:    1
  Turns:       3
  Tokens:      ~150
  Cost:        $0.00
  Avg Score:   48
  Efficiency:  --

  Top Anti-Patterns
    vague_verb                2x
    too_short                 2x
    retry_detected            1x

  Tip: Add: which file, what specific behavior, what error
```

```bash
evalai sessions
```

**Expected:** A table listing the session with correct project name, turn count (3), and score.

```bash
evalai sessions <first-few-chars-of-session-id>
```

**Expected:** Turn-by-turn detail showing:
- Turn 1: low score, anti-patterns listed, suggestion text
- Turn 2: high score, no suggestion
- Turn 3: low score (retry), anti-patterns include `retry_detected`

---

## 5. Data Verification

> Run these checks after at least one complete Claude Code session from Section 4.

### 5.1 Stats Accuracy

```bash
evalai stats
evalai stats --week
evalai stats --month
evalai stats --compare
```

**Verify for each:**
- Session count matches the number of sessions you ran.
- Turn count matches total prompts entered across sessions.
- Token count is a reasonable estimate (roughly 1 token per 4 characters of prompt text for input).
- Cost is non-negative (may be $0.00 if no API calls were captured via proxy).
- Avg Score is between 0 and 100.
- Anti-pattern counts are non-negative integers.

### 5.2 Session List

```bash
evalai sessions
```

**Verify:**
- Sessions are listed in reverse chronological order (newest first).
- Project column shows the directory name (last segment of path).
- "When" column shows relative time (e.g., "2m ago").

### 5.3 Session Detail

```bash
evalai sessions <session-id-prefix>
```

**Verify:**
- Header shows correct project, model, start/end times.
- Turn-by-turn table has correct number of rows.
- Each turn shows a score between 0-100.
- Suggestion column shows tip text for low-scoring turns, "--" for good turns.
- Tool Calls section (if any) shows tool names with counts.
- Analysis section (if LLM scoring ran) shows summary and tips.

### 5.4 Direct DB Inspection

```bash
sqlite3 ~/.evaluateai-v2/db.sqlite "SELECT id, total_turns, avg_prompt_score, total_cost_usd FROM sessions ORDER BY started_at DESC LIMIT 5;"
```

**Verify:** Values match what `evalai stats` and `evalai sessions` reported.

---

## 6. Dashboard Testing

### 6.1 Start the Dashboard

```bash
cd packages/dashboard
pnpm dev
```

Or if a CLI command exists:
```bash
evalai dashboard
```

**Expected:** Dashboard starts on `http://localhost:3456`. Terminal shows no errors.

### 6.2 Overview Page (Home)

Open `http://localhost:3456` in a browser.

**Verify:**
- Page header shows "EvaluateAI" with "Overview" subtitle.
- **Stats Cards** (4 cards): Cost, Tokens, Avg Score, Sessions -- values match `evalai stats --week` output.
- **Cost Chart**: Line/bar chart showing daily cost trend. At least one data point if you ran a session today.
- **Score Trend**: Line chart showing daily average score.
- **Anti-Pattern List**: Top patterns with counts, matching `evalai stats` output.
- **Model Donut**: Pie/donut chart showing model distribution.
- **Session List**: Recent sessions with clickable rows.

### 6.3 Empty State

If no data exists, verify:
- A centered "No data yet" message with the BarChart3 icon appears.
- Text reads: "Start a coding session with Claude to see your usage stats..."

### 6.4 Session Detail Page

Click on a session in the session list.

**Verify at** `http://localhost:3456/sessions/<id>`:
- Back button navigates to overview.
- Session metadata (project, model, duration, cost, tokens, score) displayed.
- Turn timeline shows each turn with expandable detail.
- Scores per turn match `evalai sessions <id>` CLI output.
- Anti-patterns and suggestions shown per turn.
- Tool call breakdown shown if tools were used.
- Analysis section (if available) shows summary, spiral detection, tips.

### 6.5 Analytics Page

Navigate to `http://localhost:3456/analytics`.

**Verify:**
- Charts render without JavaScript errors (check browser console).
- Data is present if sessions exist.
- Time range selectors (if any) filter data correctly.

### 6.6 Settings Page

Navigate to `http://localhost:3456/settings`.

**Verify:**
- Config values displayed match `evalai config` CLI output.
- **Privacy mode** selector shows: off, local, hash.
- **Scoring mode** selector shows: heuristic, llm.
- **Threshold** slider/input shows current value (default 50).
- **Dashboard port** shows current value (default 3456).
- **Supabase URL/Key** fields shown (empty if not configured).
- **Save button** persists changes.

**Test save:**
1. Change threshold from 50 to 60.
2. Click Save.
3. Run `evalai config` in terminal -- verify threshold is now 60.
4. Change it back to 50 and save again.

### 6.7 Error Handling

- Stop the dashboard server, reload the page.
  **Expected:** Browser shows connection error (standard behavior).
- Delete `db.sqlite`, reload dashboard.
  **Expected:** Dashboard shows an error message or empty state, not a crash.

---

## 7. Scoring Accuracy Testing

> Test the heuristic scorer against known prompts. Run each prompt through a Claude Code session, then verify the score with `evalai sessions <id>`.
> Alternatively, unit tests in `packages/core/src/__tests__/scoring.test.ts` cover these patterns.

### Heuristic Scoring Rules

- **Baseline:** 70 points
- **Anti-patterns** (deductions): vague_verb (-15), paraphrased_error (-15), too_short (-15), retry_detected (-15), no_file_ref (-10), multi_question (-10), overlong_prompt (-10), no_expected_output (-10), unanchored_ref (-5), filler_words (-5)
- **Positive signals** (bonuses, +10 each): has_file_path, has_code_block, has_error_msg, has_constraints
- **Clamped** to 0-100

### Test Prompt Matrix

| # | Prompt | Expected Score Range | Expected Anti-Patterns | Expected Positive Signals |
|---|--------|---------------------|----------------------|--------------------------|
| 1 | `fix the bug` | 35-45 | vague_verb, too_short | none |
| 2 | `help` | 35-45 | vague_verb, too_short | none |
| 3 | `do it` | 35-45 | vague_verb, too_short | none |
| 4 | `make it work` | 35-45 | vague_verb, too_short | none |
| 5 | `improve the code` | 35-45 | vague_verb, too_short | none |
| 6 | `the error says something about null` | 40-55 | paraphrased_error | none |
| 7 | `it broke again` | 45-55 | unanchored_ref, too_short | none |
| 8 | `could you please help me fix the function?` | 45-55 | filler_words, no_file_ref | none |
| 9 | `what is X? and what about Y? and how does Z work?` | 45-55 | multi_question | none |
| 10 | `fix the error in src/auth.ts` | 60-70 | vague_verb | has_file_path |
| 11 | `refactor the function in src/utils/parse.ts to use async/await` | 65-80 | none or no_expected_output | has_file_path |
| 12 | `In src/api/handler.ts, the handler function should return 404 instead of 500 when user not found` | 80-95 | none | has_file_path, has_constraints |
| 13 | `Fix the TypeError in src/db/query.ts: \`\`\`TypeError: Cannot read property 'id' of undefined\`\`\`. Add a null check before accessing user.id on line 55.` | 85-100 | none | has_file_path, has_code_block, has_error_msg, has_constraints |
| 14 | `Add a new endpoint POST /api/users that validates email format, hashes the password with bcrypt, inserts into the users table, and returns the created user without the password field. Use the existing db connection from src/db/client.ts.` | 75-90 | none | has_file_path, has_constraints |
| 15 | `Update the React component in src/components/UserList.tsx to show a loading spinner while data is fetching. Must not break existing tests.` | 80-95 | none | has_file_path, has_constraints |
| 16 | (Exact copy of prompt #1, sent as second turn) | 20-35 | vague_verb, too_short, retry_detected | none |
| 17 | (500+ word prompt with detailed requirements) | 50-65 | overlong_prompt | varies (likely has_file_path, has_constraints) |
| 18 | `the problem is that the tests fail` | 45-55 | unanchored_ref, no_file_ref | none |
| 19 | `In src/routes/auth.ts, the login endpoint returns 200 even when password is wrong. It should return 401 with \`\`\`{ "error": "Invalid credentials" }\`\`\`. Do not change the register endpoint.` | 85-100 | none | has_file_path, has_code_block, has_constraints |
| 20 | `please could you kindly help me update the thing` | 40-50 | filler_words, too_short, no_file_ref | none |

### How to Run These Tests

**Option A: Live Claude Code session**
1. Start `claude` in any git repo.
2. Type each prompt one at a time.
3. After exiting, run `evalai sessions <id>` and compare scores against the table.

**Option B: Unit tests**
```bash
cd packages/core
pnpm test
```
Verify all scoring tests pass. The test file at `packages/core/src/__tests__/scoring.test.ts` covers these patterns programmatically.

---

## 8. Edge Cases

### 8.1 No Internet / LLM Scoring Fallback

**Setup:** Disconnect from the internet or unset `ANTHROPIC_API_KEY`.

```bash
unset ANTHROPIC_API_KEY
evalai config scoring llm
```

**Test:** Run a Claude Code session (Claude Code itself needs connectivity, so use airplane mode after session starts, or just test with no API key set).

**Expected:**
- Heuristic scoring still works and produces scores.
- LLM scoring silently fails (no error shown to user).
- `evalai sessions <id>` shows heuristic scores; LLM score column shows "--".
- Error is logged to `~/.evaluateai-v2/logs/hook-errors.log`.

### 8.2 Empty Session (0 Turns)

**Test:** Open Claude Code and immediately exit without typing any prompt.

```bash
evalai sessions
```

**Expected:**
- Session appears in list with 0 turns, $0.00 cost, "--" score.
- `evalai sessions <id>` shows session metadata but empty turn table.
- Dashboard shows session but with no turn timeline.

### 8.3 Very Long Prompt (>500 Words)

**Test:** Paste a prompt with 500+ words into Claude Code.

**Expected:**
- `overlong_prompt` anti-pattern detected (-10 points).
- Hint displayed: "Split into task description + separate context".
- Hook does not time out (timeout is 10,000ms).
- Turn is recorded normally in the database.

### 8.4 Unicode and Special Characters

**Test prompts:**
```
Fix the bug in src/i18n/translations.ts where Japanese characters like "日本語テスト" render as mojibake
```
```
Add emoji support 🎉 to the notification system in src/notify.ts
```
```
Handle the edge case where user input contains "quotes", <angle brackets>, and backticks `like this`
```

**Expected:**
- Prompts are stored correctly in SQLite (UTF-8).
- Scoring works normally (regex patterns handle Unicode gracefully).
- `evalai sessions <id>` displays the prompt text correctly.
- Dashboard renders Unicode characters correctly.

### 8.5 Multiple Concurrent Sessions

**Test:** Open two terminal windows, start `claude` in each (in different git repos).

**Expected:**
- Each session gets a unique session ID.
- `evalai sessions` lists both sessions.
- Turn data is correctly attributed to each session (no cross-contamination).
- `evalai stats` counts both sessions.

### 8.6 Corrupt or Missing Database Recovery

**Test A -- Missing DB:**
```bash
mv ~/.evaluateai-v2/db.sqlite ~/.evaluateai-v2/db.sqlite.bak
evalai stats
```

**Expected:** Either an error message telling user to run `evalai init`, or auto-recreation of the database.

**Recovery:**
```bash
evalai init
evalai stats
```

**Expected:** Fresh database initialized. Stats show 0 sessions.

**Test B -- Corrupt DB:**
```bash
echo "corrupt data" > ~/.evaluateai-v2/db.sqlite
evalai stats
```

**Expected:** Error message (not a crash/stack trace). User is guided to reinitialize.

**Recovery:**
```bash
rm ~/.evaluateai-v2/db.sqlite
evalai init
```

### 8.7 Settings File Conflicts

**Test:** Manually add a custom hook to `~/.claude/settings.json` for the same event:

```json
{
  "hooks": {
    "SessionStart": {
      "command": "my-custom-hook",
      "timeout": 5000
    }
  }
}
```

Then run `evalai init`.

**Expected:** EvaluateAI overwrites the `SessionStart` entry with its own hook. The custom hook is replaced. (This is current behavior -- document as known limitation if custom hooks need preservation.)

### 8.8 Hook Timeout

**Test:** Simulate a slow hook by temporarily replacing the evalai binary with a sleep command, then trigger a prompt in Claude Code.

**Expected:** Claude Code times out the hook after 10,000ms and continues normally. No hang, no crash.

---

## 9. Supabase Sync Testing

### 9.1 Configure Supabase

```bash
evalai init --supabase
```

**Expected prompts:**
```
  Supabase Configuration
  ──────────────────────

  Supabase URL: <enter your project URL>
  Supabase Anon Key: <enter your anon key>

  Supabase credentials saved.
```

### 9.2 Verify Credentials Stored

```bash
evalai config
```

**Expected:** `supabase_url` and `supabase_key` appear in config output (key may be partially masked).

### 9.3 Run Sync

First, ensure you have at least one session with data:
```bash
evalai stats
```

Then sync:
```bash
evalai sync
```

**Expected output:**
```
  Syncing to Supabase...
  [green] X sessions synced
  [green] Y turns synced
```

### 9.4 Verify Data in Supabase Dashboard

1. Open your Supabase project dashboard at `https://app.supabase.com`.
2. Navigate to Table Editor.
3. Check the `sessions` table: rows should match local `evalai sessions` output.
4. Check the `turns` table: rows should match local turn counts.
5. Verify timestamps, scores, and costs match.

### 9.5 Row Level Security (RLS)

**Test:** Using a different Supabase anon key (from a different project or user):

```bash
evalai init --supabase
# Enter credentials from a DIFFERENT project
evalai sync
```

**Expected:** Sync fails or succeeds only for the authenticated user's data. Data from other users is not accessible.

### 9.6 Sync Idempotency

```bash
evalai sync
evalai sync
```

**Expected:** Running sync twice does not duplicate data. Second sync either skips already-synced records or upserts correctly.

### 9.7 Invalid Credentials

```bash
evalai init --supabase
# Enter: URL = "https://invalid.supabase.co", Key = "bad-key"
evalai sync
```

**Expected:** Clear error message indicating connection failure. Local data is unaffected.

---

## 10. Regression Checklist

> Quick pass for each release. Every item should pass before shipping.

### Core Functionality

- [ ] `evalai init` installs all 6 hooks into `~/.claude/settings.json`
- [ ] `evalai init --check` shows 6 green checkmarks
- [ ] `evalai init --uninstall` removes all hooks cleanly
- [ ] `~/.evaluateai-v2/db.sqlite` is created with correct schema
- [ ] `evalai config` shows default values after fresh init

### Hook Integration

- [ ] SessionStart hook creates a session record
- [ ] UserPromptSubmit hook scores prompts and stores turns
- [ ] Feedback (`[EvaluateAI] Score: X/100`) appears for prompts scoring below threshold
- [ ] No feedback appears for prompts scoring above threshold
- [ ] PreToolUse/PostToolUse hooks log tool events
- [ ] Stop hook records response metadata
- [ ] SessionEnd hook finalizes session (end time, analysis)
- [ ] Hooks never crash or hang Claude Code (exit code always 0)

### CLI Commands

- [ ] `evalai stats` shows correct session count, turns, tokens, cost, score
- [ ] `evalai stats --week` and `--month` filter by time period
- [ ] `evalai stats --compare` shows trend arrows
- [ ] `evalai sessions` lists sessions in reverse chronological order
- [ ] `evalai sessions <id>` shows turn-by-turn detail with scores
- [ ] `evalai config` displays all config values
- [ ] `evalai config <key> <value>` updates config
- [ ] `evalai export` generates output file without errors
- [ ] `evalai sync` syncs to Supabase (when configured)

### Dashboard

- [ ] Dashboard starts on port 3456 (or configured port)
- [ ] Overview page loads with stats cards, charts, session list
- [ ] Stats cards match `evalai stats --week` output
- [ ] Session detail page shows correct turn-by-turn data
- [ ] Analytics page renders charts without errors
- [ ] Settings page loads config and save works
- [ ] Empty state shown when no data exists
- [ ] No JavaScript console errors on any page

### Scoring

- [ ] Heuristic scorer baseline is 70
- [ ] `vague_verb` detected for "fix the bug" style prompts
- [ ] `too_short` detected for prompts under 8 words
- [ ] `retry_detected` detected for duplicate/near-duplicate prompts
- [ ] `has_file_path` bonus applied for prompts with file paths
- [ ] `has_code_block` bonus applied for prompts with code blocks
- [ ] Scores clamped to 0-100 range
- [ ] LLM scorer runs when scoring mode is "llm" and API key is set
- [ ] LLM scorer falls back gracefully when unavailable

### Build and Tests

- [ ] `pnpm build` succeeds for all packages (core, cli, dashboard)
- [ ] `pnpm test` passes all unit tests across the monorepo
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors on `pnpm lint`

---

## Appendix: Key File Paths

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | Claude Code settings where hooks are installed |
| `~/.evaluateai-v2/db.sqlite` | Local SQLite database |
| `~/.evaluateai-v2/logs/hook-errors.log` | Hook error log (created on first error) |
| `packages/cli/bin/evalai.js` | CLI entry point |
| `packages/cli/src/commands/init.ts` | Init command implementation |
| `packages/cli/src/hooks/prompt-submit.ts` | Prompt scoring hook |
| `packages/core/src/scoring/heuristic.ts` | Heuristic scoring rules (10 anti-patterns, 4 positive signals) |
| `packages/core/src/__tests__/scoring.test.ts` | Scoring unit tests |
| `packages/dashboard/src/app/page.tsx` | Dashboard overview page |
| `packages/dashboard/src/app/settings/page.tsx` | Dashboard settings page |
