'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
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

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#141414] border border-[#262626] ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px]" />
        <Skeleton className="h-[340px]" />
      </div>
      {/* Panels skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      {/* Sessions skeleton */}
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-[#737373]" />
      <h2 className="mb-2 text-xl font-semibold text-[#ededed]">No data yet</h2>
      <p className="max-w-md text-[#737373]">
        Start a coding session with Claude to see your usage stats, prompt scores, and cost
        breakdowns appear here.
      </p>
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
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#262626] px-6 py-4">
        <h1 className="text-lg font-semibold text-[#ededed]">EvaluateAI</h1>
        <p className="text-sm text-[#737373]">Overview</p>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading && <LoadingSkeleton />}

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
            Failed to load dashboard data: {error}
          </div>
        )}

        {!loading && !error && isEmpty && <EmptyState />}

        {!loading && !error && data && !isEmpty && (
          <div className="space-y-6">
            <StatsCards today={thisWeekStats} previous={prevWeekStats} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CostChart data={data.costTrend} />
              <ScoreTrend data={data.scoreTrend} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AntiPatternList patterns={data.topAntiPatterns} />
              <ModelDonut data={data.modelUsage} />
            </div>

            <SessionList sessions={data.recentSessions} />
          </div>
        )}
      </main>
    </div>
  );
}
