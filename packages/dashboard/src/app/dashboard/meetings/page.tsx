'use client';

import { Calendar } from 'lucide-react';

export default function MeetingsPage() {
  return (
    <div className="min-h-screen">
      <header className="mb-8 animate-section">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Meetings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Track meeting decisions and task delivery</p>
      </header>

      <div className="animate-section flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="w-10 h-10 text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Meeting tracker coming soon</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Connect Fireflies to automatically track meeting action items.</p>
      </div>
    </div>
  );
}
