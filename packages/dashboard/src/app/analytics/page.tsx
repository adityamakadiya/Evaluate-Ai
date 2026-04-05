'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Loader2,
  DollarSign,
  Gauge,
  Hash,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

// --------------- Types ---------------

interface StatsResponse {
  summary: {
    totalCostThisMonth: number;
    avgEfficiency: number;
    totalSessions: number;
  };
  costByDay: Array<{ date: string; cost: number }>;
  scoreDistribution: Array<{ bucket: string; count: number }>;
  modelUsage: Array<{ model: string; count: number }>;
  antiPatternRanking: Array<{ pattern: string; count: number }>;
  efficiencyTrend: Array<{ date: string; score: number }>;
  tokenWasteBreakdown: Array<{ date: string; useful: number; wasted: number }>;
}

// --------------- Constants ---------------

const PIE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#f97316',
  '#6366f1',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#141414',
  border: '1px solid #262626',
  borderRadius: 8,
  color: '#ededed',
  fontSize: 12,
};

// --------------- Helpers ---------------

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-5 flex items-center gap-4">
      <div className="p-2.5 bg-[#262626] rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-[#737373]">{label}</p>
        <p className="text-2xl font-semibold text-[#ededed]">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
      <h3 className="text-sm font-medium text-[#737373] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// --------------- Main ---------------

export default function AnalyticsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StatsResponse>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#737373]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#ededed] mb-4">Analytics</h1>
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            Failed to load analytics: {error ?? 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  const { summary, costByDay, scoreDistribution, modelUsage, antiPatternRanking, efficiencyTrend, tokenWasteBreakdown } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#ededed] mb-6">Analytics</h1>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Cost This Month"
            value={formatCost(summary.totalCostThisMonth)}
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            label="Avg Efficiency"
            value={`${Math.round(summary.avgEfficiency)}/100`}
            icon={<Gauge className="w-5 h-5 text-blue-400" />}
          />
          <StatCard
            label="Total Sessions"
            value={String(summary.totalSessions)}
            icon={<Hash className="w-5 h-5 text-purple-400" />}
          />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Cost by Day (30 days)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [formatCost(value), 'Cost']}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Score Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="bucket" tick={{ fill: '#737373', fontSize: 11 }} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [value, 'Sessions']}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Model Usage">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={modelUsage}
                  dataKey="count"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ model, percent }: { model: string; percent: number }) =>
                    `${model} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: '#737373' }}
                >
                  {modelUsage.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [value, 'Sessions']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Anti-pattern Ranking">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={antiPatternRanking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="pattern"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [value, 'Occurrences']}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Efficiency Trend (30 days)">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={efficiencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [`${Math.round(value)}/100`, 'Efficiency']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Token Waste Breakdown">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tokenWasteBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number) => [`${(value / 1000).toFixed(1)}K`, '']}
                />
                <Legend wrapperStyle={{ color: '#737373', fontSize: 12 }} />
                <Bar dataKey="useful" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Useful Tokens" />
                <Bar dataKey="wasted" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Wasted Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
