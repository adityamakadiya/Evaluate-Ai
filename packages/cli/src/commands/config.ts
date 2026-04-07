import { Command } from 'commander';
import chalk from 'chalk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { printHeader } from '../utils/display.js';

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const VALID_KEYS: Record<string, { validate: (v: string) => boolean; description: string }> = {
  privacy: {
    validate: (v) => ['off', 'local', 'hash'].includes(v),
    description: 'Privacy mode: off | local | hash',
  },
  scoring: {
    validate: (v) => ['heuristic', 'llm'].includes(v),
    description: 'Scoring mode: heuristic | llm',
  },
  threshold: {
    validate: (v) => {
      const n = Number(v);
      return !isNaN(n) && n >= 0 && n <= 100;
    },
    description: 'Score threshold: 0-100',
  },
  'dashboard-port': {
    validate: (v) => {
      const n = Number(v);
      return !isNaN(n) && n >= 1024 && n <= 65535;
    },
    description: 'Dashboard port: 1024-65535',
  },
};

/**
 * Map CLI key names to DB key names (underscores).
 */
function toDbKey(key: string): string {
  return key.replace(/-/g, '_');
}

async function showConfig(supabase: SupabaseClient): Promise<void> {
  const { data: rows, error } = await supabase
    .from('config')
    .select('key, value');

  printHeader('Configuration');

  if (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(chalk.gray('  No configuration found. Run `evalai config set <key> <value>` to add.'));
    return;
  }

  for (const row of rows) {
    const displayKey = row.key.replace(/_/g, '-');
    console.log(`  ${chalk.cyan(displayKey.padEnd(20))} ${chalk.white(row.value)}`);
  }
  console.log('');
}

async function setConfig(supabase: SupabaseClient, key: string, value: string): Promise<void> {
  const validator = VALID_KEYS[key];
  if (!validator) {
    console.log(chalk.red(`  Unknown config key: ${key}`));
    console.log(chalk.gray(`  Valid keys: ${Object.keys(VALID_KEYS).join(', ')}`));
    return;
  }

  if (!validator.validate(value)) {
    console.log(chalk.red(`  Invalid value for ${key}: ${value}`));
    console.log(chalk.gray(`  ${validator.description}`));
    return;
  }

  const dbKey = toDbKey(key);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('config')
    .upsert(
      { key: dbKey, value, updated_at: now },
      { onConflict: 'key' }
    );

  if (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    return;
  }

  console.log(chalk.green(`  ${key} = ${value}`));
}

export const configCommand = new Command('config')
  .description('View or update configuration')
  .argument('[action]', '"set" to update a config value')
  .argument('[key]', 'Config key to set')
  .argument('[value]', 'Config value')
  .action(async (action?: string, key?: string, value?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      console.log(chalk.red('  Supabase not configured.'));
      console.log(chalk.gray('  Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'));
      return;
    }

    if (!action) {
      await showConfig(supabase);
      return;
    }

    if (action === 'set') {
      if (!key || !value) {
        console.log(chalk.red('  Usage: evalai config set <key> <value>'));
        console.log('');
        console.log('  Available keys:');
        for (const [k, v] of Object.entries(VALID_KEYS)) {
          console.log(`    ${chalk.cyan(k.padEnd(20))} ${chalk.gray(v.description)}`);
        }
        return;
      }
      await setConfig(supabase, key, value);
      return;
    }

    // If action is not "set", treat it as showing config
    console.log(chalk.red(`  Unknown action: ${action}`));
    console.log(chalk.gray('  Usage: evalai config [set <key> <value>]'));
  });
