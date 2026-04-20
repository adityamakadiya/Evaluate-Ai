import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/dashboard/developers/[id]/link-accounts
 * Returns linked external accounts for a developer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Developers can view their own, managers/owners can view anyone
  if (ctx.memberId !== id && !requireRole(ctx, 'owner', 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, email, github_username, fireflies_display_names')
    .eq('id', id)
    .eq('team_id', ctx.teamId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    email: data.email,
    githubUsername: data.github_username,
    firefliesDisplayNames: data.fireflies_display_names ?? [],
  });
}

/**
 * PUT /api/dashboard/developers/[id]/link-accounts
 * Update linked external accounts for a developer.
 * Body: { githubUsername?, email?, firefliesDisplayNames?: string[] }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Developers can update their own, managers/owners can update anyone
  if (ctx.memberId !== id && !requireRole(ctx, 'owner', 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.githubUsername === 'string') {
    update.github_username = body.githubUsername.trim() || null;
  }

  if (typeof body.email === 'string' && body.email.trim()) {
    update.email = body.email.trim();
  }

  if (Array.isArray(body.firefliesDisplayNames)) {
    update.fireflies_display_names = body.firefliesDisplayNames
      .map((n: unknown) => (typeof n === 'string' ? n.trim() : ''))
      .filter(Boolean);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('team_members')
    .update(update)
    .eq('id', id)
    .eq('team_id', ctx.teamId)
    .select('id, name, email, github_username, fireflies_display_names')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    email: data.email,
    githubUsername: data.github_username,
    firefliesDisplayNames: data.fireflies_display_names ?? [],
  });
}
