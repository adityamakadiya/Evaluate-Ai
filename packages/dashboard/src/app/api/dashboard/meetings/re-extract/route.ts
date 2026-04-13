import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  extractTasksFromTranscript,
  persistExtractedTasks,
} from '@/lib/services/task-extractor';

/**
 * POST /api/dashboard/meetings/re-extract
 * Re-runs AI task extraction on meetings that have 0 action items.
 * Useful when the AI provider was misconfigured during initial sync.
 *
 * Body: { team_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team_id: teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find meetings with no tasks extracted
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, title, transcript, action_items_count')
      .eq('team_id', teamId)
      .eq('action_items_count', 0)
      .not('transcript', 'is', null)
      .order('date', { ascending: false });

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All meetings already have tasks extracted.',
        meetingsProcessed: 0,
        tasksExtracted: 0,
      });
    }

    // Get team members for assignee matching
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('id, name, email')
      .eq('team_id', teamId);

    const members = teamMembers ?? [];
    let totalTasks = 0;
    let meetingsProcessed = 0;

    for (const meeting of meetings) {
      const transcript = meeting.transcript as string;
      if (!transcript || transcript.length < 50) continue;

      const extractedTasks = await extractTasksFromTranscript(transcript, members);

      if (extractedTasks.length > 0) {
        const count = await persistExtractedTasks(
          meeting.id,
          teamId,
          extractedTasks,
          members
        );
        totalTasks += count;
        meetingsProcessed++;
      }
    }

    return NextResponse.json({
      success: true,
      meetingsProcessed,
      tasksExtracted: totalTasks,
      meetingsChecked: meetings.length,
    });
  } catch (err) {
    console.error('Re-extract error:', err);
    return NextResponse.json(
      { error: 'Task extraction failed' },
      { status: 500 }
    );
  }
}
