import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('team_id');
    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();

    // Fetch meetings with count
    const { data: meetings, count, error } = await supabase
      .from('meetings')
      .select('id, external_id, title, date, duration_minutes, participants, summary, source, action_items_count, metadata, created_at', { count: 'exact' })
      .eq('team_id', teamId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch meetings:', error);
      return NextResponse.json({ meetings: [], total: 0, page, limit });
    }

    // For each meeting, fetch its tasks with assignee info
    const meetingsWithTasks = await Promise.all(
      (meetings ?? []).map(async (meeting) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, description, status, priority, deadline, assignee_id, project, matched_changes, alignment_score, created_at')
          .eq('meeting_id', meeting.id)
          .order('priority', { ascending: true });

        // Fetch assignee names for tasks
        const tasksWithAssignees = await Promise.all(
          (tasks ?? []).map(async (task) => {
            let assigneeName: string | null = null;
            if (task.assignee_id) {
              const { data: member } = await supabase
                .from('team_members')
                .select('name')
                .eq('id', task.assignee_id)
                .single();
              assigneeName = member?.name ?? null;
            }

            return {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline,
              assigneeId: task.assignee_id,
              assigneeName,
              project: task.project ?? null,
              matchedChanges: task.matched_changes ?? [],
              alignmentScore: task.alignment_score,
              createdAt: task.created_at,
            };
          })
        );

        // Calculate delivery stats
        const totalTasks = tasksWithAssignees.length;
        const completedTasks = tasksWithAssignees.filter((t) => t.status === 'completed').length;
        const inProgressTasks = tasksWithAssignees.filter((t) => t.status === 'in_progress').length;
        const deliveryRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const meta = meeting.metadata as Record<string, unknown> | null;

        return {
          id: meeting.id,
          externalId: meeting.external_id,
          title: meeting.title,
          date: meeting.date,
          durationMinutes: meeting.duration_minutes,
          participants: meeting.participants,
          summary: meeting.summary,
          keywords: (meta?.keywords as string[]) ?? [],
          source: meeting.source,
          actionItemsCount: meeting.action_items_count,
          createdAt: meeting.created_at,
          tasks: tasksWithAssignees,
          stats: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            pendingTasks: totalTasks - completedTasks - inProgressTasks,
            deliveryRate,
          },
        };
      })
    );

    // Calculate overall stats
    const allTasks = meetingsWithTasks.flatMap((m) => m.tasks);
    const totalMeetingTasks = allTasks.length;
    const totalCompleted = allTasks.filter((t) => t.status === 'completed').length;
    const overallDeliveryRate = totalMeetingTasks > 0
      ? Math.round((totalCompleted / totalMeetingTasks) * 100)
      : 0;

    return NextResponse.json({
      meetings: meetingsWithTasks,
      total: count ?? 0,
      page,
      limit,
      overallStats: {
        totalMeetings: count ?? 0,
        totalTasks: totalMeetingTasks,
        completedTasks: totalCompleted,
        deliveryRate: overallDeliveryRate,
      },
    });
  } catch (err) {
    console.error('Meetings API error:', err);
    return NextResponse.json({ meetings: [], total: 0, page: 1, limit: 20, overallStats: { totalMeetings: 0, totalTasks: 0, completedTasks: 0, deliveryRate: 0 } });
  }
}
