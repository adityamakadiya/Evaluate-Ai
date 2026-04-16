import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { exchangeCodeForTokens, fetchAuthenticatedUser } from '@/lib/github-oauth';

/**
 * GET /api/integrations/github/callback
 *
 * GitHub redirects here after the user authorizes the OAuth App.
 * Exchanges the code for tokens, stores in DB, redirects to integrations page.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    // User denied access
    if (error) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=oauth_denied', request.nextUrl.origin)
      );
    }

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

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the authenticated user's profile
    let githubUser: { login: string } | null = null;
    try {
      githubUser = await fetchAuthenticatedUser(tokens.accessToken);
    } catch (err) {
      console.error('Failed to fetch GitHub user:', err);
    }

    // Build config
    const config: Record<string, unknown> = {
      oauth_user: githubUser?.login ?? null,
      connected_at: new Date().toISOString(),
      tracked_repos: [],
      token_expires_at: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : null,
    };

    // Store integration in Supabase
    const supabase = getSupabaseAdmin();

    const integrationData = {
      team_id: teamId,
      provider: 'github',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? '',
      config,
      status: 'active',
      last_sync_at: new Date().toISOString(),
    };

    // Upsert: update if already exists for this team
    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert(integrationData, { onConflict: 'team_id,provider' });

    if (upsertError) {
      // Fallback: manual insert/update
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
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken ?? '',
            config,
            status: 'active',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('integrations').insert(integrationData);
      }
    }

    // Redirect to integrations page with success — user will pick repos next
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
