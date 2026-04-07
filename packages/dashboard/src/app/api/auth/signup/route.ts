import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-server';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: Request) {
  try {
    const { email, password, name, teamName } = await request.json();

    if (!email || !password || !name || !teamName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, teamName' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const admin = getSupabaseAdmin();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create team with admin client
    const slug = slugify(teamName);
    const { data: team, error: teamError } = await admin
      .from('teams')
      .insert({ name: teamName, slug })
      .select()
      .single();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }

    // Create team_member with owner role
    const { data: member, error: memberError } = await admin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        email,
        name,
        role: 'owner',
      })
      .select()
      .single();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name,
      },
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
      member: {
        id: member.id,
        role: member.role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
