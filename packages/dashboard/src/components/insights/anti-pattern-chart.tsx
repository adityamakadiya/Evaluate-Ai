'use client';

import { AlertTriangle } from 'lucide-react';

interface AntiPattern {
  pattern: string;
  count: number;
  developers: number;
}

const PATTERN_LABELS: Record<string, { label: string; severity: string }> = {
  vague_verb: { label: 'Vague verbs (fix, make, help)', severity: 'high' },
  paraphrased_error: { label: 'Paraphrased error (no backticks)', severity: 'high' },
  too_short: { label: 'Prompt too short', severity: 'medium' },
  no_file_ref: { label: 'No file reference', severity: 'medium' },
  multi_question: { label: 'Multiple questions', severity: 'medium' },
  overlong_prompt: { label: 'Prompt too long (500+ words)', severity: 'medium' },
  no_expected_output: { label: 'No expected outcome', severity: 'medium' },
  unanchored_ref: { label: 'Unanchored reference (it/that)', severity: 'low' },
  filler_words: { label: 'Filler words (please, could you)', severity: 'low' },
};

function getSeverityColor(severity: string): string {
  if (severity === 'high') return 'text-red-400 bg-red-900/30';
  if (severity === 'medium') return 'text-yellow-400 bg-yellow-900/30';
  return 'text-blue-400 bg-blue-900/30';
}

interface Props {
  patterns: AntiPattern[];
}

export default function AntiPatternChart({ patterns }: Props) {
  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-8 h-8 text-text-muted mb-2" />
        <p className="text-sm text-text-secondary">No anti-patterns detected</p>
        <p className="text-xs text-text-muted">Great prompt quality this period</p>
      </div>
    );
  }

  const maxCount = patterns[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {patterns.map((p) => {
        const info = PATTERN_LABELS[p.pattern] ?? { label: p.pattern, severity: 'low' };
        const widthPct = Math.max(8, Math.round((p.count / maxCount) * 100));

        return (
          <div key={p.pattern} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getSeverityColor(info.severity)}`}>
                  {info.severity.toUpperCase()}
                </span>
                <span className="text-xs text-text-secondary">{info.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{p.developers} dev{p.developers !== 1 ? 's' : ''}</span>
                <span className="font-mono font-medium text-text-secondary">{p.count}</span>
              </div>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500/60 rounded-full transition-all"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
