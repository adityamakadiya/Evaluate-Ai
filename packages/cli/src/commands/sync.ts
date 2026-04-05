import { Command } from 'commander';
import chalk from 'chalk';
import { getSupabase, syncToSupabase } from '@evaluateai/core';
import { printHeader } from '../utils/display.js';

export const syncCommand = new Command('sync')
  .description('Sync local data to Supabase')
  .action(async () => {
    printHeader('Sync');

    const client = getSupabase();
    if (!client) {
      console.log(chalk.red('  Supabase is not configured.'));
      console.log(chalk.gray('  Run `evalai init --supabase` to set up cloud sync.'));
      console.log('');
      return;
    }

    console.log('  Syncing to Supabase...');
    const result = await syncToSupabase();

    if (result.success) {
      console.log(chalk.green(`  ✓ Synced ${result.synced} records`));
    } else {
      console.log(chalk.red(`  ✗ Sync failed: ${result.error}`));
      if (result.synced > 0) {
        console.log(chalk.yellow(`  Partially synced: ${result.synced} records`));
      }
    }
    console.log('');
  });
