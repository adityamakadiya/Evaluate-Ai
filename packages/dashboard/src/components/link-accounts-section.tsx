'use client';

import { useState, useEffect } from 'react';
import { Github, Mic, Mail, Save, Loader2, Plus, X } from 'lucide-react';

interface LinkedAccounts {
  githubUsername: string | null;
  email: string;
  firefliesDisplayNames: string[];
}

interface Props {
  developerId: string;
  canEdit: boolean;
}

export default function LinkAccountsSection({ developerId, canEdit }: Props) {
  const [accounts, setAccounts] = useState<LinkedAccounts | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Edit state
  const [githubUsername, setGithubUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firefliesNames, setFirefliesNames] = useState<string[]>([]);
  const [newFirefliesName, setNewFirefliesName] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/developers/${developerId}/link-accounts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return;
        setAccounts(data);
        setGithubUsername(data.githubUsername ?? '');
        setEmail(data.email ?? '');
        setFirefliesNames(data.firefliesDisplayNames ?? []);
      })
      .catch(() => {});
  }, [developerId]);

  function handleAddFirefliesName() {
    const name = newFirefliesName.trim();
    if (name && !firefliesNames.includes(name)) {
      setFirefliesNames([...firefliesNames, name]);
      setNewFirefliesName('');
    }
  }

  function handleRemoveFirefliesName(name: string) {
    setFirefliesNames(firefliesNames.filter((n) => n !== name));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/dashboard/developers/${developerId}/link-accounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUsername,
          email,
          firefliesDisplayNames: firefliesNames,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }

      setAccounts(data);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (!accounts) return null;

  if (!editing) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Linked Accounts
          </h3>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <AccountBadge
            icon={<Github className="h-3 w-3" />}
            label={accounts.githubUsername || 'Not linked'}
            linked={!!accounts.githubUsername}
          />
          <AccountBadge
            icon={<Mail className="h-3 w-3" />}
            label={accounts.email}
            linked={true}
          />
          <AccountBadge
            icon={<Mic className="h-3 w-3" />}
            label={
              accounts.firefliesDisplayNames.length > 0
                ? accounts.firefliesDisplayNames.join(', ')
                : 'Not linked'
            }
            linked={accounts.firefliesDisplayNames.length > 0}
          />
        </div>
        {success && (
          <p className="text-xs text-emerald-400 mt-2">Saved successfully</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Edit Linked Accounts
        </h3>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        {/* GitHub Username */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary mb-1.5">
            <Github className="h-3 w-3" /> GitHub Username
          </label>
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="e.g. octocat"
            className="w-full bg-bg-primary border border-border-primary rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary mb-1.5">
            <Mail className="h-3 w-3" /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-primary border border-border-primary rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Fireflies Display Names */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary mb-1.5">
            <Mic className="h-3 w-3" /> Fireflies Display Names
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {firefliesNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 bg-purple-900/30 text-purple-400 text-xs px-2 py-0.5 rounded-full"
              >
                {name}
                <button
                  onClick={() => handleRemoveFirefliesName(name)}
                  className="hover:text-purple-200 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFirefliesName}
              onChange={(e) => setNewFirefliesName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFirefliesName())}
              placeholder="Add display name..."
              className="flex-1 bg-bg-primary border border-border-primary rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleAddFirefliesName}
              className="flex items-center gap-1 bg-bg-elevated border border-border-primary rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Names used in Fireflies meetings to match this developer
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function AccountBadge({
  icon,
  label,
  linked,
}: {
  icon: React.ReactNode;
  label: string;
  linked: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
        linked
          ? 'border-border-primary text-text-secondary'
          : 'border-border-primary text-text-muted'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
