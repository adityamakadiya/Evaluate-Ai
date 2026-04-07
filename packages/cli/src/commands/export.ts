import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { printHeader } from '../utils/display.js';

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getDateStamp(): string {
  return new Date().toISOString().split('T')[0];
}

async function exportCsv(supabase: SupabaseClient): Promise<void> {
  const { data: rows, error } = await supabase
    .from('ai_sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(chalk.gray('  No sessions to export.'));
    return;
  }

  const headers = [
    'id', 'tool', 'project_dir', 'git_repo', 'git_branch', 'model',
    'started_at', 'ended_at', 'total_turns', 'total_input_tokens', 'total_output_tokens',
    'total_cost_usd', 'total_tool_calls', 'files_changed', 'avg_prompt_score',
    'efficiency_score', 'token_waste_ratio', 'context_peak_pct',
  ];

  const csvRows = [headers.join(',')];

  for (const s of rows) {
    const values = [
      s.id,
      s.tool ?? '',
      s.project_dir ?? '',
      s.git_repo ?? '',
      s.git_branch ?? '',
      s.model ?? '',
      s.started_at ?? '',
      s.ended_at ?? '',
      String(s.total_turns ?? 0),
      String(s.total_input_tokens ?? 0),
      String(s.total_output_tokens ?? 0),
      String(s.total_cost_usd ?? 0),
      String(s.total_tool_calls ?? 0),
      String(s.files_changed ?? 0),
      s.avg_prompt_score != null ? String(s.avg_prompt_score) : '',
      s.efficiency_score != null ? String(s.efficiency_score) : '',
      s.token_waste_ratio != null ? String(s.token_waste_ratio) : '',
      s.context_peak_pct != null ? String(s.context_peak_pct) : '',
    ];
    // Escape values containing commas or quotes
    const escaped = values.map(v => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    });
    csvRows.push(escaped.join(','));
  }

  const filename = `evaluateai-export-${getDateStamp()}.csv`;
  writeFileSync(filename, csvRows.join('\n') + '\n', 'utf-8');
  console.log(chalk.green(`  Exported ${rows.length} sessions to ${filename}`));
}

async function exportJson(supabase: SupabaseClient): Promise<void> {
  const { data: sessionRows, error } = await supabase
    .from('ai_sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    return;
  }

  if (!sessionRows || sessionRows.length === 0) {
    console.log(chalk.gray('  No sessions to export.'));
    return;
  }

  const { data: turnRows } = await supabase
    .from('ai_turns')
    .select('*');

  const turnsBySession: Record<string, typeof turnRows> = {};
  for (const t of (turnRows ?? [])) {
    if (!turnsBySession[t.session_id]) turnsBySession[t.session_id] = [];
    turnsBySession[t.session_id]!.push(t);
  }

  const data = sessionRows.map(s => ({
    ...s,
    turns: (turnsBySession[s.id] ?? []).sort((a: any, b: any) => a.turn_number - b.turn_number),
  }));

  const filename = `evaluateai-export-${getDateStamp()}.json`;
  writeFileSync(filename, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(chalk.green(`  Exported ${sessionRows.length} sessions to ${filename}`));
}

export const exportCommand = new Command('export')
  .description('Export sessions to CSV or JSON')
  .option('--csv', 'Export as CSV')
  .option('--json', 'Export as JSON')
  .action(async (opts: { csv?: boolean; json?: boolean }) => {
    printHeader('Export');

    const supabase = getSupabase();
    if (!supabase) {
      console.log(chalk.red('  Supabase not configured.'));
      console.log(chalk.gray('  Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'));
      return;
    }

    if (!opts.csv && !opts.json) {
      console.log(chalk.yellow('  Specify --csv or --json'));
      console.log(chalk.gray('  Usage: evalai export --csv'));
      return;
    }

    if (opts.csv) await exportCsv(supabase);
    if (opts.json) await exportJson(supabase);
    console.log('');
  });
