import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 500 }
      );
    }

    const teamId = request.nextUrl.searchParams.get('team_id');
    if (!teamId) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      );
    }

    // Encode team_id as state parameter (base64 for URL safety)
    const state = Buffer.from(JSON.stringify({ team_id: teamId })).toString('base64url');

    const redirectUri = new URL('/api/integrations/github/callback', request.nextUrl.origin).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo',
      state,
    });

    const githubOAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(githubOAuthUrl);
  } catch (err) {
    console.error('GitHub connect error:', err);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub connection' },
      { status: 500 }
    );
  }
}
