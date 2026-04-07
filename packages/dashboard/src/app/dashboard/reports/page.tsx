'use client';

import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="min-h-screen">
      <header className="mb-8 animate-section">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Auto-generated daily and weekly reports</p>
      </header>

      <div className="animate-section flex flex-col items-center justify-center py-16 text-center">
        <FileBarChart className="w-10 h-10 text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Reports coming soon</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Daily digests and weekly sprint reports will be generated automatically.</p>
      </div>
    </div>
  );
}
