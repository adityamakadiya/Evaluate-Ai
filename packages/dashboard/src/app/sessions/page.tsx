'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader2,
  FileQuestion,
} from 'lucide-react';

// --------------- Types ---------------

interface SessionRow {
  id: string;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  totalTurns: number;
  totalCostUsd: number;
  efficiencyScore: number | null;
  turns?: { promptText: string | null }[];
}

interface SessionsResponse {
  sessions: SessionRow[];
  total: number;
}

// --------------- Helpers ---------------

const PAGE_SIZE = 20;

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-[#737373]';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function taskLabel(session: SessionRow): string {
  const prompt = session.turns?.[0]?.promptText;
  if (prompt) {
    return prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;
  }
  return session.id.slice(0, 12) + '...';
}

type SortKey = 'task' | 'date' | 'turns' | 'cost' | 'score' | 'model' | 'duration';
type SortDir = 'asc' | 'desc';

function getSortValue(s: SessionRow, key: SortKey): string | number {
  switch (key) {
    case 'task':
      return taskLabel(s).toLowerCase();
    case 'date':
      return new Date(s.startedAt).getTime();
    case 'turns':
      return s.totalTurns;
    case 'cost':
      return s.totalCostUsd;
    case 'score':
      return s.efficiencyScore ?? -1;
    case 'model':
      return (s.model ?? '').toLowerCase();
    case 'duration': {
      if (!s.endedAt) return 0;
      return new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
    }
  }
}

// --------------- Component ---------------

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sessions?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SessionsResponse>;
      })
      .then((data) => {
        setSessions(data.sessions);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [offset]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        const prompt = s.turns?.[0]?.promptText ?? '';
        return prompt.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      });
    }
    list = [...list].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [sessions, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const columns: { key: SortKey; label: string; align?: string }[] = [
    { key: 'task', label: 'Task' },
    { key: 'date', label: 'Date' },
    { key: 'turns', label: 'Turns', align: 'text-right' },
    { key: 'cost', label: 'Cost', align: 'text-right' },
    { key: 'score', label: 'Score', align: 'text-right' },
    { key: 'model', label: 'Model' },
    { key: 'duration', label: 'Duration', align: 'text-right' },
  ];

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#737373]" />
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#ededed] mb-4">Sessions</h1>
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            Failed to load sessions: {error}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Empty state ----------
  if (sessions.length === 0 && offset === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#ededed] mb-8">Sessions</h1>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileQuestion className="w-16 h-16 text-[#737373] mb-4" />
            <p className="text-[#737373] text-lg max-w-md">
              No sessions yet. Use Claude Code with EvaluateAI hooks to start tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-[#ededed]">Sessions</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#ededed] placeholder-[#737373] focus:outline-none focus:border-[#404040] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#262626]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#141414] border-b border-[#262626]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium text-[#737373] cursor-pointer select-none hover:text-[#ededed] transition-colors ${col.align ?? 'text-left'}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr
                  key={session.id}
                  onClick={() => router.push(`/sessions/${session.id}`)}
                  className="bg-[#141414] border-b border-[#262626] cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-4 py-3 text-[#ededed] max-w-xs truncate">
                    {taskLabel(session)}
                  </td>
                  <td className="px-4 py-3 text-[#737373] whitespace-nowrap">
                    {new Date(session.startedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-[#ededed] text-right">{session.totalTurns}</td>
                  <td className="px-4 py-3 text-[#ededed] text-right">
                    {formatCost(session.totalCostUsd)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${scoreColor(session.efficiencyScore)}`}>
                    {session.efficiencyScore !== null
                      ? `${Math.round(session.efficiencyScore)}/100`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#737373]">{session.model ?? '—'}</td>
                  <td className="px-4 py-3 text-[#ededed] text-right">
                    {formatDuration(session.startedAt, session.endedAt)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#737373]">
                    No sessions match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#737373]">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-[#262626] text-[#ededed] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-[#262626] text-[#ededed] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
