'use client';

import { Clock } from 'lucide-react';

export interface SessionItem {
  id: string;
  task: string;
  turns: number;
  cost: number;
  score: number | null;
  startedAt: string;
}

interface SessionListProps {
  sessions: SessionItem[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-[#737373]';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h3 className="mb-4 text-sm font-medium text-[#ededed]">Recent Sessions</h3>
        <p className="text-sm text-[#737373]">No sessions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h3 className="mb-4 text-sm font-medium text-[#ededed]">Recent Sessions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262626] text-left text-xs text-[#737373]">
              <th className="pb-2 pr-4 font-medium">Task</th>
              <th className="pb-2 pr-4 font-medium">Turns</th>
              <th className="pb-2 pr-4 font-medium">Cost</th>
              <th className="pb-2 pr-4 font-medium">Score</th>
              <th className="pb-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-[#262626]/50 last:border-0"
              >
                <td className="max-w-[280px] truncate py-2.5 pr-4 text-[#ededed]">
                  {s.task}
                </td>
                <td className="py-2.5 pr-4 text-[#737373]">{s.turns}</td>
                <td className="py-2.5 pr-4 text-[#ededed]">${s.cost.toFixed(2)}</td>
                <td className={`py-2.5 pr-4 font-medium ${scoreColor(s.score)}`}>
                  {s.score !== null ? `${Math.round(s.score)}/100` : '--'}
                </td>
                <td className="py-2.5 text-[#737373]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(s.startedAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
