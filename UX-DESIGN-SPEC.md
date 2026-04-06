# EvaluateAI — UX Design Specification

> Complete UX flow, page content specs, theme system, and design tokens
> Created: 2026-04-06 | Target: Solo devs + Small teams

---

## 1. User Personas

### Persona A: Solo Developer — "Adi"
- **Role**: Full-stack developer, 3 years experience
- **Goal**: Reduce AI costs, write better prompts, ship faster
- **Pain**: Spends $150/month on Claude, no idea where it goes. Retries prompts 3-4 times.
- **Behavior**: Uses Claude Code 6-8 hours/day. Checks stats at end of day.
- **Quote**: "I just want to know if I'm using AI efficiently or wasting money."

### Persona B: Tech Lead — "Priya"
- **Role**: Engineering lead, team of 5
- **Goal**: Control team AI spend, onboard juniors faster
- **Pain**: Team spent $2,400 last month. Can't justify ROI to VP.
- **Behavior**: Checks dashboard weekly. Shares reports in standup.
- **Quote**: "I need data to show that AI tools are making us more productive, not just more expensive."

### Persona C: New Developer — "Jake"
- **Role**: Junior developer, 6 months with AI tools
- **Goal**: Learn to prompt better, avoid frustrating retry loops
- **Pain**: Gets stuck in 10+ turn sessions. Doesn't know what makes a good prompt.
- **Behavior**: Reads every suggestion. Checks turn detail page to learn.
- **Quote**: "I want to get better at this. Show me what I'm doing wrong."

---

## 2. User Journey Map

```
STAGE:    DISCOVER       INSTALL        FIRST USE       DAILY USE       MASTERY
          ─────────────────────────────────────────────────────────────────────
Actions:  Finds on npm   npm install    evalai init     Uses Claude     Shares with
          or HN post     -g evaluateai  + first prompt  normally        team, exports

Touch:    npm page /     Terminal       Claude Code     Dashboard       Team view /
          GitHub README                 + CLI           + CLI stats     Share report

Emotion:  Curious        Hopeful        Surprised       Confident       Proud
          "Can this      "Easy          "Wow, it scored "My scores      "Team costs
          help me?"      setup!"        my prompt!"     are improving!" dropped 30%"

Pain:     Skeptical      "Will it       "Why did it     "Dashboard      "No team
          about value    slow Claude?"  score me 40?"   is empty"       features yet"

Fix:      Clear value    <50ms hooks,   Intent-aware    Onboarding      Team dashboard
          prop on npm    zero overhead  scoring + tips  + seed data     (v2)
```

---

## 3. Information Architecture

```
EvaluateAI Dashboard
│
├── / (Overview)                    ← Landing page, daily driver
│   ├── Stats cards (cost, tokens, score, sessions)
│   ├── Trends (cost + score charts)
│   ├── Quick insights (top issues, model usage)
│   └── Recent sessions (click to drill down)
│
├── /sessions                       ← Browse all sessions
│   ├── Filterable table
│   ├── Search by prompt text
│   └── Sort by date/score/cost
│
├── /sessions/[id]                  ← Session deep-dive
│   ├── Turn timeline (clickable)
│   ├── Session metrics sidebar
│   └── Heuristic analysis
│
├── /sessions/[id]/turns/[n]        ← Turn deep-dive (FLAGSHIP)
│   ├── Score hero + ring
│   ├── Tabs: Prompt / AI Response / Tokens
│   ├── Improvement coaching column
│   └── Navigation (prev/next turn)
│
├── /analytics                      ← Trends + patterns
│   ├── Cost breakdown (by day, model, project)
│   ├── Score distribution
│   ├── Anti-pattern ranking
│   └── Efficiency trends
│
├── /templates (v2)                 ← Prompt template library
│   ├── Saved high-scoring prompts
│   ├── Categorized by intent
│   └── Usage stats per template
│
└── /settings                       ← Configuration
    ├── Scoring mode
    ├── Privacy mode
    ├── Suggestion threshold
    └── Supabase status
```

---

## 4. Design System — Theme Tokens

### Color Palette

```
BACKGROUNDS
  --bg-primary:     #0a0a0a    Base background (near black)
  --bg-secondary:   #111111    Slightly elevated surfaces
  --bg-card:        #141414    Cards, panels
  --bg-elevated:    #1a1a1a    Hover states, elevated cards
  --bg-input:       #0a0a0a    Input fields

BORDERS
  --border-primary:   #262626    Default borders
  --border-hover:     #404040    Hover borders
  --border-focus:     #3b82f6    Focus ring (blue)

TEXT
  --text-primary:     #ededed    Primary text
  --text-secondary:   #a3a3a3    Secondary text
  --text-muted:       #737373    Muted/disabled text
  --text-inverse:     #0a0a0a    Text on light backgrounds

BRAND / ACCENT
  --accent-primary:   #3b82f6    Primary blue (links, focus)
  --accent-hover:     #2563eb    Blue hover
  --accent-purple:    #8b5cf6    Brand purple (EvaluateAI logo)
  --accent-purple-glow: rgba(139, 92, 246, 0.15)  Purple glow effect

SEMANTIC — SCORES
  --score-excellent:  #22c55e    Score 80-100 (green)
  --score-good:       #3b82f6    Score 60-79 (blue)
  --score-warning:    #eab308    Score 40-59 (yellow)
  --score-poor:       #ef4444    Score 0-39 (red)

SEMANTIC — STATUS
  --status-success:   #22c55e    Success green
  --status-warning:   #f59e0b    Warning amber
  --status-error:     #ef4444    Error red
  --status-info:      #3b82f6    Info blue

CHART COLORS
  --chart-blue:       #3b82f6
  --chart-cyan:       #06b6d4
  --chart-purple:     #8b5cf6
  --chart-green:      #22c55e
  --chart-orange:     #f97316
  --chart-pink:       #ec4899
  --chart-yellow:     #eab308
```

### Typography

```
FONT FAMILY
  --font-sans:    'Inter', system-ui, -apple-system, sans-serif
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace

SCALE
  --text-xs:      0.75rem / 1rem       (12px, line-height 16px)
  --text-sm:      0.875rem / 1.25rem   (14px / 20px)
  --text-base:    1rem / 1.5rem        (16px / 24px)
  --text-lg:      1.125rem / 1.75rem   (18px / 28px)
  --text-xl:      1.25rem / 1.75rem    (20px / 28px)
  --text-2xl:     1.5rem / 2rem        (24px / 32px)
  --text-3xl:     1.875rem / 2.25rem   (30px / 36px)

WEIGHTS
  --font-normal:  400
  --font-medium:  500
  --font-semibold: 600
  --font-bold:    700
```

### Spacing

```
  --space-0:   0
  --space-1:   0.25rem    (4px)
  --space-2:   0.5rem     (8px)
  --space-3:   0.75rem    (12px)
  --space-4:   1rem       (16px)
  --space-5:   1.25rem    (20px)
  --space-6:   1.5rem     (24px)
  --space-8:   2rem       (32px)
  --space-10:  2.5rem     (40px)
  --space-12:  3rem       (48px)
  --space-16:  4rem       (64px)
```

### Border Radius

```
  --radius-sm:    4px      Inputs, small elements
  --radius-md:    8px      Cards, buttons
  --radius-lg:    12px     Modals, large cards
  --radius-xl:    16px     Hero sections
  --radius-full:  9999px   Badges, pills
```

### Shadows

```
  --shadow-sm:    0 1px 2px rgba(0,0,0,0.3)
  --shadow-md:    0 4px 6px rgba(0,0,0,0.3)
  --shadow-lg:    0 10px 15px rgba(0,0,0,0.3)
  --shadow-glow:  0 0 20px rgba(139, 92, 246, 0.15)   Purple brand glow
```

---

## 5. Component Library

### Card Component
```
┌─────────────────────────────────────┐
│  bg: --bg-card (#141414)            │
│  border: 1px solid --border-primary │
│  border-radius: --radius-md (8px)   │
│  padding: --space-5 (20px)          │
│  hover: border → --border-hover     │
│           bg → --bg-elevated        │
└─────────────────────────────────────┘
```

### Stat Card
```
┌─────────────────────────┐
│  LABEL     (--text-muted, --text-xs, uppercase, tracking-wider)
│  $4.20     (--text-primary, --text-2xl, --font-semibold)
│  ↓18% ✓   (--score-excellent or --score-poor, --text-sm)
└─────────────────────────┘
```

### Score Badge
```
  80-100:  bg: emerald-900/40   text: emerald-400   "Excellent"
  60-79:   bg: blue-900/40      text: blue-400      "Good"
  40-59:   bg: yellow-900/40    text: yellow-400     "Needs Work"
  0-39:    bg: red-900/40       text: red-400        "Poor"
```

### Score Ring (SVG)
```
  Size: 120x120px (hero), 80x80 (compact), 40x40 (inline)
  Track: --border-primary (#262626)
  Fill: gradient based on score color
  Text: score number centered, --font-semibold
  Label: "Excellent"/"Needs Work" below
```

### Button Variants
```
  Primary:     bg: --accent-primary  text: white       hover: --accent-hover
  Secondary:   bg: transparent       border: --border-primary  hover: --bg-elevated
  Destructive: bg: red-900/30        text: red-400     hover: red-900/50
  Ghost:       bg: transparent       text: --text-muted  hover: --bg-elevated
```

### Tab Component
```
  Active:   text: --text-primary  border-bottom: 2px --accent-primary
  Inactive: text: --text-muted    border-bottom: 2px transparent
  Hover:    text: --text-secondary
```

### Anti-Pattern Tag
```
  HIGH:     bg: red-900/30    text: red-400     border: red-800/50
  MEDIUM:   bg: yellow-900/30 text: yellow-400  border: yellow-800/50
  LOW:      bg: blue-900/30   text: blue-400    border: blue-800/50
```

### Intent Badge
```
  research:  bg: purple-900/30  text: purple-400  icon: BookOpen
  debug:     bg: red-900/30     text: red-400     icon: Bug
  feature:   bg: green-900/30   text: green-400   icon: Plus
  refactor:  bg: blue-900/30    text: blue-400    icon: RefreshCw
  review:    bg: yellow-900/30  text: yellow-400  icon: Eye
  generate:  bg: cyan-900/30    text: cyan-400    icon: Wand
  config:    bg: orange-900/30  text: orange-400  icon: Settings
```

---

## 6. Page-by-Page Content Spec

### PAGE 1: Overview (/)

**Purpose**: Daily driver — quick health check of AI usage.
**User story**: "As Adi, I want to see my AI usage at a glance so I know if I'm on track."

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (w-56, fixed)              MAIN CONTENT (ml-56, p-8)            │
│                                                                          │
│ ┌────────────────────┐   ┌──────────────────────────────────────────┐   │
│ │ [Logo] EvaluateAI  │   │ GREETING + DATE                          │   │
│ │                    │   │ Good morning, Adi · Apr 6, 2026           │   │
│ │ ● Overview         │   └──────────────────────────────────────────┘   │
│ │ ○ Sessions         │                                                  │
│ │ ○ Analytics        │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│ │ ○ Templates (v2)   │   │ COST   │ │ TOKENS │ │ SCORE  │ │ SESS.  │  │
│ │ ○ Settings         │   │ $4.20  │ │ 189K   │ │ 73/100 │ │ 14     │  │
│ │                    │   │ ↓18%   │ │ ↓12%   │ │ ↑8pts  │ │ +3     │  │
│ │ ──────────────     │   └────────┘ └────────┘ └────────┘ └────────┘  │
│ │ QUICK ACTIONS      │                                                  │
│ │ 📊 Weekly Digest   │   ┌──────────────────┐ ┌──────────────────────┐ │
│ │ 📤 Export Data     │   │ COST TREND (30d)  │ │ SCORE TREND (30d)    │ │
│ │ 🔄 Sync Now        │   │ [Area Chart]      │ │ [Line Chart]         │ │
│ │                    │   │ Blue gradient fill │ │ Green line, 70 ref  │ │
│ │ ──────────────     │   └──────────────────┘ └──────────────────────┘ │
│ │ SESSION STATUS     │                                                  │
│ │ ● 2 active now     │   ┌──────────────────┐ ┌──────────────────────┐ │
│ │                    │   │ TOP ISSUES        │ │ MODEL USAGE          │ │
│ │                    │   │ [Ranked list with  │ │ [Donut chart]        │ │
│ │                    │   │  severity dots]    │ │ Sonnet/Haiku/Opus %  │ │
│ │                    │   └──────────────────┘ └──────────────────────┘ │
│ │                    │                                                  │
│ │ v1.1.0             │   ┌──────────────────────────────────────────┐  │
│ └────────────────────┘   │ RECENT SESSIONS                          │  │
│                          │ [Table: task, turns, cost, score, time]   │  │
│                          │ Click row → /sessions/[id]               │  │
│                          └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Content Details:**

| Element | Content | Data Source |
|---------|---------|-------------|
| Greeting | "Good morning/afternoon/evening, {name}" | Time-based + config |
| Stat cards | Cost, Tokens, Avg Score, Sessions | /api/stats → thisWeek |
| Trend arrows | % change vs previous period | /api/stats → previousWeek |
| Cost chart | 30 daily data points | /api/stats → costTrend |
| Score chart | 30 daily data points + reference line at 70 | /api/stats → scoreTrend |
| Top issues | Top 5 anti-patterns ranked by frequency | /api/stats → topAntiPatterns |
| Model usage | Donut chart with % per model | /api/stats → modelUsage |
| Recent sessions | Last 10 sessions, truncated task title | /api/stats → recentSessions |

**Empty State:**
```
┌──────────────────────────────────────────────────────┐
│  [Illustration: rocket launch]                       │
│                                                      │
│  Welcome to EvaluateAI!                              │
│                                                      │
│  Start using Claude Code and your data will          │
│  appear here automatically.                          │
│                                                      │
│  ✓ Hooks installed                                   │
│  ○ First session (use Claude Code to begin)          │
│  ○ First score                                       │
│                                                      │
│  [Open Claude Code →]                                │
└──────────────────────────────────────────────────────┘
```

---

### PAGE 2: Sessions (/sessions)

**Purpose**: Browse and search all recorded sessions.
**User story**: "As Priya, I want to find specific sessions to review team patterns."

```
┌──────────────────────────────────────────────────────────────────┐
│ Sessions                                    [Search 🔍] [Filter]│
│                                                                  │
│ ┌─ FILTER BAR ────────────────────────────────────────────────┐ │
│ │ Date: [This Week ▾]  Score: [All ▾]  Model: [All ▾]        │ │
│ │ Intent: [All ▾]  Project: [All ▾]                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ SESSION TABLE ─────────────────────────────────────────────┐ │
│ │ Task               Intent   Score  Turns  Cost    Model Time│ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Fix auth midware   debug    82     3      $0.02   Son.  2h │ │
│ │ How hooks work     research 85     1      $0.11   Opus  3h │ │
│ │ Add pagination     feature  54     7      $0.09   Son.  5h │ │
│ │ Write unit tests   generate 91     2      $0.01   Son.  6h │ │
│ │ Debug memory leak  debug    38     11     $0.14   Opus  1d │ │
│ │                                                             │ │
│ │ Showing 1-20 of 47          [← Previous] [Next →]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**New elements vs current:**
- **Intent badge** on each row (color-coded: research=purple, debug=red, etc.)
- **Filter bar** with dropdowns
- **Project filter** (group by git repo)
- **Score column** color-coded

---

### PAGE 3: Session Detail (/sessions/[id])

**Purpose**: Understand a complete session — what happened, how well, what to improve.
**User story**: "As Jake, I want to see my session replay so I can learn from mistakes."

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Sessions                                                       │
│                                                                  │
│ ┌─ SESSION HEADER ───────────────────────────────────────────┐  │
│ │ Fix auth middleware                                         │  │
│ │ debug · claude-sonnet-4-6 · 3 turns · $0.021 · 4m 12s     │  │
│ │ /Users/dev/myproject · main branch                          │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ LEFT (60%) ──────────────┐ ┌─ RIGHT (40%) ─────────────────┐│
│ │                            │ │                                ││
│ │ TURN TIMELINE              │ │ SESSION SCORECARD              ││
│ │                            │ │ ┌──────────────────────────┐  ││
│ │ ┌─ Turn 1 ──────────────┐ │ │ │  Efficiency: 82/100      │  ││
│ │ │ [30] "fix the auth.." │ │ │ │  Token Waste: 12%        │  ││
│ │ │ Suggestion: ✓ Shown    │ │ │ │  Context Peak: 34%       │  ││
│ │ │ Tools: Read, Edit      │ │ │ │  Cost: $0.021            │  ││
│ │ │ View details →         │ │ │ └──────────────────────────┘  ││
│ │ └────────────────────────┘ │ │                                ││
│ │                            │ │ COST PER TURN                  ││
│ │ ┌─ Turn 2 ──────────────┐ │ │ [Horizontal bar chart]        ││
│ │ │ [71] "The fix works.."│ │ │                                ││
│ │ │ Tools: Edit            │ │ │ CONTEXT PROGRESSION            ││
│ │ │ View details →         │ │ │ [Line chart: 12%→28%→34%]    ││
│ │ └────────────────────────┘ │ │                                ││
│ │                            │ │ MODEL RECOMMENDATION           ││
│ │ ┌─ Turn 3 ──────────────┐ │ │ "Haiku for Turn 3"            ││
│ │ │ [85] "Now update..."  │ │ │ "Savings: $0.003"             ││
│ │ │ Tools: Edit, Bash      │ │ │                                ││
│ │ │ View details →         │ │ │                                ││
│ │ └────────────────────────┘ │ │                                ││
│ └────────────────────────────┘ └────────────────────────────────┘│
│                                                                  │
│ ┌─ SESSION ANALYSIS ─────────────────────────────────────────┐  │
│ │ Summary: "Mixed session. Turn 1 was vague..."              │  │
│ │ Issues Found: vague_verb (1x), no_file_ref (1x)           │  │
│ │ Top Tip: "Include file paths — saves ~1,200 tokens"        │  │
│ │ Turn Scores: [T1: 30] [T2: 71] [T3: 85]                   │  │
│ └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

### PAGE 4: Turn Detail (/sessions/[id]/turns/[n]) — FLAGSHIP PAGE

**Purpose**: THE core value page. Shows exactly what happened, why, and how to improve.
**User story**: "As Jake, I want to understand why my prompt scored 40 and how to make it better."

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Back to Session                              [← Prev Turn] [Next →]  │
│                                                                          │
│ ┌─ HERO SECTION ─────────────────────────────────────────────────────┐  │
│ │                                                                     │  │
│ │ Turn 1 of 3                              ┌─────────────────┐       │  │
│ │                                          │   SCORE RING     │       │  │
│ │ "fix the auth bug in the login flow"     │     ┌───┐        │       │  │
│ │                                          │     │ 40│        │       │  │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     └───┘        │       │  │
│ │ │🔴 debug  │ │⏱ 2.1s   │ │💰 $0.008 │  │   Needs Work     │       │  │
│ │ └──────────┘ └──────────┘ └──────────┘  └─────────────────┘       │  │
│ │ claude-opus-4-6 · 2 minutes ago                                    │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌─ LEFT COLUMN (55%) ────────────────┐ ┌─ RIGHT COLUMN (45%) ────────┐ │
│ │                                     │ │                              │ │
│ │ ┌─ TABS ──────────────────────────┐│ │ ✨ HOW TO IMPROVE            │ │
│ │ │ [Your Prompt] [AI Response] [T] ││ │                              │ │
│ │ └─────────────────────────────────┘│ │ ┌─ SCORE BREAKDOWN ────────┐│ │
│ │                                     │ │ │ Specificity  [████░░] 15││ │
│ │ TAB 1: YOUR PROMPT                  │ │ │ Context      [██░░░░]  8││ │
│ │ ┌─────────────────────────────────┐│ │ │ Clarity      [███░░░] 10││ │
│ │ │ fix the auth bug in the login   ││ │ │ Actionability[██░░░░]  7││ │
│ │ │ flow                            ││ │ └──────────────────────────┘│ │
│ │ └─────────────────────────────────┘│ │                              │ │
│ │                                     │ │ ┌─ ISSUES FOUND (3) ──────┐│ │
│ │ Anti-patterns:                      │ │ │                          ││ │
│ │ [🔴 Vague Verb] [🟡 No File Ref]  │ │ │ 🔴 Vague Verb    -15pts ││ │
│ │                                     │ │ │   "fix" without file..  ││ │
│ │                                     │ │ │                          ││ │
│ │ TAB 2: AI RESPONSE                  │ │ │ 🟡 No File Ref  -10pts ││ │
│ │ ┌─────────────────────────────────┐│ │ │   Add file path...      ││ │
│ │ │ Full AI response text            ││ │ │                          ││ │
│ │ │ with markdown rendering          ││ │ │ 🟡 No Expected  -8pts  ││ │
│ │ │                                  ││ │ │   Describe success...   ││ │
│ │ │ **Tool: Edit**                   ││ │ └──────────────────────────┘│ │
│ │ │ ```json                          ││ │                              │ │
│ │ │ { "file_path": "src/auth..." }   ││ │ ┌─ MISSING SIGNALS ───────┐│ │
│ │ │ ```                              ││ │ │ ✅ Add file path  +10pts││ │
│ │ └─────────────────────────────────┘│ │ │ ✅ Add code block +10pts││ │
│ │                                     │ │ │ ✅ Add error msg  +10pts││ │
│ │ Token Usage:                        │ │ └──────────────────────────┘│ │
│ │ [████████████████░░░░░░] 16.4K     │ │                              │ │
│ │ Input: 3 · Output: 39              │ │ ┌─ SUGGESTED REWRITE ──────┐│ │
│ │ Cache Read: 11.4K · Write: 5.0K    │ │ │ ┌──────────────────────┐ ││ │
│ │                                     │ │ │ │"Fix the auth bug in  │ ││ │
│ │ TAB 3: TOKEN BREAKDOWN              │ │ │ │ src/auth/login.ts    │ ││ │
│ │ [Horizontal bar chart]              │ │ │ │ where the session    │ ││ │
│ │ [Cost summary card]                 │ │ │ │ expires. Error:      │ ││ │
│ │                                     │ │ │ │ TokenExpiredError"   │ ││ │
│ │                                     │ │ │ └──────────────────────┘ ││ │
│ │                                     │ │ │ [📋 Copy] Est: 82/100   ││ │
│ │                                     │ │ │ Saves ~200 tokens        ││ │
│ │                                     │ │ └──gradient-border─────────┘│ │
│ │                                     │ │                              │ │
│ │                                     │ │ ┌─ PRO TIPS ──────────────┐│ │
│ │                                     │ │ │ 💡 Include file paths   ││ │
│ │                                     │ │ │ 💡 Paste exact errors   ││ │
│ │                                     │ │ │ 💡 State expected output││ │
│ │                                     │ │ └──────────────────────────┘│ │
│ └─────────────────────────────────────┘ └────────────────────────────┘ │
│                                                                          │
│                              [← Turn 0] [Turn 2 →]                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Design notes for Turn Detail:**
- Score ring: gradient stroke (red→yellow→green based on score)
- Suggested rewrite card: **gradient border** (purple→blue) to draw attention
- Issue cards: expandable with chevron, show specific fix for THIS prompt
- Missing signals: green checkmark theme (things to ADD)
- Tabs: underline style, smooth transition
- Pro tips: contextual to the detected issues, not generic

---

### PAGE 5: Analytics (/analytics)

**Purpose**: Trend analysis over time — am I getting better?
**User story**: "As Priya, I want to show the team we're improving month over month."

```
┌──────────────────────────────────────────────────────────────────┐
│ Analytics                        [Period: This Month ▾]          │
│                                                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐                               │
│ │ $45.20 │ │ 71/100 │ │ 42     │                               │
│ │ Total  │ │ Avg    │ │ Total  │                               │
│ │ Cost   │ │ Effic. │ │ Sess.  │                               │
│ └────────┘ └────────┘ └────────┘                               │
│                                                                  │
│ ┌─ ROW 1 ──────────────────────────────────────────────────────┐│
│ │ Cost by Day (BarChart)          │ Score Distribution (Hist)  ││
│ │ [30 bars, blue]                 │ [5 buckets: 0-20..80-100]  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ ROW 2 ──────────────────────────────────────────────────────┐│
│ │ Model Usage (PieChart)          │ Anti-Pattern Rank (HBar)   ││
│ │ [Sonnet 55%, Haiku 30%,        │ [vague_verb ████ 8x]       ││
│ │  Opus 15%]                      │ [no_file_ref ██ 5x]        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ ROW 3 ──────────────────────────────────────────────────────┐│
│ │ Efficiency Trend (LineChart)    │ Intent Distribution (Donut)││
│ │ [Green line trending up]        │ [research 30%, debug 25%,  ││
│ │                                 │  feature 20%, ...]          ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**New vs current:**
- **Period selector** dropdown (today/week/month/quarter)
- **Intent distribution** chart (new — shows what types of prompts you write)
- **Efficiency trend** (not just score, but the composite efficiency metric)

---

### PAGE 6: Settings (/settings)

**Purpose**: Configure behavior.

```
┌──────────────────────────────────────────────────────────────────┐
│ Settings                                              [Save]     │
│                                                                  │
│ ┌─ SCORING ──────────────────────────────────────────────────┐  │
│ │ 🧠 Scoring Mode                                            │  │
│ │ ○ Heuristic — Fast, free, pattern-based (recommended)      │  │
│ │ ○ LLM — Uses Claude Haiku (~$0.001/turn, more accurate)   │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ SUGGESTIONS ──────────────────────────────────────────────┐  │
│ │ 🎚 Suggestion Threshold                          [50]      │  │
│ │ [──────────●──────────────] Show tips below this score     │  │
│ │ 0 (never)        50           100 (always)                 │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ PRIVACY ──────────────────────────────────────────────────┐  │
│ │ 🛡 Privacy Mode                                            │  │
│ │ ● Local — Full prompts in local SQLite (default)           │  │
│ │ ○ Hash — Only SHA256 hashes (max privacy)                  │  │
│ │ ○ Off — Only scores and metadata                           │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ CLOUD SYNC ───────────────────────────────────────────────┐  │
│ │ ☁ Supabase                                                 │  │
│ │ Configure via environment variables:                        │  │
│ │ ┌────────────────────────────────────────┐                 │  │
│ │ │ SUPABASE_URL=https://...supabase.co    │                 │  │
│ │ │ SUPABASE_ANON_KEY=eyJhbG...            │                 │  │
│ │ └────────────────────────────────────────┘                 │  │
│ │ Run: evalai sync                                           │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ HOOKS ────────────────────────────────────────────────────┐  │
│ │ ✓ SessionStart  ✓ UserPromptSubmit  ✓ PreToolUse          │  │
│ │ ✓ PostToolUse   ✓ Stop              ✓ SessionEnd          │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ DATA ─────────────────────────────────────────────────────┐  │
│ │ [📤 Export CSV]  [📤 Export JSON]  [🗑 Reset Data]         │  │
│ └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. UX Flow Diagrams

### Flow A: First-Time User

```
npm install -g evaluateai
        │
        ▼
   evalai init
        │
        ├── Creates ~/.evaluateai-v2/
        ├── Installs 6 hooks
        └── Shows "Setup complete!"
        │
        ▼
   Opens Claude Code
        │
        ▼
   Types first prompt
        │
        ├── Score ≥ 50 → Silent (no interruption)
        └── Score < 50 → Shows tip in CLI
        │
        ▼
   Finishes session
        │
        ▼
   evalai stats → Sees first data
        │
        ▼
   evalai dashboard → Opens web UI
        │
        ▼
   Clicks session → Sees turn detail
        │
        ▼
   Sees "How to Improve" → 💡 Learns
        │
        ▼
   Next session → Better prompts → Higher scores
```

### Flow B: Daily User

```
Opens Claude Code (hooks auto-fire)
        │
        ▼
   Works normally (2-3 sessions)
        │
        ▼
   End of day: evalai stats --compare
        │
        ├── Score up → Motivated
        └── Score down → Checks /analytics for patterns
        │
        ▼
   Checks dashboard weekly
        │
        ├── Reviews worst session → Learns from Turn Detail
        └── Reviews best session → Saves prompt as template (v2)
```

### Flow C: Team Lead

```
Team member installs EvaluateAI
        │
        ▼
   Configures Supabase sync
        │
        ▼
   Data syncs to cloud
        │
        ▼
   Team lead opens /team (v2)
        │
        ├── Sees all members' stats
        ├── Identifies who needs help
        └── Shares weekly digest in standup
```

---

## 8. Interaction Patterns

### Micro-interactions

| Element | Interaction | Animation |
|---------|------------|-----------|
| Score ring | Loads | Stroke draws from 0 to score value (0.8s ease-out) |
| Stat cards | Data arrives | Count up from 0 to value (0.5s) |
| Turn cards | Hover | Border color transitions to --border-hover (0.15s) |
| Turn cards | Click | Scale 0.98 → navigate (0.1s) |
| Tabs | Switch | Underline slides to active tab (0.2s ease) |
| Issue cards | Expand | Height animates open (0.2s), chevron rotates |
| Copy button | Click | Icon changes to checkmark (0.15s), reverts after 2s |
| Toast | Appears | Slides in from right (0.3s), fades out after 3s |
| Charts | Load | Bars/lines animate in from left (0.5s staggered) |
| Score badge | Appears | Scale from 0 → 1 with slight bounce (0.3s) |

### Loading States

| Page | Loading Pattern |
|------|----------------|
| Overview | Skeleton cards (pulsing gray rectangles) |
| Sessions | Skeleton table rows (5 rows) |
| Session Detail | Skeleton turns + skeleton sidebar |
| Turn Detail | Skeleton hero + skeleton tabs |
| Analytics | Skeleton chart placeholders |

### Error States

| Error | Message | Action |
|-------|---------|--------|
| No data | "No sessions yet. Use Claude Code to start." | Link to setup guide |
| API error | "Failed to load data" | Retry button |
| No transcript | "Response will appear after completion" | Auto-refresh |
| Supabase offline | "Cloud sync unavailable" | Check env vars |

---

## 9. Responsive Breakpoints

```
DESKTOP (≥1280px):  Two-column layout, sidebar visible
LAPTOP  (≥1024px):  Two-column layout, sidebar collapsible
TABLET  (≥768px):   Single column, sidebar as drawer
MOBILE  (≥320px):   Single column, bottom nav

Turn Detail:
  Desktop: 55/45 split columns
  Tablet:  Stacked (content → improvement)
  Mobile:  Stacked, tabs become scrollable
```

---

## 10. Accessibility Checklist

- [x] Color contrast: all text ≥ 4.5:1 against backgrounds
- [x] Focus indicators: visible focus ring on all interactive elements
- [x] Keyboard navigation: all pages navigable via Tab/Enter
- [x] Screen reader: semantic HTML, aria-labels on icons
- [x] Reduced motion: respect `prefers-reduced-motion` for animations
- [x] Score colors: never rely on color alone (always include number)
- [x] Chart labels: all charts have text alternatives

---

*EvaluateAI UX Design Spec v1.0 — April 6, 2026*
