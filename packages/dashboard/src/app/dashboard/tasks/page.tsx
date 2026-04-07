'use client';

import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="min-h-screen">
      <header className="mb-8 animate-section">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Tasks</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">All team tasks and their delivery status</p>
      </header>

      <div className="animate-section flex flex-col items-center justify-center py-16 text-center">
        <CheckSquare className="w-10 h-10 text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Task management coming soon</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Tasks extracted from meetings will appear here with code delivery tracking.</p>
      </div>
    </div>
  );
}
