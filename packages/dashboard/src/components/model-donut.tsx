'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ModelDonutProps {
  data: { model: string; count: number; cost: number }[];
}

const MODEL_COLORS: Record<string, string> = {
  sonnet: '#3b82f6',
  haiku: '#22c55e',
  opus: '#a855f7',
  gpt: '#f97316',
};

function getColor(model: string): string {
  const lower = model.toLowerCase();
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#6b7280';
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#1a1a1a] px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-[#ededed]">{entry.model}</p>
      <p className="text-[#737373]">{entry.count} sessions &middot; ${entry.cost.toFixed(2)}</p>
    </div>
  );
}

function renderLabel({ model, percent }: { model: string; percent: number }) {
  if (percent < 0.05) return null;
  return `${model} ${(percent * 100).toFixed(0)}%`;
}

export function ModelDonut({ data }: ModelDonutProps) {
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    ...d,
    percent: totalCount > 0 ? d.count / totalCount : 0,
  }));

  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h3 className="mb-4 text-sm font-medium text-[#ededed]">Model Usage</h3>
      {data.length === 0 ? (
        <p className="text-sm text-[#737373]">No model data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="count"
              nameKey="model"
              label={renderLabel}
              labelLine={false}
              stroke="#141414"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.model} fill={getColor(entry.model)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
