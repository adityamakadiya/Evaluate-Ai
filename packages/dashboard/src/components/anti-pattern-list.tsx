'use client';

interface AntiPatternListProps {
  patterns: { pattern: string; count: number }[];
}

function severityColor(pattern: string): string {
  const lower = pattern.toLowerCase();
  // High severity patterns
  if (
    lower.includes('vague') ||
    lower.includes('no context') ||
    lower.includes('too broad') ||
    lower.includes('lazy')
  ) {
    return 'bg-red-500';
  }
  // Medium severity patterns
  if (
    lower.includes('retry') ||
    lower.includes('repeat') ||
    lower.includes('redundant') ||
    lower.includes('long')
  ) {
    return 'bg-yellow-500';
  }
  // Low severity
  return 'bg-blue-500';
}

export function AntiPatternList({ patterns }: AntiPatternListProps) {
  const sorted = [...patterns].sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h3 className="mb-4 text-sm font-medium text-[#ededed]">Top Anti-Patterns</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-[#737373]">No anti-patterns detected yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((item) => (
            <li key={item.pattern} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${severityColor(item.pattern)}`}
                />
                <span className="truncate text-sm text-[#ededed]">{item.pattern}</span>
              </div>
              <span className="shrink-0 rounded-md bg-[#262626] px-2 py-0.5 text-xs font-medium text-[#737373]">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
