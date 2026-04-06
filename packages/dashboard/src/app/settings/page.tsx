'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Save,
  Download,
  Trash2,
  Shield,
  Brain,
  Sliders,
  Monitor,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
} from 'lucide-react';

// --------------- Types ---------------

type PrivacyMode = 'off' | 'local' | 'hash';
type ScoringMode = 'heuristic' | 'llm';

interface Config {
  privacy: PrivacyMode;
  scoring: ScoringMode;
  threshold: number;
  dashboardPort: number;
}

// --------------- Sub-components ---------------

function SectionCard({
  title,
  icon,
  children,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-6 hover:border-[var(--border-hover)] transition-colors">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
      </div>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mb-4 ml-11">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RadioOption({
  name,
  value,
  currentValue,
  label,
  description,
  onChange,
}: {
  name: string;
  value: string;
  currentValue: string;
  label: string;
  description: string;
  onChange: (v: string) => void;
}) {
  const selected = currentValue === value;

  return (
    <label
      className={`flex items-start gap-3.5 cursor-pointer group p-3.5 rounded-lg border transition-all ${
        selected
          ? 'bg-purple-900/10 border-purple-800/40'
          : 'bg-transparent border-transparent hover:bg-[var(--bg-elevated)]'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? 'border-purple-500 bg-purple-500'
              : 'border-[var(--border-hover)] group-hover:border-[var(--text-muted)]'
          }`}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div>
        <span className={`text-sm font-medium transition-colors ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
          {label}
        </span>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </label>
  );
}

// --------------- Main ---------------

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        // API returns { key: { value, updatedAt } } -- extract just values
        const getValue = (key: string, fallback: string) => {
          const entry = raw[key];
          if (!entry) return fallback;
          return typeof entry === 'object' && entry.value !== undefined ? entry.value : String(entry);
        };
        const config: Config = {
          privacy: getValue('privacy', 'local') as PrivacyMode,
          scoring: getValue('scoring', 'llm') as ScoringMode,
          threshold: parseInt(getValue('threshold', '50'), 10),
          dashboardPort: parseInt(getValue('dashboard_port', '3456'), 10),
        };
        setConfig(config);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      // Save each config key individually
      const entries: [string, string][] = [
        ['privacy', config!.privacy],
        ['scoring', config!.scoring],
        ['threshold', String(config!.threshold)],
        ['dashboard_port', String(config!.dashboardPort)],
      ];
      for (const [key, value] of entries) {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${key}`);
      }
      showToast('success', 'Settings saved successfully');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showToast('error', `Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/config/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluateai-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Data exported');
    } catch {
      showToast('error', 'Export failed');
    }
  }

  async function handleReset() {
    try {
      const res = await fetch('/api/config/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      showToast('success', 'Data reset successfully');
      setShowResetConfirm(false);
    } catch {
      showToast('error', 'Reset failed');
    }
  }

  function updateConfig<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm text-[var(--text-muted)]">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Settings</h1>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-5 text-red-300 text-sm">
            Failed to load settings: {error ?? 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  const hooks = [
    { name: 'SessionStart', status: true },
    { name: 'UserPromptSubmit', status: true },
    { name: 'PreToolUse', status: true },
    { name: 'PostToolUse', status: true },
    { name: 'Stop', status: true },
    { name: 'SessionEnd', status: true },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-8 relative">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-lg border text-sm shadow-xl transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-900/70 border-emerald-700/50 text-emerald-300 shadow-emerald-900/20'
              : 'bg-red-900/70 border-red-700/50 text-red-300 shadow-red-900/20'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2 ml-12">Configure EvaluateAI behavior and preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-sm shadow-purple-900/30 hover:shadow-purple-900/40"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-5">
          {/* Privacy Mode */}
          <SectionCard
            title="Privacy Mode"
            icon={<Shield className="w-4 h-4 text-blue-400" />}
            description="Control how your prompt data is stored"
          >
            <div className="space-y-1.5">
              <RadioOption
                name="privacy"
                value="off"
                currentValue={config.privacy}
                label="Off"
                description="Store full prompt text. Best for analysis accuracy."
                onChange={(v) => updateConfig('privacy', v as PrivacyMode)}
              />
              <RadioOption
                name="privacy"
                value="local"
                currentValue={config.privacy}
                label="Local Only"
                description="Store prompts only in local SQLite. Never sent to external services."
                onChange={(v) => updateConfig('privacy', v as PrivacyMode)}
              />
              <RadioOption
                name="privacy"
                value="hash"
                currentValue={config.privacy}
                label="Hash Only"
                description="Store only prompt hashes. Maximum privacy, reduced analysis quality."
                onChange={(v) => updateConfig('privacy', v as PrivacyMode)}
              />
            </div>
          </SectionCard>

          {/* Scoring Mode */}
          <SectionCard
            title="Scoring Mode"
            icon={<Brain className="w-4 h-4 text-purple-400" />}
            description="Choose how prompts are evaluated"
          >
            <div className="space-y-1.5">
              <RadioOption
                name="scoring"
                value="heuristic"
                currentValue={config.scoring}
                label="Heuristic"
                description="Fast, local pattern-based scoring. No API calls, zero cost."
                onChange={(v) => updateConfig('scoring', v as ScoringMode)}
              />
              <RadioOption
                name="scoring"
                value="llm"
                currentValue={config.scoring}
                label="LLM-Assisted"
                description="Uses a small LLM call for deeper analysis. More accurate but costs ~$0.001/turn."
                onChange={(v) => updateConfig('scoring', v as ScoringMode)}
              />
            </div>
          </SectionCard>

          {/* Suggestion Threshold */}
          <SectionCard
            title="Suggestion Threshold"
            icon={<Sliders className="w-4 h-4 text-yellow-400" />}
            description="Show improvement suggestions when score is below this value"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">{config.threshold}</span>
                  <span className="text-sm text-[var(--text-muted)]">/ 100</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.threshold}
                  onChange={(e) => updateConfig('threshold', Number(e.target.value))}
                  className="w-full h-2 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg-card)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-purple-400"
                />
                {/* Track fill */}
                <div
                  className="absolute top-0 left-0 h-2 bg-purple-600/50 rounded-full pointer-events-none"
                  style={{ width: `${config.threshold}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-2 font-medium">
                <span>0 (never)</span>
                <span>50</span>
                <span>100 (always)</span>
              </div>
            </div>
          </SectionCard>

          {/* Dashboard Port */}
          <SectionCard
            title="Dashboard Port"
            icon={<Monitor className="w-4 h-4 text-cyan-400" />}
            description="Port for the dashboard web server. Requires restart."
          >
            <input
              type="number"
              min={1024}
              max={65535}
              value={config.dashboardPort}
              onChange={(e) => updateConfig('dashboardPort', Number(e.target.value))}
              className="w-40 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
          </SectionCard>

          {/* Supabase */}
          <SectionCard
            title="Supabase Cloud Sync"
            icon={<Database className="w-4 h-4 text-emerald-400" />}
            description="Configured via environment variables"
          >
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Set these in your shell or <code className="text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[11px] font-mono">~/.evaluateai-v2/.env</code>
              </p>
              <div className="bg-[var(--bg-primary)] border border-[var(--bg-elevated)] rounded-lg p-4 font-mono text-xs text-[var(--text-muted)] space-y-1">
                <div><span className="text-purple-400">SUPABASE_URL</span>=<span className="text-[var(--text-muted)]">https://your-project.supabase.co</span></div>
                <div><span className="text-purple-400">SUPABASE_ANON_KEY</span>=<span className="text-[var(--text-muted)]">your-anon-key</span></div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Then run <code className="text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[11px] font-mono">evalai sync</code> to push data to the cloud.
              </p>
            </div>
          </SectionCard>

          {/* Hook Status */}
          <SectionCard
            title="Hook Status"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            description="All Claude Code hooks are active and monitoring"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {hooks.map((hook) => (
                <div
                  key={hook.name}
                  className="flex items-center gap-2.5 py-2.5 px-3.5 bg-[var(--bg-primary)] border border-[var(--bg-elevated)] rounded-lg"
                >
                  {hook.status ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-[var(--text-secondary)] font-mono truncate">{hook.name}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Data Management */}
          <SectionCard
            title="Data Management"
            icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
            description="Export or reset your EvaluateAI data"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-[var(--border-primary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-all"
              >
                <Download className="w-4 h-4" /> Export Data
              </button>

              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-red-900/40 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-900/10 hover:border-red-800/50 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </button>
              ) : (
                <div className="flex items-center gap-2.5 bg-red-900/10 border border-red-900/30 rounded-lg px-4 py-2.5">
                  <span className="text-sm text-red-400 font-medium">Are you sure?</span>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-xs font-medium border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Bottom save button (mobile) */}
        <div className="mt-8 flex justify-end sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
