// ============================================================
// Shared handler utilities for Claude Code hooks
// ============================================================

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

/**
 * Read JSON from stdin (Claude Code sends hook data as JSON on stdin).
 */
export async function readStdinJSON<T = Record<string, unknown>>(): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string | Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    process.stdin.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        if (!raw) {
          resolve({} as T);
          return;
        }
        resolve(JSON.parse(raw) as T);
      } catch (err) {
        reject(err);
      }
    });
    process.stdin.on('error', reject);

    // If stdin is already ended (piped and closed), force end
    if (process.stdin.readableEnded) {
      resolve({} as T);
    }
  });
}

/**
 * Write JSON response to stdout (for Claude Code to read).
 */
export function writeOutput(data: unknown): void {
  process.stdout.write(JSON.stringify(data) + '\n');
}

/**
 * Extract git repo URL and branch from a directory.
 */
export function getGitInfo(cwd: string): { gitRepo: string | null; gitBranch: string | null } {
  let gitRepo: string | null = null;
  let gitBranch: string | null = null;

  try {
    gitRepo = execSync('git config --get remote.origin.url', {
      cwd,
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim() || null;
  } catch {
    // Not a git repo or no remote
  }

  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim() || null;
  } catch {
    // Not a git repo
  }

  return { gitRepo, gitBranch };
}

/**
 * SHA-256 hash of text.
 */
export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Safe exit: always exit 0 so we never break Claude Code.
 * On any error, still exits 0.
 */
export function safeExit(code: number = 0): never {
  try {
    process.exit(0);
  } catch {
    process.exit(0);
  }
}
