'use client';

import { DollarSign, Zap, Target, Activity, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatsData {
  cost: number;
  tokens: number;
  avgScore: number;
  sessions: number;
}

interface StatsCardsProps {
  today: StatsData;
  previous: StatsData;
}

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function pointChange(current: number, previous: number): number {
  return current - previous;
}

interface CardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean } | null;
}

function Card({ label, value, icon, trend }: CardProps) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#737373]">{label}</span>
        <span className="text-[#737373]">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#ededed]">{value}</div>
      {trend && (
        <div className="mt-1 flex items-center gap-1 text-sm">
          {trend.positive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className={trend.positive ? 'text-emerald-400' : 'text-red-400'}>
            {trend.value}
          </span>
          <span className="text-[#737373]">vs last week</span>
        </div>
      )}
    </div>
  );
}

export function StatsCards({ today, previous }: StatsCardsProps) {
  const costPct = pctChange(today.cost, previous.cost);
  const tokenPct = pctChange(today.tokens, previous.tokens);
  const scoreDelta = pointChange(today.avgScore, previous.avgScore);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Cost (this week)"
        value={formatCost(today.cost)}
        icon={<DollarSign className="h-4 w-4" />}
        trend={
          costPct !== null
            ? {
                value: `${Math.abs(costPct).toFixed(1)}%`,
                positive: costPct <= 0, // lower cost is good
              }
            : null
        }
      />
      <Card
        label="Tokens (this week)"
        value={formatTokens(today.tokens)}
        icon={<Zap className="h-4 w-4" />}
        trend={
          tokenPct !== null
            ? {
                value: `${Math.abs(tokenPct).toFixed(1)}%`,
                positive: tokenPct <= 0, // fewer tokens is good
              }
            : null
        }
      />
      <Card
        label="Avg Score (this week)"
        value={`${Math.round(today.avgScore)}/100`}
        icon={<Target className="h-4 w-4" />}
        trend={
          previous.avgScore > 0
            ? {
                value: `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)} pts`,
                positive: scoreDelta >= 0, // higher score is good
              }
            : null
        }
      />
      <Card
        label="Sessions (this week)"
        value={String(today.sessions)}
        icon={<Activity className="h-4 w-4" />}
      />
    </div>
  );
}
