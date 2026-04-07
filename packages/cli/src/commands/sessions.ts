import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SessionAnalysis } from 'evaluateai-core';
import {
  formatCost,
  formatTokens,
  formatScore,
  formatDuration,
  printHeader,
} from '../utils/display.js';

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Print a table of recent sessions.
 */
async function listSessions(supabase: SupabaseClient, limit: number): Promise<void> {
  const { data: rows, error } = await supabase
    .from('ai_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(chalk.gray('  No sessions found.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Project'),
      chalk.cyan('Score'),
      chalk.cyan('Turns'),
      chalk.cyan('Tokens'),
      chalk.cyan('Cost'),
      chalk.cyan('When'),
    ],
    style: { head: [], border: ['gray'] },
    colWidths: [12, 22, 8, 8, 10, 10, 14],
  });

  for (const s of rows) {
    const project = s.project_dir
      ? (s.project_dir.split('/').pop() ?? s.project_dir)
      : '--';
    const score = s.avg_prompt_score != null ? formatScore(s.avg_prompt_score) : chalk.gray('--');
    const tokens = formatTokens((s.total_input_tokens ?? 0) + (s.total_output_tokens ?? 0));
    const cost = formatCost(s.total_cost_usd ?? 0);
    const when = formatDuration(Date.now() - new Date(s.started_at).getTime());

    table.push([
      chalk.dim(s.id.slice(0, 10)),
      project.length > 20 ? project.slice(0, 19) + '…' : project,
      score,
      String(s.total_turns ?? 0),
      tokens,
      cost,
      chalk.dim(when),
    ]);
  }

  printHeader('Recent Sessions');
  console.log(table.toString());
  console.log('');
}

/**
 * Print a detailed view of a single session.
 */
async function showSession(supabase: SupabaseClient, sessionId: string): Promise<void> {
  // Find session (match by prefix using ilike)
  const { data: matches } = await supabase
    .from('ai_sessions')
    .select('*')
    .ilike('id', `${sessionId}%`)
    .limit(1);

  const session = matches?.[0];

  if (!session) {
    console.log(chalk.red(`  Session not found: ${sessionId}`));
    return;
  }

  // Session header
  printHeader(`Session ${session.id.slice(0, 10)}`);
  const project = session.project_dir
    ? session.project_dir.split('/').pop() ?? session.project_dir
    : '--';
  console.log(`  Project:     ${chalk.white(project)}`);
  console.log(`  Model:       ${chalk.white(session.model ?? '--')}`);
  console.log(`  Started:     ${chalk.white(session.started_at)}`);
  console.log(`  Ended:       ${chalk.white(session.ended_at ?? 'in progress')}`);
  console.log(`  Turns:       ${chalk.white(String(session.total_turns ?? 0))}`);
  console.log(`  Tokens:      ${chalk.white(formatTokens((session.total_input_tokens ?? 0) + (session.total_output_tokens ?? 0)))}`);
  console.log(`  Cost:        ${chalk.white(formatCost(session.total_cost_usd ?? 0))}`);
  console.log(`  Avg Score:   ${session.avg_prompt_score != null ? formatScore(session.avg_prompt_score) : chalk.gray('--')}`);
  console.log(`  Efficiency:  ${session.efficiency_score != null ? formatScore(session.efficiency_score) : chalk.gray('--')}`);

  // LLM analysis
  if (session.analysis) {
    try {
      const analysis: SessionAnalysis = typeof session.analysis === 'string'
        ? JSON.parse(session.analysis)
        : session.analysis;
      console.log('');
      console.log(chalk.bold('  Analysis'));
      console.log(`  ${chalk.white(analysis.summary)}`);
      if (analysis.spiralDetected) {
        console.log(chalk.red(`  ⚠ Spiral detected at turn ${analysis.spiralStartTurn}`));
      }
      if (analysis.topTip) {
        console.log(chalk.cyan(`  💡 ${analysis.topTip}`));
      }
      if (analysis.wastedTurns.length > 0) {
        console.log(chalk.yellow(`  Wasted turns: ${analysis.wastedTurns.map(w => `#${w.turn}`).join(', ')}`));
      }
    } catch {
      // skip malformed analysis
    }
  }

  // Turn-by-turn detail
  const { data: turnRows } = await supabase
    .from('ai_turns')
    .select('*')
    .eq('session_id', session.id)
    .order('turn_number', { ascending: true });

  if (turnRows && turnRows.length > 0) {
    console.log('');
    console.log(chalk.bold('  Turn-by-Turn'));

    const table = new Table({
      head: [
        chalk.cyan('#'),
        chalk.cyan('Score'),
        chalk.cyan('Tokens'),
        chalk.cyan('Tools'),
        chalk.cyan('Suggestion'),
      ],
      style: { head: [], border: ['gray'] },
      colWidths: [5, 8, 10, 8, 45],
    });

    for (const t of turnRows) {
      const score = t.heuristic_score != null ? formatScore(t.heuristic_score) : chalk.gray('--');
      const tokens = t.response_tokens_est != null ? formatTokens(t.response_tokens_est) : '--';

      let toolCount = 0;
      if (t.tool_calls) {
        try {
          const calls = typeof t.tool_calls === 'string' ? JSON.parse(t.tool_calls) : t.tool_calls;
          toolCount = Array.isArray(calls) ? calls.length : 0;
        } catch { /* ignore */ }
      }

      const suggestion = t.suggestion_text
        ? (t.suggestion_text.length > 42 ? t.suggestion_text.slice(0, 39) + '...' : t.suggestion_text)
        : chalk.gray('--');

      table.push([
        String(t.turn_number),
        score,
        tokens,
        String(toolCount),
        suggestion,
      ]);
    }

    console.log(table.toString());
  }

  // Tool events
  const { data: events } = await supabase
    .from('ai_tool_events')
    .select('*')
    .eq('session_id', session.id);

  if (events && events.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Tool Calls (${events.length})`));
    const toolCounts: Record<string, number> = {};
    for (const e of events) {
      toolCounts[e.tool_name] = (toolCounts[e.tool_name] ?? 0) + 1;
    }
    const sorted = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted.slice(0, 10)) {
      console.log(`    ${chalk.white(name.padEnd(25))} ${count}x`);
    }
  }

  console.log('');
}

export const sessionsCommand = new Command('sessions')
  .description('List and inspect sessions')
  .argument('[id]', 'Session ID to show details for')
  .action(async (id?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      console.log(chalk.red('  Supabase not configured.'));
      console.log(chalk.gray('  Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'));
      return;
    }

    if (id) {
      await showSession(supabase, id);
    } else {
      await listSessions(supabase, 20);
    }
  });
