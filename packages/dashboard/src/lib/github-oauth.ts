import { getSupabaseAdmin } from './supabase-server';

// ---------- Types ----------

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language: string | null;
  private: boolean;
  updated_at: string;
  owner: {
    login: string;
    type: string; // 'User' | 'Organization'
  };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  oauthUser: string | null;
}

interface TokenRefreshResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

// ---------- Configuration ----------

function getOAuthConfig() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be set'
    );
  }

  return { clientId, clientSecret };
}

/**
 * Check if GitHub OAuth environment is configured.
 */
export function isGitHubOAuthConfigured(): boolean {
  return !!(
    process.env.GITHUB_OAUTH_CLIENT_ID &&
    process.env.GITHUB_OAUTH_CLIENT_SECRET
  );
}

// ---------- OAuth URLs ----------

/**
 * Build the GitHub OAuth authorization URL.
 * Scopes: repo (full repo access), read:org (list user's orgs).
 */
export function buildAuthorizationUrl(state: string): string {
  const { clientId } = getOAuthConfig();
  const scopes = 'repo read:org';

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    state,
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}

// ---------- Token Exchange ----------

/**
 * Exchange an OAuth authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string;
}> {
  const { clientId, clientSecret } = getOAuthConfig();

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed (${response.status})`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    tokenType: data.token_type,
  };
}

/**
 * Refresh an expired OAuth token using the refresh token.
 * Only applicable if the GitHub App has token expiration enabled.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}> {
  const { clientId, clientSecret } = getOAuthConfig();

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token refresh failed (${response.status})`);
  }

  const data: TokenRefreshResult & { error?: string; error_description?: string; expires_in?: number } =
    await response.json();

  if (data.error) {
    throw new Error(`GitHub refresh error: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

// ---------- Token Management ----------

/**
 * Retrieve a valid OAuth token for a team.
 * Automatically refreshes if expired and a refresh token is available.
 */
export async function getValidToken(teamId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: integration } = await supabase
    .from('integrations')
    .select('id, access_token, refresh_token, config')
    .eq('team_id', teamId)
    .eq('provider', 'github')
    .eq('status', 'active')
    .single();

  if (!integration?.access_token) {
    throw new Error('GitHub is not connected. Please connect via OAuth first.');
  }

  const config = integration.config as Record<string, unknown> | null;
  const expiresAt = config?.token_expires_at as string | null;

  // If no expiry set, token doesn't expire (classic OAuth apps)
  if (!expiresAt) {
    return integration.access_token;
  }

  // Check if token is still valid (with 5-minute buffer)
  const expiryMs = new Date(expiresAt).getTime();
  if (expiryMs > Date.now() + 5 * 60 * 1000) {
    return integration.access_token;
  }

  // Token expired — attempt refresh
  if (!integration.refresh_token) {
    throw new Error('GitHub token expired and no refresh token available. Please reconnect.');
  }

  const refreshed = await refreshAccessToken(integration.refresh_token);

  const updatedConfig = {
    ...config,
    token_expires_at: refreshed.expiresIn
      ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
      : null,
  };

  await supabase
    .from('integrations')
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken ?? integration.refresh_token,
      config: updatedConfig,
    })
    .eq('id', integration.id);

  return refreshed.accessToken;
}

// ---------- GitHub API Helpers ----------

/**
 * Fetch the authenticated GitHub user's profile.
 */
export async function fetchAuthenticatedUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user (${response.status})`);
  }

  return response.json();
}

/**
 * List ALL repositories accessible to the authenticated user.
 * Includes: owned, collaborator, and organization member repos.
 */
export async function discoverAllRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      per_page: '100',
      page: String(page),
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',
      direction: 'desc',
    });

    const response = await fetch(
      `https://api.github.com/user/repos?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) break;

    const pageRepos = (await response.json()) as GitHubRepo[];
    repos.push(...pageRepos);

    if (pageRepos.length < 100) break;
    page++;
  }

  return repos;
}

/**
 * Fetch recent commits for a repo using OAuth token.
 */
export async function fetchRecentCommits(
  token: string,
  repoFullName: string,
  since: string,
  perPage = 100
): Promise<Record<string, unknown>[]> {
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
 * Fetch recent pull requests for a repo using OAuth token.
 */
export async function fetchRecentPRs(
  token: string,
  repoFullName: string,
  since: string,
  perPage = 50
): Promise<Record<string, unknown>[]> {
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

  // GitHub doesn't support `since` on PRs — filter client-side
  const sinceDate = new Date(since).getTime();
  return (prs as Array<Record<string, unknown>>).filter((pr) => {
    const updatedAt = new Date(pr.updated_at as string).getTime();
    return updatedAt >= sinceDate;
  });
}

// ---------- Team Lookup ----------

/**
 * Get the list of tracked repos for a team from the integration config.
 */
export async function getTrackedRepos(teamId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('team_id', teamId)
    .eq('provider', 'github')
    .eq('status', 'active')
    .single();

  if (!integration) return [];

  const config = integration.config as Record<string, unknown> | null;
  return (config?.tracked_repos as string[]) ?? [];
}

/**
 * Get the OAuth username for a team's GitHub connection.
 */
export async function getOAuthUsername(teamId: string): Promise<string | null> {
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
  return (config?.oauth_user as string) ?? null;
}
