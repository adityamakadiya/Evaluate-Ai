import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/integrations/disconnect
 * Disconnects an integration by marking it as revoked.
 *
 * Body: { team_id: string, provider: 'github' | 'fireflies' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team_id: teamId, provider } = body;

    if (!teamId || !provider) {
      return NextResponse.json(
        { error: 'team_id and provider are required' },
        { status: 400 }
      );
    }

    if (!['github', 'fireflies'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('team_id', teamId)
      .eq('provider', provider)
      .eq('status', 'active')
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: `${provider} is not connected` },
        { status: 404 }
      );
    }

    // Mark as revoked (soft delete — preserves history)
    await supabase
      .from('integrations')
      .update({
        status: 'revoked',
        access_token: '',
        config: { disconnected_at: new Date().toISOString() },
      })
      .eq('id', integration.id);

    return NextResponse.json({ success: true, provider });
  } catch (err) {
    console.error('Disconnect error:', err);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
