'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store user data in localStorage for MVP
      localStorage.setItem('evaluateai-user', JSON.stringify(data.user));
      localStorage.setItem('evaluateai-session', JSON.stringify(data.session));

      router.push('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = [
    'w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)]',
    'px-4 py-2.5 pl-10 text-sm text-[var(--text-primary)]',
    'placeholder:text-[var(--text-muted)]',
    'focus:border-[var(--border-focus)] focus:outline-none',
    'transition-colors',
  ].join(' ');

  return (
    <div className="animate-section">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.3)] mb-4">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="text-white">
            <path d="M8 1L14.5 5v6L8 15 1.5 11V5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(255,255,255,0.15)" />
            <path d="M8 5.5L11.5 7.5v3L8 12.5 4.5 10.5v-3L8 5.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(255,255,255,0.25)" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Welcome back
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Sign in to your EvaluateAI account
        </p>
      </div>

      {/* Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
          Sign up
        </Link>
      </p>

      {/* Demo Quick Login */}
      <div className="mt-8 pt-6 border-t border-[var(--border-primary)]">
        <p className="text-xs text-[var(--text-muted)] text-center mb-3 uppercase tracking-wider font-medium">Quick Demo Login</p>
        <div className="grid gap-2">
          {[
            { name: 'Aditya Makadiya', email: 'aditya@acme.dev', role: 'Owner', color: '#8b5cf6', id: '32709dfb-7637-4562-a806-584f36db302a', teamId: '943dc5d1-1b71-49dd-8862-43d67f450183', score: 85 },
            { name: 'Priya Sharma', email: 'priya@acme.dev', role: 'Manager', color: '#3b82f6', id: '4fe275ec-d331-4674-87e1-9f248f6c6144', teamId: '943dc5d1-1b71-49dd-8862-43d67f450183', score: 74 },
            { name: 'Jake Wilson', email: 'jake@acme.dev', role: 'Developer', color: '#ef4444', id: '2e7e98b2-9da0-46b6-a8c8-b9c53f94d048', teamId: '943dc5d1-1b71-49dd-8862-43d67f450183', score: 38 },
            { name: 'Sara Chen', email: 'sara@acme.dev', role: 'Developer', color: '#22c55e', id: '0caea587-774c-44ae-8da5-4c8d149fb74f', teamId: '943dc5d1-1b71-49dd-8862-43d67f450183', score: null },
            { name: 'Rob Kumar', email: 'rob@acme.dev', role: 'Developer', color: '#f59e0b', id: '54436876-e490-433b-af13-4426a8cfa6c4', teamId: '943dc5d1-1b71-49dd-8862-43d67f450183', score: null },
          ].map((demo) => (
            <button
              key={demo.email}
              onClick={() => {
                localStorage.setItem('evaluateai-user', JSON.stringify({ name: demo.name, email: demo.email, id: demo.id }));
                localStorage.setItem('evaluateai-team', JSON.stringify({ id: demo.teamId, name: 'Acme Engineering' }));
                router.push('/dashboard');
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] transition-all text-left group"
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: demo.color }}
              >
                {demo.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{demo.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{demo.role} · {demo.email}</p>
              </div>
              {demo.score !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  demo.score >= 70 ? 'bg-emerald-900/30 text-emerald-400' :
                  demo.score >= 40 ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {demo.score}
                </span>
              )}
              <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
