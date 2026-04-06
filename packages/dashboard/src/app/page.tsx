'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Sparkles, ArrowRight, CheckCircle2, Terminal, Database, Zap } from 'lucide-react';
import { StatsCards, type StatsData } from '@/components/stats-cards';
import { CostChart } from '@/components/cost-chart';
import { ScoreTrend } from '@/components/score-trend';
import { AntiPatternList } from '@/components/anti-pattern-list';
import { ModelDonut } from '@/components/model-donut';
import { SessionList, type SessionItem } from '@/components/session-list';

interface ApiResponse {
  thisWeek: {
    sessions: number;
    turns: number;
    tokens: number;
    cost: number;
    avgScore: number | null;
    efficiency: number | null;
  };
  previousWeek: {
    sessions: number;
    turns: number;
    tokens: number;
    cost: number;
    avgScore: number | null;
    efficiency: number | null;
  };
  costTrend: { date: string; cost: number }[];
  scoreTrend: { date: string; score: number }[];
  topAntiPatterns: { pattern: string; count: number }[];
  modelUsage: { model: string; count: number; cost: number }[];
  recentSessions: SessionItem[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`shimmer rounded-xl ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[360px]" />
        <Skeleton className="h-[360px]" />
      </div>
      {/* Panels skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
      {/* Sessions skeleton */}
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="animate-section flex flex-col items-center justify-center py-20 text-center">
      {/* Decorative icon */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] border border-[var(--border-primary)]">
          <Sparkles className="h-8 w-8 text-[#8b5cf6]" />
        </div>
        <div className="absolute -inset-1 -z-10 rounded-2xl bg-[#8b5cf6]/10 blur-xl" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
        Ready to evaluate your AI usage
      </h2>
      <p className="mb-8 max-w-md text-sm text-[var(--text-muted)] leading-relaxed">
        Start a coding session with Claude to see your usage stats, prompt scores,
        and cost breakdowns appear here.
      </p>

      {/* Onboarding checklist */}
      <div className="w-full max-w-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Getting started
        </h3>
        {[
          { icon: Terminal, label: 'Install EvaluateAI CLI', hint: 'npm i -g evaluateai' },
          { icon: Database, label: 'Initialize your project', hint: 'evalai init' },
          { icon: Zap, label: 'Use Claude as usual', hint: 'Sessions are tracked automatically' },
        ].map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-white/[0.02] px-4 py-3 text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#8b5cf6]/10 text-[#8b5cf6]">
              <step.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">{step.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{step.hint}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const isEmpty =
    data &&
    data.thisWeek.sessions === 0 &&
    data.costTrend.length === 0 &&
    data.recentSessions.length === 0;

  const thisWeekStats: StatsData = data
    ? {
        cost: data.thisWeek.cost,
        tokens: data.thisWeek.tokens,
        avgScore: data.thisWeek.avgScore ?? 0,
        sessions: data.thisWeek.sessions,
      }
    : { cost: 0, tokens: 0, avgScore: 0, sessions: 0 };

  const prevWeekStats: StatsData = data
    ? {
        cost: data.previousWeek.cost,
        tokens: data.previousWeek.tokens,
        avgScore: data.previousWeek.avgScore ?? 0,
        sessions: data.previousWeek.sessions,
      }
    : { cost: 0, tokens: 0, avgScore: 0, sessions: 0 };

  return (
    <div className="min-h-screen">
      {/* Greeting header */}
      <header className="mb-8 animate-section">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{formatToday()}</p>
      </header>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="animate-section rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
          <span className="font-medium">Failed to load dashboard data:</span> {error}
        </div>
      )}

      {!loading && !error && isEmpty && <EmptyState />}

      {!loading && !error && data && !isEmpty && (
        <>
          {/* Stats Cards */}
          <div className="animate-section mb-6">
            <StatsCards today={thisWeekStats} previous={prevWeekStats} />
          </div>

          {/* Charts */}
          <div className="animate-section mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CostChart data={data.costTrend} />
            <ScoreTrend data={data.scoreTrend} />
          </div>

          {/* Insights */}
          <div className="animate-section mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AntiPatternList patterns={data.topAntiPatterns} />
            <ModelDonut data={data.modelUsage} />
          </div>

          {/* Recent Sessions */}
          <div className="animate-section">
            <SessionList sessions={data.recentSessions} />
          </div>
        </>
      )}
    </div>
  );
}
