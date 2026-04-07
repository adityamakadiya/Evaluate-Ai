import { Command } from 'commander';
import chalk from 'chalk';
import { printHeader } from '../utils/display.js';

export const syncCommand = new Command('sync')
  .description('Sync local data to Supabase (deprecated)')
  .action(async () => {
    printHeader('Sync');

    console.log(chalk.green('  All data is stored directly in Supabase. No sync needed.'));
    console.log('');
    console.log(chalk.gray('  Hooks write to Supabase in real time.'));
    console.log(chalk.gray('  If Supabase is not configured, set SUPABASE_URL and SUPABASE_ANON_KEY'));
    console.log(chalk.gray('  in ~/.evaluateai-v2/.env or export them in your shell.'));
    console.log('');
  });
