'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CostChartProps {
  data: { date: string; cost: number }[];
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
      <p className="font-medium text-[#ededed]">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export function CostChart({ data }: CostChartProps) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h3 className="mb-4 text-sm font-medium text-[#ededed]">Daily Cost (30 days)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            stroke="#737373"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#262626' }}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#costFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
