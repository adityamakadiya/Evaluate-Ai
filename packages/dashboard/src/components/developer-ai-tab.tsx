'use client';

import Link from 'next/link';
import {
  Bot,
  DollarSign,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface Session {
  id: string;
  model: string | null;
  cost: number | null;
  score: number | null;
  turns: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  startedAt: string;
}

interface ModelUsage {
  model: string;
  count: number;
  cost: number;
}

interface AntiPattern {
  pattern: string;
  count: number;
}

interface DeveloperAiTabProps {
  sessions: Session[];
  modelUsage: ModelUsage[];
  antiPatterns: AntiPattern[];
  stats: {
    totalAiCost: number;
    avgPromptScore: number | null;
    sessionsThisWeek: number;
  };
}

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#f97316', '#ec4899'];

const chartTooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-primary)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBadge(score: number): string {
  if (score >= 80) return 'bg-emerald-900/30 text-emerald-400';
  if (score >= 60) return 'bg-blue-900/30 text-blue-400';
  if (score >= 40) return 'bg-yellow-900/30 text-yellow-400';
  return 'bg-red-900/30 text-red-400';
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function DeveloperAiTab({ sessions, modelUsage, antiPatterns, stats }: DeveloperAiTabProps) {
  const donutData = modelUsage.map(m => ({
    name: m.model,
    value: m.count,
    cost: m.cost,
  }));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total AI Cost</span>
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            ${stats.totalAiCost.toFixed(2)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">This week</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-[#8b5cf6]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Avg Score</span>
          </div>
          <p className={`text-2xl font-bold ${stats.avgPromptScore != null ? getScoreColor(stats.avgPromptScore) : 'text-[var(--text-muted)]'}`}>
            {stats.avgPromptScore != null ? stats.avgPromptScore : '--'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Prompt quality</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.sessionsThisWeek}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">This week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model donut */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Model Breakdown
          </h3>
          {donutData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">No model data</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-[var(--text-secondary)]">{d.name}</span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">${d.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Anti-patterns */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Anti-Patterns
            </h3>
          </div>
          {antiPatterns.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">No anti-patterns detected</p>
          ) : (
            <div className="space-y-2">
              {antiPatterns.map(ap => (
                <div key={ap.pattern} className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs text-[var(--text-secondary)] font-mono">{ap.pattern.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-semibold bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded-full">
                    {ap.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Sessions This Week
        </h3>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No AI sessions this week</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sessions.map(s => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <Bot className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--text-primary)] truncate">
                        Session {s.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.model && <span className="text-[10px] text-[var(--text-muted)]">{s.model}</span>}
                        {s.turns != null && <span className="text-[10px] text-[var(--text-muted)]">{s.turns} turns</span>}
                        {(s.inputTokens != null || s.outputTokens != null) && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {formatTokens((s.inputTokens ?? 0) + (s.outputTokens ?? 0))} tokens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.score != null && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getScoreBadge(s.score)}`}>
                        {s.score}
                      </span>
                    )}
                    {s.cost != null && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">${s.cost.toFixed(3)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
