'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Github,
  Mic,
  Trello,
  MessageSquare,
  Check,
  ExternalLink,
  Plug,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ---------- Types ----------

interface Repo {
  name: string;
  fullName: string;
  defaultBranch: string;
  language: string | null;
  private: boolean;
}

interface Integration {
  id: string;
  provider: string;
  status: string;
  config: {
    repos?: Array<{
      name: string;
      full_name: string;
      default_branch: string;
      language: string | null;
    }>;
    connected_at?: string;
    tracked_repos?: string[];
  };
  lastSyncAt: string | null;
}

// ---------- Constants ----------

const TEAM_ID_KEY = 'evaluateai-team-id';

const integrationCards = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Track commits, pull requests, and code reviews',
    icon: Github,
    available: true,
  },
  {
    id: 'fireflies',
    name: 'Fireflies.ai',
    description: 'Auto-capture meeting transcripts and action items',
    icon: Mic,
    available: false,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tasks, sprints, and project tracking',
    icon: Trello,
    available: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Daily digests, alerts, and team notifications',
    icon: MessageSquare,
    available: false,
  },
];

// ---------- Component ----------

export default function IntegrationsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>}>
      <IntegrationsPage />
    </Suspense>
  );
}

function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [teamId, setTeamId] = useState<string>('');
  const [githubIntegration, setGithubIntegration] = useState<Integration | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [trackedRepos, setTrackedRepos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check URL params for success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'github_connected') {
      setSuccessMsg('GitHub connected successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: 'GitHub authorization failed: missing parameters',
        invalid_state: 'GitHub authorization failed: invalid state',
        oauth_failed: 'GitHub OAuth failed. Please try again.',
        callback_failed: 'GitHub connection failed. Please try again.',
      };
      setErrorMsg(errorMessages[error] ?? 'An error occurred');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }, [searchParams]);

  // Load team ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TEAM_ID_KEY);
    if (stored) setTeamId(stored);
  }, []);

  // Fetch GitHub integration status
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    async function fetchIntegration() {
      try {
        const res = await fetch(`/api/integrations/github/repos?team_id=${teamId}`);
        if (res.ok) {
          const data = await res.json();
          setRepos(data.repos ?? []);
          setGithubIntegration({
            id: 'github',
            provider: 'github',
            status: 'active',
            config: {},
            lastSyncAt: null,
          });
        }
      } catch {
        // Not connected — that's fine
      } finally {
        setLoading(false);
      }
    }

    fetchIntegration();
  }, [teamId]);

  function handleConnectGitHub() {
    if (!teamId) {
      setErrorMsg('Please set your Team ID first');
      return;
    }
    window.location.href = `/api/integrations/github/connect?team_id=${teamId}`;
  }

  function toggleRepoTracking(fullName: string) {
    setTrackedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  }

  const isGitHubConnected = githubIntegration !== null;

  // ---------- Render ----------

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Connect your tools to track developer activity automatically
        </p>
      </div>

      {/* Team ID Input */}
      {!teamId && (
        <div className="mb-6 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5">
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Team ID
          </label>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Enter your team ID to manage integrations
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter team UUID..."
              className="flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-purple-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setTeamId(val);
                    localStorage.setItem(TEAM_ID_KEY, val);
                  }
                }
              }}
            />
            <button
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              onClick={() => {
                const input = document.querySelector('input[placeholder*="team UUID"]') as HTMLInputElement;
                const val = input?.value?.trim();
                if (val) {
                  setTeamId(val);
                  localStorage.setItem(TEAM_ID_KEY, val);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid gap-4">
        {integrationCards.map((card) => {
          const Icon = card.icon;
          const isConnected = card.id === 'github' && isGitHubConnected;
          const isAvailable = card.available;

          return (
            <div
              key={card.id}
              className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-5 hover:border-[var(--border-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isConnected
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : isAvailable
                        ? 'bg-purple-900/30 text-purple-400'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {card.name}
                      </h3>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      {!isAvailable && (
                        <span className="inline-flex items-center rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div>
                  {card.id === 'github' && !isConnected && isAvailable && (
                    <button
                      onClick={handleConnectGitHub}
                      disabled={loading || !teamId}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plug className="h-4 w-4" />
                      )}
                      Connect GitHub
                    </button>
                  )}
                  {card.id === 'github' && isConnected && (
                    <button
                      onClick={() => {
                        setReposLoading(true);
                        fetch(`/api/integrations/github/repos?team_id=${teamId}`)
                          .then((r) => r.json())
                          .then((data) => setRepos(data.repos ?? []))
                          .finally(() => setReposLoading(false));
                      }}
                      className="flex items-center gap-2 border border-[var(--border-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {reposLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                      Refresh Repos
                    </button>
                  )}
                </div>
              </div>

              {/* GitHub Connected: Show repos */}
              {card.id === 'github' && isConnected && repos.length > 0 && (
                <div className="mt-4 border-t border-[var(--border-primary)] pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Repositories
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {repos.map((repo) => {
                      const isTracked = trackedRepos.has(repo.fullName);
                      return (
                        <div
                          key={repo.fullName}
                          className="flex items-center justify-between rounded-md bg-[var(--bg-secondary)] px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <Github className="h-4 w-4 text-[var(--text-muted)]" />
                            <div>
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {repo.name}
                              </span>
                              {repo.language && (
                                <span className="ml-2 text-xs text-[var(--text-muted)]">
                                  {repo.language}
                                </span>
                              )}
                              {repo.private && (
                                <span className="ml-2 inline-flex items-center rounded bg-yellow-900/30 px-1.5 py-0.5 text-[10px] text-yellow-400">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleRepoTracking(repo.fullName)}
                            className="text-[var(--text-muted)] hover:text-purple-400 transition-colors"
                            title={isTracked ? 'Disable tracking' : 'Enable tracking'}
                          >
                            {isTracked ? (
                              <ToggleRight className="h-5 w-5 text-purple-400" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Webhook status for connected GitHub */}
              {card.id === 'github' && isConnected && (
                <div className="mt-4 border-t border-[var(--border-primary)] pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Webhook
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>
                      Endpoint: <code className="font-mono text-[var(--text-muted)]">/api/integrations/github/webhook</code>
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Configure this URL in your GitHub repository webhook settings.
                    Events: push, pull_request, pull_request_review
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
