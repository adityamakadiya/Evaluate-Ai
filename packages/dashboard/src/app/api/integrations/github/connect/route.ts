import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getAppSlug, isGitHubAppConfigured } from '@/lib/github-app';

/**
 * GET /api/integrations/github/connect?team_id=xxx
 *
 * Redirects the user to GitHub's App installation page.
 * GitHub handles repo selection natively — no manual webhook setup needed.
 */
export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('team_id');
    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    if (!isGitHubAppConfigured()) {
      return NextResponse.json(
        { error: 'GitHub App not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_WEBHOOK_SECRET.' },
        { status: 500 }
      );
    }

    // Encode team_id in state (GitHub passes it back in callback)
    const state = Buffer.from(JSON.stringify({ team_id: teamId })).toString('base64url');
    const appSlug = getAppSlug();

    // Redirect to GitHub's native App installation page
    const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${state}`;

    return NextResponse.redirect(installUrl);
  } catch (err) {
    console.error('GitHub connect error:', err);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub connection' },
      { status: 500 }
    );
  }
}
