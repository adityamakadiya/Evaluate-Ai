import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/dashboard/meetings/search?q=keyword
 *
 * Search meeting transcripts, titles, and summaries.
 * Returns matching meetings with context snippets.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Escape special ILIKE characters
    const escaped = query.replace(/[%_\\]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;

    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, title, date, duration_minutes, summary, transcript, participants, action_items_count')
      .eq('team_id', ctx.teamId)
      .or(`title.ilike.${pattern},transcript.ilike.${pattern},summary.ilike.${pattern}`)
      .order('date', { ascending: false })
      .limit(20);

    const results = (meetings ?? []).map((m) => {
      // Extract snippet from transcript around the keyword
      const snippet = extractSnippet(m.transcript, query) ??
                      extractSnippet(m.summary, query) ??
                      (m.summary?.slice(0, 200) ?? null);

      return {
        meetingId: m.id,
        title: m.title,
        date: m.date,
        durationMinutes: m.duration_minutes,
        participantCount: Array.isArray(m.participants) ? m.participants.length : 0,
        actionItemsCount: m.action_items_count ?? 0,
        snippet,
      };
    });

    return NextResponse.json({ query, results });
  } catch (err) {
    console.error('Meeting search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

/**
 * Extract a text snippet around the first occurrence of the keyword.
 */
function extractSnippet(text: string | null, keyword: string): string | null {
  if (!text) return null;

  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + keyword.length + 80);

  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}
