import { SignJWT, importPKCS8 } from 'jose';
import * as crypto from 'crypto';
import { getSupabaseAdmin } from './supabase-server';

// ---------- Types ----------

interface InstallationToken {
  token: string;
  expiresAt: number; // Unix timestamp ms
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language: string | null;
  private: boolean;
  updated_at: string;
}

// ---------- Token Cache ----------

// In-memory cache: installationId -> { token, expiresAt }
const tokenCache = new Map<number, InstallationToken>();

// ---------- JWT ----------

/**
 * Generate a JWT for authenticating as the GitHub App.
 * Used to request installation access tokens.
 * JWTs expire after 10 minutes (GitHub maximum).
 */
async function generateAppJWT(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPem = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKeyPem) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
  }

  // Handle escaped newlines from env vars
  const normalizedKey = privateKeyPem.replace(/\\n/g, '\n');

  // GitHub generates PKCS#1 keys (BEGIN RSA PRIVATE KEY)
  // jose's importPKCS8 needs PKCS#8 (BEGIN PRIVATE KEY)
  // Use Node's crypto to handle both formats
  const keyObject = crypto.createPrivateKey(normalizedKey);
  const pkcs8Pem = keyObject.export({ type: 'pkcs8', format: 'pem' }) as string;
  const privateKey = await importPKCS8(pkcs8Pem, 'RS256');

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now - 60) // 60 seconds in the past to account for clock drift
    .setExpirationTime(now + 600) // 10 minutes
    .setIssuer(appId)
    .sign(privateKey);

  return jwt;
}

// ---------- Installation Token ----------

/**
 * Get an installation access token for a specific installation.
 * Tokens are cached and auto-refreshed when expired.
 * Installation tokens last 1 hour.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  // Check cache (with 5 min buffer before expiry)
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const jwt = await generateAppJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get installation token:', response.status, error);
    throw new Error(`GitHub App token request failed (${response.status})`);
  }

  const data = await response.json();
  const token = data.token as string;
  const expiresAt = new Date(data.expires_at as string).getTime();

  tokenCache.set(installationId, { token, expiresAt });

  return token;
}

// ---------- API Helpers ----------

/**
 * List repositories accessible to a GitHub App installation.
 */
export async function listInstallationRepos(installationId: number): Promise<GitHubRepo[]> {
  const token = await getInstallationToken(installationId);
  const repos: GitHubRepo[] = [];
  let page = 1;

  // Paginate (GitHub returns max 100 per page)
  while (true) {
    const response = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) break;

    const data = await response.json();
    const pageRepos = (data.repositories ?? []) as GitHubRepo[];
    repos.push(...pageRepos);

    if (pageRepos.length < 100) break;
    page++;
  }

  return repos;
}

/**
 * Fetch recent commits for a repo since a given date.
 */
export async function fetchRecentCommits(
  installationId: number,
  repoFullName: string,
  since: string,
  perPage: number = 100
): Promise<Record<string, unknown>[]> {
  const token = await getInstallationToken(installationId);

  const params = new URLSearchParams({
    since,
    per_page: String(perPage),
  });

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/commits?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) return [];
  return response.json();
}

/**
 * Fetch recent pull requests for a repo.
 */
export async function fetchRecentPRs(
  installationId: number,
  repoFullName: string,
  since: string,
  perPage: number = 50
): Promise<Record<string, unknown>[]> {
  const token = await getInstallationToken(installationId);

  const params = new URLSearchParams({
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: String(perPage),
  });

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) return [];

  const prs = await response.json();

  // Filter by date client-side (GitHub doesn't support `since` on PRs)
  const sinceDate = new Date(since).getTime();
  return (prs as Array<Record<string, unknown>>).filter((pr) => {
    const updatedAt = new Date(pr.updated_at as string).getTime();
    return updatedAt >= sinceDate;
  });
}

// ---------- Team Lookup ----------

/**
 * Find the team associated with a GitHub App installation.
 */
export async function findTeamByInstallation(
  installationId: number
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: integrations } = await supabase
    .from('integrations')
    .select('team_id, config')
    .eq('provider', 'github')
    .eq('status', 'active');

  if (!integrations) return null;

  for (const integration of integrations) {
    const config = integration.config as Record<string, unknown> | null;
    if (config?.installation_id === installationId) {
      return integration.team_id;
    }
  }

  return null;
}

/**
 * Get the installation ID for a team.
 */
export async function getTeamInstallationId(teamId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();

  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('team_id', teamId)
    .eq('provider', 'github')
    .eq('status', 'active')
    .single();

  if (!integration) return null;

  const config = integration.config as Record<string, unknown> | null;
  return (config?.installation_id as number) ?? null;
}

/**
 * Check if GitHub App environment is configured.
 */
export function isGitHubAppConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_WEBHOOK_SECRET
  );
}

/**
 * Get the GitHub App slug for installation URL.
 */
export function getAppSlug(): string {
  return process.env.GITHUB_APP_SLUG ?? 'evaluateai';
}
