import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['high', 'medium', 'low'];

/**
 * PATCH /api/dashboard/tasks/[id]
 * Update task fields: status, priority, assignee_id, deadline, project
 *
 * Body: { team_id: string, status?, priority?, assignee_id?, deadline?, project? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { team_id: teamId, ...updates } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify task belongs to this team
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', taskId)
      .eq('team_id', teamId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update payload — only include valid fields
    const updatePayload: Record<string, unknown> = {};

    if (updates.status !== undefined) {
      if (!VALID_STATUSES.includes(updates.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updatePayload.status = updates.status;
      updatePayload.status_updated_at = new Date().toISOString();
    }

    if (updates.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(updates.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
          { status: 400 }
        );
      }
      updatePayload.priority = updates.priority;
    }

    if (updates.assignee_id !== undefined) {
      // Allow null to unassign
      if (updates.assignee_id !== null) {
        const { data: member } = await supabase
          .from('team_members')
          .select('id')
          .eq('id', updates.assignee_id)
          .eq('team_id', teamId)
          .single();

        if (!member) {
          return NextResponse.json({ error: 'Assignee not found in team' }, { status: 400 });
        }
      }
      updatePayload.assignee_id = updates.assignee_id;
    }

    if (updates.deadline !== undefined) {
      // Allow null to clear deadline
      updatePayload.deadline = updates.deadline;
    }

    if (updates.project !== undefined) {
      updatePayload.project = updates.project || null;
    }

    if (updates.title !== undefined) {
      const title = (updates.title as string).trim();
      if (!title || title.length > 500) {
        return NextResponse.json({ error: 'Title must be 1-500 characters' }, { status: 400 });
      }
      updatePayload.title = title;
    }

    if (updates.description !== undefined) {
      updatePayload.description = updates.description || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (updateError) {
      console.error('Failed to update task:', updateError);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // If status changed, create a timeline event
    if (updates.status && updates.status !== task.status) {
      const { data: updatedTask } = await supabase
        .from('tasks')
        .select('assignee_id, title, meeting_id')
        .eq('id', taskId)
        .single();

      if (updatedTask?.assignee_id) {
        await supabase.from('activity_timeline').insert({
          team_id: teamId,
          developer_id: updatedTask.assignee_id,
          event_type: 'task_status_change',
          title: `Task ${updates.status === 'completed' ? 'completed' : updates.status === 'in_progress' ? 'started' : 'reopened'}: ${updatedTask.title}`,
          description: `Status changed from ${task.status} to ${updates.status}`,
          metadata: {
            task_id: taskId,
            meeting_id: updatedTask.meeting_id,
            old_status: task.status,
            new_status: updates.status,
          },
          source_id: taskId,
          source_table: 'tasks',
          occurred_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, taskId });
  } catch (err) {
    console.error('Task update error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
