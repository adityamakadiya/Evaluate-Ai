'use client';

import { Wrench } from 'lucide-react';

interface ToolUsage {
  name: string;
  count: number;
  avgExecMs: number | null;
  successRate: number | null;
  developers: number;
}

interface Props {
  tools: ToolUsage[];
}

export default function ToolUsageTable({ tools }: Props) {
  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="w-8 h-8 text-text-muted mb-2" />
        <p className="text-sm text-text-secondary">No tool usage data</p>
        <p className="text-xs text-text-muted">Tool events will appear after AI sessions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-primary">
            <th className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 pr-4">Tool</th>
            <th className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 pr-4 text-right">Calls</th>
            <th className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 pr-4 text-right">Avg ms</th>
            <th className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 pr-4 text-right">Success</th>
            <th className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 text-right">Devs</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr key={tool.name} className="border-b border-border-primary/50 hover:bg-bg-elevated/50 transition-colors">
              <td className="py-2 pr-4">
                <span className="text-sm font-mono text-text-primary">{tool.name}</span>
              </td>
              <td className="py-2 pr-4 text-right">
                <span className="text-sm font-mono text-text-secondary">{tool.count.toLocaleString()}</span>
              </td>
              <td className="py-2 pr-4 text-right">
                <span className="text-sm font-mono text-text-muted">
                  {tool.avgExecMs != null ? `${tool.avgExecMs}` : '-'}
                </span>
              </td>
              <td className="py-2 pr-4 text-right">
                {tool.successRate != null ? (
                  <span className={`text-sm font-mono ${
                    tool.successRate >= 95 ? 'text-emerald-400' :
                    tool.successRate >= 80 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {tool.successRate}%
                  </span>
                ) : (
                  <span className="text-sm font-mono text-text-muted">-</span>
                )}
              </td>
              <td className="py-2 text-right">
                <span className="text-sm text-text-muted">{tool.developers}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
