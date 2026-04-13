import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { listInstallationRepos } from '@/lib/github-app';

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('team_id');
    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('team_id', teamId)
      .eq('provider', 'github')
      .eq('status', 'active')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'GitHub not connected', repos: [] }, { status: 404 });
    }

    const config = integration.config as Record<string, unknown> | null;
    const installationId = config?.installation_id as number | undefined;

    // If we have an installation ID, fetch live repos from GitHub App
    if (installationId) {
      try {
        const repos = await listInstallationRepos(installationId);
        const repoList = repos.map((r) => ({
          name: r.name,
          fullName: r.full_name,
          defaultBranch: r.default_branch,
          language: r.language,
          private: r.private,
          updatedAt: r.updated_at,
        }));

        // Update cached repos in config
        await supabase
          .from('integrations')
          .update({
            config: { ...config, repos: repoList },
          })
          .eq('team_id', teamId)
          .eq('provider', 'github');

        return NextResponse.json({ repos: repoList, cached: false });
      } catch (err) {
        console.error('Failed to fetch live repos:', err);
        // Fall through to cached repos
      }
    }

    // Fallback: return cached repos from config
    const cachedRepos = (config?.repos as Array<Record<string, unknown>>) ?? [];
    const repos = cachedRepos.map((r) => ({
      name: r.name,
      fullName: r.full_name ?? r.fullName,
      defaultBranch: r.default_branch ?? r.defaultBranch,
      language: r.language,
      private: r.private,
      updatedAt: r.updated_at ?? r.updatedAt,
    }));

    return NextResponse.json({ repos, cached: true });
  } catch (err) {
    console.error('GitHub repos error:', err);
    return NextResponse.json({ error: 'Failed to fetch repos', repos: [] }, { status: 500 });
  }
}
