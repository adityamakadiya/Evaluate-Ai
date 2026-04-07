import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_params', request.nextUrl.origin)
      );
    }

    // Decode state to get team_id
    let teamId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      teamId = decoded.team_id;
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', request.nextUrl.origin)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error_description);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=oauth_failed', request.nextUrl.origin)
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch user's repos
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const repos = await reposResponse.json();
    const repoList = Array.isArray(repos)
      ? repos.map((r: Record<string, unknown>) => ({
          name: r.name,
          full_name: r.full_name,
          default_branch: r.default_branch,
          language: r.language,
          private: r.private,
        }))
      : [];

    // Store integration in Supabase
    const supabase = getSupabaseAdmin();

    // Upsert: if integration already exists for this team+provider, update it
    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert(
        {
          team_id: teamId,
          provider: 'github',
          access_token: accessToken,
          config: { repos: repoList, connected_at: new Date().toISOString() },
          status: 'active',
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,provider' }
      );

    if (upsertError) {
      // If upsert fails due to no unique constraint, try insert/update manually
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('team_id', teamId)
        .eq('provider', 'github')
        .single();

      if (existing) {
        await supabase
          .from('integrations')
          .update({
            access_token: accessToken,
            config: { repos: repoList, connected_at: new Date().toISOString() },
            status: 'active',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('integrations').insert({
          team_id: teamId,
          provider: 'github',
          access_token: accessToken,
          config: { repos: repoList, connected_at: new Date().toISOString() },
          status: 'active',
          last_sync_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=github_connected', request.nextUrl.origin)
    );
  } catch (err) {
    console.error('GitHub callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=callback_failed', request.nextUrl.origin)
    );
  }
}
