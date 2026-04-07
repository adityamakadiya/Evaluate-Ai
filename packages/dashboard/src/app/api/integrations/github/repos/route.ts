import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('team_id');
    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get the GitHub integration for this team
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token, config')
      .eq('team_id', teamId)
      .eq('provider', 'github')
      .eq('status', 'active')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'GitHub not connected', repos: [] }, { status: 404 });
    }

    // Fetch fresh repos from GitHub API
    const response = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated',
      {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // If token is invalid, return cached repos from config
      const config = integration.config as Record<string, unknown> | null;
      const cachedRepos = (config?.repos as Array<Record<string, unknown>>) ?? [];
      return NextResponse.json({
        repos: cachedRepos,
        cached: true,
      });
    }

    const rawRepos = await response.json();
    const repos = Array.isArray(rawRepos)
      ? rawRepos.map((r: Record<string, unknown>) => ({
          name: r.name,
          fullName: r.full_name,
          defaultBranch: r.default_branch,
          language: r.language,
          private: r.private,
          updatedAt: r.updated_at,
        }))
      : [];

    return NextResponse.json({ repos, cached: false });
  } catch (err) {
    console.error('GitHub repos error:', err);
    return NextResponse.json({ error: 'Failed to fetch repos', repos: [] }, { status: 500 });
  }
}
