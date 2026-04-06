# EvaluateAI Pivot — Developer Productivity Intelligence Platform

> From "prompt scorer" to "meeting-to-code verification engine"

---

## 1. Critical Market Psychology Analysis

### The #1 Risk: Developer Resistance

**The Problem**: Any tool that "monitors" developers triggers immediate psychological resistance:
- **Reactance Theory**: People resist perceived threats to freedom. "Tracking my commits" feels like surveillance.
- **Fundamental Attribution Error**: Managers use these tools to attribute low output to laziness (character) rather than blockers (circumstances).
- **History**: Tools like Hubstaff, Time Doctor, and Prodoscore have terrible developer reputation. r/cscareerquestions actively warns against companies using them.

### How to Position: Empowerment, Not Monitoring

**Reframe using Jobs to Be Done**:

| BAD Positioning (surveillance) | GOOD Positioning (empowerment) |
|-------------------------------|-------------------------------|
| "Track if developers did their work" | "Help developers prove their impact" |
| "Verify developer claims" | "Auto-generate standup reports from code" |
| "Detect mismatches" | "Catch dropped tasks before they become problems" |
| "Manager dashboard to monitor" | "Team alignment tool everyone benefits from" |

**Key Psychological Principle — Unity**: Position the tool as something the TEAM uses together, not something managers impose ON developers.

### The Winning Angle

**"DevSync"** — Not "Did the developer work?" but "Is the team aligned?"

The problem isn't lazy developers. The problem is:
1. Meeting action items get lost → tasks fall through cracks
2. Developers work on the wrong things → misalignment with priorities
3. No one remembers what was decided → repeated discussions
4. Standup reports are manual drudgery → waste of developer time

**Your tool solves alignment, not accountability.**

---

## 2. Dual-Persona Strategy

### Persona A: Engineering Manager — "Priya" (Buyer)
- **Pain**: "We had 3 meetings about the auth refactor. I still don't know what got shipped."
- **Job to be Done**: Know what's happening without micromanaging.
- **Trigger to Buy**: Missed deadline where tasks fell through cracks.
- **Psychological hooks**: Loss Aversion ("Don't let tasks slip"), Authority Bias (show data, not opinions)

### Persona B: Developer — "Adi" (User)
- **Pain**: "I spend 15 minutes every morning writing standup updates that no one reads."
- **Job to be Done**: Prove my work without manual reporting.
- **Trigger to Use**: First auto-generated standup saves them 15 minutes.
- **Psychological hooks**: IKEA Effect (they see THEIR work summarized), Endowment Effect (once they have auto-reports, they won't go back)

### Critical Insight: Developer Must Love It

**If developers hate it, it dies.** Managers buy, but developers USE. A tool developers resist will:
1. Get garbage data (developers game it)
2. Create resentment (culture damage)
3. Get removed after 3 months (churn)

**The developer value prop must be STRONG:**
- "Never write a standup update again"
- "Your work is auto-documented — perfect for performance reviews"
- "See your own impact metrics — useful for promotions"

---

## 3. Product Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES (Integrations)                        │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ Fireflies  │  │ GitHub     │  │ Jira/Linear│  │ Slack      │    │
│  │ /Otter.ai  │  │ PRs+Commits│  │ Tickets    │  │ Messages   │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │
│        │               │               │               │            │
└────────┼───────────────┼───────────────┼───────────────┼────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Webhook Receivers + Polling Jobs + OAuth Connections       │    │
│  │  Normalize all data into: Events, Tasks, Code Changes      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE ENGINE                                │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Task Extractor   │  │ Code Analyzer    │  │ Alignment Engine │  │
│  │                  │  │                  │  │                  │  │
│  │ Meeting notes →  │  │ Commits/PRs →    │  │ Tasks ↔ Code →   │  │
│  │ Action items     │  │ What changed,    │  │ Match score,     │  │
│  │ with assignees   │  │ complexity,      │  │ gaps, extras     │  │
│  │                  │  │ summary          │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Daily Cron (12 AM):                                         │   │
│  │  1. Fetch all commits since last run                         │   │
│  │  2. Match commits → tasks (semantic similarity)              │   │
│  │  3. Compare: meeting items vs code changes vs daily reports  │   │
│  │  4. Generate alignment report                                │   │
│  │  5. Send summary to Slack/email                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                                 │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Developer View   │  │ Manager View     │  │ Team View        │  │
│  │                  │  │                  │  │                  │  │
│  │ - Auto standup   │  │ - Alignment dash │  │ - Sprint health  │  │
│  │ - My impact      │  │ - Task tracking  │  │ - Blockers       │  │
│  │ - Work timeline  │  │ - Gap detection  │  │ - Velocity       │  │
│  │ - PR summaries   │  │ - Team overview  │  │ - Trends         │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Breakdown by Phase

### Phase 1: MVP — "Auto-Standup" (4 weeks)
*Developer value first. Get developers to love it before adding manager features.*

**What ships:**
1. **GitHub Integration** (OAuth)
   - Connect repos
   - Track commits, PRs, reviews
   - Summarize code changes with AI

2. **Auto-Generated Daily Report**
   - Cron at 11 PM: analyze today's commits
   - Generate: "What I did today" summary
   - Deliver via: Slack DM, email, or dashboard
   - Developer can edit/approve before it goes to team

3. **Developer Dashboard**
   - My commits today/this week
   - Auto-generated work summary
   - Impact metrics (lines changed, PRs merged, reviews done)
   - Personal productivity trends

**Why this first?**
- **Endowment Effect**: Once developers have auto-standups, they won't give them up
- **Reciprocity**: You gave them value (saved time) before asking anything
- **Foot-in-the-Door**: Small commitment (connect GitHub) leads to bigger adoption

### Phase 2: Meeting Intelligence (Weeks 5-8)
*Now layer in the meeting → code connection.*

1. **Fireflies/Otter.ai Integration**
   - Connect meeting bot
   - Auto-extract action items from transcripts
   - Tag action items with assignees

2. **Task Extraction Pipeline**
   - AI parses meeting notes → structured tasks
   - Each task: description, assignee, deadline (if mentioned), priority
   - Tasks stored in database, visible in dashboard

3. **Meeting → Code Alignment**
   - Daily job: match action items to commits (semantic similarity)
   - Status: ✅ Done, 🔄 In Progress, ⚠️ No code yet, ❓ Unrelated work
   - Show on dashboard: "From Tuesday's meeting, 3/5 items have code"

### Phase 3: Verification & Manager View (Weeks 9-12)
*Now add the alignment scoring — but framed as team health, not surveillance.*

1. **Daily Report Verification**
   - Compare developer's self-reported work vs actual commits
   - Not "catching liars" — framed as "automated accuracy check"
   - Highlight: tasks claimed but no commit, commits not mentioned in report

2. **Manager Dashboard**
   - Team alignment score: planned vs actual (%)
   - Sprint health: on-track, at-risk, blocked
   - Per-developer: tasks completed, avg alignment, trends
   - Dropped tasks: assigned in meetings but no progress

3. **Alerts & Notifications**
   - "3 tasks from Monday's meeting have no code after 3 days"
   - "Sprint goal at 40% with 2 days left"
   - Sent to team channel, not individual shame

### Phase 4: Intelligence & Insights (Weeks 13-16)

1. **AI Analysis Reports**
   - Weekly team digest: what shipped, what slipped, why
   - Complexity scoring: "This PR touched 47 files — high risk"
   - Pattern detection: "Auth module has 3x more rework than other areas"

2. **Jira/Linear Integration**
   - Two-way sync: meeting tasks → ticket creation
   - Auto-link PRs to tickets
   - Close tickets when PR merges

3. **Prompt/AI Usage Integration**
   - Connect EvaluateAI data (your existing product!)
   - Show: "Developer used AI for 60% of this PR's code"
   - Track: AI-assisted vs manual work ratio

---

## 5. Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 + Tailwind + Recharts | Reuse from EvaluateAI |
| **Backend API** | Node.js + Hono/Fastify | Fast, TypeScript |
| **Database** | Supabase (PostgreSQL) | Already set up, RLS, realtime |
| **Job Queue** | Supabase Edge Functions or BullMQ | Cron jobs, webhooks |
| **AI Analysis** | Claude Haiku API | Cheap ($0.001/analysis), fast |
| **Auth** | Supabase Auth + GitHub OAuth | Team-based access |
| **Integrations** | GitHub REST API, Fireflies API, Slack API | Webhooks + polling |
| **Deployment** | Vercel (frontend) + Railway/Fly (API) | Easy, scalable |

### What You Can Reuse from EvaluateAI

| Component | Reusable? | How |
|-----------|-----------|-----|
| Dashboard UI (Next.js + Tailwind) | **Yes** | Redesign pages, keep theme system |
| Supabase setup + schema | **Yes** | Add new tables, keep infrastructure |
| Scoring engine concept | **Partially** | Adapt for "alignment scoring" |
| CLI hooks pattern | **No** | Replace with GitHub webhooks |
| Heuristic scorer | **No** | Replace with semantic matching |
| npm package | **No** | New SaaS product, not CLI tool |

---

## 6. Data Schema (Supabase)

```sql
-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'developer', -- 'owner', 'manager', 'developer'
  github_username TEXT,
  email TEXT,
  UNIQUE(team_id, user_id)
);

-- Connected Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  type TEXT NOT NULL, -- 'github', 'fireflies', 'slack', 'jira'
  config JSONB NOT NULL, -- oauth tokens, webhook urls, etc.
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings (from Fireflies/Otter)
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  external_id TEXT, -- Fireflies meeting ID
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  participants TEXT[], -- email addresses
  transcript TEXT,
  summary TEXT, -- AI-generated summary
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action Items (extracted from meetings)
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id),
  team_id UUID REFERENCES teams(id),
  assignee_id UUID REFERENCES team_members(id),
  description TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'done', 'dropped'
  matched_commits TEXT[], -- commit SHAs that match this task
  alignment_score REAL, -- 0-100, how well commits match
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code Changes (from GitHub)
CREATE TABLE code_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  developer_id UUID REFERENCES team_members(id),
  type TEXT NOT NULL, -- 'commit', 'pr', 'review'
  external_id TEXT, -- commit SHA or PR number
  repo TEXT NOT NULL,
  title TEXT,
  description TEXT,
  files_changed INTEGER,
  additions INTEGER,
  deletions INTEGER,
  ai_summary TEXT, -- AI-generated summary of changes
  created_at TIMESTAMPTZ NOT NULL
);

-- Daily Reports (auto-generated or manual)
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  developer_id UUID REFERENCES team_members(id),
  date DATE NOT NULL,
  auto_summary TEXT, -- AI-generated from commits
  manual_summary TEXT, -- Developer's self-report
  alignment_score REAL, -- auto vs manual match
  commits_count INTEGER,
  prs_merged INTEGER,
  reviews_done INTEGER,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'verified'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(developer_id, date)
);

-- Alignment Reports (daily cron output)
CREATE TABLE alignment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  date DATE NOT NULL,
  overall_score REAL, -- 0-100 team alignment
  tasks_total INTEGER,
  tasks_completed INTEGER,
  tasks_in_progress INTEGER,
  tasks_dropped INTEGER,
  unplanned_work INTEGER, -- commits not matching any task
  analysis JSONB, -- AI analysis details
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Business Model

### Pricing Strategy (Anchoring + Good-Better-Best)

| Tier | Price | Target | Key Feature |
|------|-------|--------|-------------|
| **Free** | $0 | Solo devs | Auto-standup for 1 repo, personal dashboard |
| **Team** | $12/user/mo | Small teams (5-20) | Meeting integration, alignment dashboard, 10 repos |
| **Business** | $25/user/mo | Eng teams (20-100) | Jira integration, custom reports, API access |
| **Enterprise** | Custom | Large orgs | SSO, audit logs, on-prem, dedicated support |

**Psychological pricing:**
- **Anchoring**: Show Enterprise first on pricing page
- **Decoy Effect**: Business tier makes Team look like great value
- **Mental Accounting**: "$12/user/mo = less than a coffee/day"
- **Loss Aversion**: "Teams using DevSync ship 23% faster. How much is a missed sprint costing you?"

### Revenue Projections

```
Month 1-3:  Free tier only, build user base
Month 4-6:  Launch Team tier, target 20 teams × 8 users = $1,920/mo
Month 7-12: 50 teams × 10 users = $6,000/mo
Year 2:     200 teams + 5 enterprise = $50K+ MRR
```

---

## 8. Competitive Landscape

| Competitor | What They Do | Our Advantage |
|-----------|-------------|---------------|
| **LinearB** | Git analytics + cycle time | We add meeting → code connection |
| **Pluralsight Flow** | Engineering metrics | Too expensive, no meeting integration |
| **Jellyfish** | Engineering management platform | Enterprise-only, $100K+ contracts |
| **Swarmia** | Developer productivity | No meeting intelligence |
| **Sleekplan/Geekbot** | Standup bots | No code verification, just text collection |

**Our unique angle**: No one connects **meetings → tasks → code → verification** in one tool.

---

## 9. Go-to-Market Strategy

### Launch Sequence (using marketing psychology)

**Week 1-2: Build in Public (Mere Exposure + Social Proof)**
- Tweet daily build progress
- Share architecture decisions on dev Twitter/LinkedIn
- "Building the tool I wish existed" narrative

**Week 3-4: Beta Launch (Scarcity + Reciprocity)**
- "50 spots for beta testers"
- Free for life for beta users (reciprocity → they'll give feedback + referrals)
- Product Hunt upcoming page

**Month 2: Product Hunt Launch (Bandwagon + Authority)**
- Time for Tuesday 12:01 AM PT
- Get 5+ "maker friends" to upvote + comment
- Press from beta users' testimonials

**Month 3+: Content Flywheel (Compounding)**
- "Meeting Effectiveness Report" (original research)
- "How Top Teams Ship: Meeting → Code Pipeline"
- SEO: "developer productivity tools", "meeting action items tracking"

---

## 10. Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Developers resist "monitoring" | **CRITICAL** | Developer-first value (auto-standup). They opt-in. Never position as surveillance. |
| Meeting AI accuracy is low | HIGH | Let developers edit/correct extracted tasks. Learn from corrections. |
| GitHub API rate limits | MEDIUM | Webhook-based (real-time) instead of polling. Cache aggressively. |
| Fireflies integration breaks | MEDIUM | Support multiple providers (Otter, Fathom, tl;dv). Abstract the integration. |
| Low alignment accuracy | HIGH | Start with simple keyword matching, improve with ML. Show confidence scores. |
| Privacy/compliance concerns | HIGH | All data encrypted. SOC2 roadmap. Data retention controls. GDPR delete. |
| Scope creep | MEDIUM | Phase 1 is ONLY auto-standup + GitHub. Ship that first, validate, then expand. |

---

## 11. MVP Implementation Plan (4 Weeks)

```
Week 1: Foundation
├── Day 1:  Supabase schema + auth setup
├── Day 2:  GitHub OAuth integration
├── Day 3:  GitHub webhook receiver (commits, PRs)
├── Day 4:  Code change ingestion pipeline
├── Day 5:  AI commit summarizer (Haiku)
└── MILESTONE: GitHub connected, commits flowing into DB

Week 2: Auto-Standup Engine
├── Day 6:  Daily cron job (Supabase Edge Function)
├── Day 7:  AI report generator (summarize day's commits)
├── Day 8:  Developer dashboard — today's work view
├── Day 9:  Edit/approve report flow
├── Day 10: Slack/email delivery
└── MILESTONE: Auto-standup working end-to-end

Week 3: Dashboard
├── Day 11: Overview page (team activity feed)
├── Day 12: Developer profile page (my work, my trends)
├── Day 13: Team view (all developers' summaries)
├── Day 14: Settings (integrations, notifications)
├── Day 15: Polish + empty states + onboarding
└── MILESTONE: Web dashboard functional

Week 4: Polish + Launch
├── Day 16: Invite system (team invites via email)
├── Day 17: Notification preferences
├── Day 18: Landing page
├── Day 19: Documentation + README
├── Day 20: Beta launch
└── MILESTONE: Beta live, first 10 teams onboarded
```

---

## 12. Connection to EvaluateAI

This isn't abandoning EvaluateAI — it's **expanding** it:

```
EvaluateAI (current):     AI prompt intelligence → personal tool
DevSync (pivot):           Developer productivity intelligence → team tool

SHARED:
├── Supabase infrastructure
├── Dashboard theme/UI system
├── Scoring engine concept
├── npm/GitHub presence
└── Brand recognition

NEW:
├── GitHub integration
├── Meeting integration
├── Team features
├── Alignment engine
└── SaaS model (not CLI)
```

**Recommendation**: Keep EvaluateAI as a feature WITHIN DevSync:
- "See which tasks your team used AI for"
- "Track AI usage per developer per sprint"
- This becomes a unique differentiator no competitor has

---

*EvaluateAI Pivot Plan v1.0 — April 6, 2026*
