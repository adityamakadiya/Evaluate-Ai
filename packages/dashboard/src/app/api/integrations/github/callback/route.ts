import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { listInstallationRepos } from '@/lib/github-app';

/**
 * GET /api/integrations/github/callback
 *
 * GitHub redirects here after the user installs the GitHub App.
 * Receives: installation_id, setup_action, state (our team_id)
 */
export async function GET(request: NextRequest) {
  try {
    const installationId = request.nextUrl.searchParams.get('installation_id');
    const setupAction = request.nextUrl.searchParams.get('setup_action');
    const state = request.nextUrl.searchParams.get('state');

    // Handle app installation being removed
    if (setupAction === 'delete') {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?info=github_removed', request.nextUrl.origin)
      );
    }

    if (!installationId || !state) {
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

    const installId = parseInt(installationId, 10);

    // Fetch installed repos using the App installation token
    let repoList: Array<Record<string, unknown>> = [];
    try {
      const repos = await listInstallationRepos(installId);
      repoList = repos.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        default_branch: r.default_branch,
        language: r.language,
        private: r.private,
      }));
    } catch (err) {
      console.error('Failed to fetch repos after install:', err);
      // Continue — we'll fetch repos later
    }

    // Store integration in Supabase
    const supabase = getSupabaseAdmin();

    const integrationData = {
      team_id: teamId,
      provider: 'github',
      access_token: '', // GitHub App uses installation tokens, not stored user tokens
      config: {
        installation_id: installId,
        repos: repoList,
        connected_at: new Date().toISOString(),
        setup_action: setupAction ?? 'install',
      },
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
            access_token: '',
            config: integrationData.config,
            status: 'active',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('integrations').insert(integrationData);
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
