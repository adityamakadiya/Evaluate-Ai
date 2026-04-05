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
} from 'lucide-react';

// --------------- Types ---------------

type PrivacyMode = 'off' | 'local' | 'hash';
type ScoringMode = 'heuristic' | 'llm';

interface Config {
  privacy: PrivacyMode;
  scoring: ScoringMode;
  threshold: number;
  dashboardPort: number;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// --------------- Sub-components ---------------

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
      <h3 className="text-base font-medium text-[#ededed] mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
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
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="radio"
        name={name}
        value={value}
        checked={currentValue === value}
        onChange={() => onChange(value)}
        className="mt-1 w-4 h-4 accent-blue-500"
      />
      <div>
        <span className="text-sm text-[#ededed] group-hover:text-white transition-colors">
          {label}
        </span>
        <p className="text-xs text-[#737373] mt-0.5">{description}</p>
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
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    fetch('/api/config')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Config>;
      })
      .then(setConfig)
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
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', 'Settings saved successfully');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showToast('error', `Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const res = await fetch('/api/config/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: config?.supabaseUrl,
          supabaseKey: config?.supabaseKey,
        }),
      });
      setConnectionStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setConnectionStatus('fail');
    } finally {
      setTestingConnection(false);
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
      <div className="min-h-screen bg-[#0a0a0a] p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#737373]" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#ededed] mb-4">Settings</h1>
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            Failed to load settings: {error ?? 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
              : 'bg-red-900/60 border-red-700 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#ededed]">Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>

        <div className="space-y-6">
          {/* Privacy Mode */}
          <SectionCard title="Privacy Mode" icon={<Shield className="w-4 h-4 text-blue-400" />}>
            <div className="space-y-3">
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
                description="Store prompts only in local SQLite. Never send to external services."
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
          <SectionCard title="Scoring Mode" icon={<Brain className="w-4 h-4 text-purple-400" />}>
            <div className="space-y-3">
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
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#737373]">
                  Show improvement suggestions when score is below this threshold.
                </p>
                <span className="text-lg font-semibold text-[#ededed] min-w-[3rem] text-right">
                  {config.threshold}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={config.threshold}
                onChange={(e) => updateConfig('threshold', Number(e.target.value))}
                className="w-full h-2 bg-[#262626] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-[#737373] mt-1">
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
          >
            <div>
              <p className="text-sm text-[#737373] mb-2">
                Port for the dashboard web server. Requires restart to take effect.
              </p>
              <input
                type="number"
                min={1024}
                max={65535}
                value={config.dashboardPort}
                onChange={(e) => updateConfig('dashboardPort', Number(e.target.value))}
                className="w-40 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#ededed] focus:outline-none focus:border-[#404040] transition-colors"
              />
            </div>
          </SectionCard>

          {/* Supabase */}
          <SectionCard
            title="Supabase Connection"
            icon={<Database className="w-4 h-4 text-emerald-400" />}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#737373] mb-1">Supabase URL</label>
                <input
                  type="text"
                  value={config.supabaseUrl ?? ''}
                  onChange={(e) => updateConfig('supabaseUrl', e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder-[#737373] focus:outline-none focus:border-[#404040] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#737373] mb-1">Supabase Anon Key</label>
                <input
                  type="password"
                  value={config.supabaseKey ?? ''}
                  onChange={(e) => updateConfig('supabaseKey', e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder-[#737373] focus:outline-none focus:border-[#404040] transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-[#262626] rounded-lg text-[#ededed] hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors"
                >
                  {testingConnection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  Test Connection
                </button>
                {connectionStatus === 'ok' && (
                  <span className="text-sm text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </span>
                )}
                {connectionStatus === 'fail' && (
                  <span className="text-sm text-red-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Connection failed
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Hook Status */}
          <SectionCard
            title="Hook Status"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          >
            <div className="space-y-2">
              {[
                { name: 'SessionStart', status: true },
                { name: 'UserPromptSubmit', status: true },
                { name: 'PreToolUse', status: true },
                { name: 'PostToolUse', status: true },
                { name: 'Stop', status: true },
                { name: 'SessionEnd', status: true },
              ].map((hook) => (
                <div
                  key={hook.name}
                  className="flex items-center justify-between py-1.5 px-3 bg-[#0a0a0a] rounded-md"
                >
                  <span className="text-sm text-[#ededed] font-mono">{hook.name}</span>
                  <span
                    className={`text-xs flex items-center gap-1 ${
                      hook.status ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {hook.status ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Data Management */}
          <SectionCard
            title="Data Management"
            icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-[#262626] rounded-lg text-[#ededed] hover:bg-[#1a1a1a] transition-colors"
              >
                <Download className="w-4 h-4" /> Export Data
              </button>

              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Are you sure?</span>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-sm border border-[#262626] text-[#ededed] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
