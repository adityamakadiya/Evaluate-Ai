'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface ScoreTrendProps {
  data: { date: string; score: number }[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#1a1a1a] px-3 py-2 text-sm shadow-lg">
      <p className="text-[#737373]">{formatDate(label)}</p>
      <p className="font-medium text-[#ededed]">{Math.round(payload[0].value)}/100</p>
    </div>
  );
}

export function ScoreTrend({ data }: ScoreTrendProps) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h3 className="mb-4 text-sm font-medium text-[#ededed]">Avg Score Trend (30 days)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#737373"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#262626' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#737373"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#262626' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={70}
            stroke="#737373"
            strokeDasharray="4 4"
            label={{
              value: 'Good',
              position: 'right',
              fill: '#737373',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
