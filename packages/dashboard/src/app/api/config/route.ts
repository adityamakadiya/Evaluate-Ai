import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

function getTeamId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('team_id')
    || request.headers.get('x-team-id')
    || null;
}

export async function GET(request: NextRequest) {
  const teamId = getTeamId(request);

  if (!teamId) {
    return NextResponse.json(
      { error: 'team_id is required (pass as query param or x-team-id header)' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('config')
      .select('key, value, updated_at')
      .eq('team_id', teamId)
      .order('key');

    if (error) {
      console.error('Config GET error:', error);
      return NextResponse.json({});
    }

    const config: Record<string, { value: string; updatedAt: string }> = {};
    for (const row of data ?? []) {
      config[row.key] = { value: row.value, updatedAt: row.updated_at };
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error('Config API error:', err);
    return NextResponse.json({});
  }
}

export async function PUT(request: NextRequest) {
  const teamId = getTeamId(request);

  if (!teamId) {
    return NextResponse.json(
      { error: 'team_id is required (pass as query param or x-team-id header)' },
      { status: 400 }
    );
  }

  let body: { key?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || typeof key !== 'string' || value === undefined || typeof value !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include "key" (string) and "value" (string)' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('config')
      .upsert(
        { team_id: teamId, key, value, updated_at: now },
        { onConflict: 'team_id,key' }
      );

    if (error) {
      console.error('Config PUT error:', error);
      return NextResponse.json(
        { error: 'Database write failed' },
        { status: 503 }
      );
    }

    return NextResponse.json({ key, value, updatedAt: now });
  } catch (err) {
    console.error('Config PUT error:', err);
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    );
  }
}
