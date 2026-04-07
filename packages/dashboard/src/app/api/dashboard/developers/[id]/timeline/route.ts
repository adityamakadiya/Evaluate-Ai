import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const VALID_FILTERS = new Set(['ai', 'code', 'meeting', 'task']);

const FILTER_EVENT_TYPES: Record<string, string[]> = {
  ai: ['ai_prompt', 'ai_response', 'ai_session'],
  code: ['commit', 'pr_opened', 'pr_merged', 'review'],
  meeting: ['meeting'],
  task: ['task_completed', 'task_assigned'],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { searchParams } = request.nextUrl;

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
    const filterType = searchParams.get('type');

    // Get the developer's user_id from team_members
    const { data: member } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('id', id)
      .single();

    const developerId = member?.user_id ?? id;

    let query = supabase
      .from('activity_timeline')
      .select('id, event_type, title, description, developer_name, metadata, created_at', { count: 'exact' })
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false });

    // Apply filter
    if (filterType && VALID_FILTERS.has(filterType)) {
      const eventTypes = FILTER_EVENT_TYPES[filterType];
      if (eventTypes) {
        query = query.in('event_type', eventTypes);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count } = await query;

    const events = (data ?? []).map(e => ({
      id: e.id,
      eventType: e.event_type,
      title: e.title,
      description: e.description,
      developerName: e.developer_name,
      metadata: e.metadata,
      createdAt: e.created_at,
    }));

    return NextResponse.json({ events, total: count ?? 0 });
  } catch (err) {
    console.error('Developer timeline API error:', err);
    return NextResponse.json({ events: [], total: 0 });
  }
}
