import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateText } from '@/lib/ai-provider';

// ---------- Types ----------

export interface ExtractedTask {
  title: string;
  assignee: string | null;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
  description: string | null;
  project: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

// ---------- AI Extraction ----------

const EXTRACTION_PROMPT = `You are a meeting action-item extractor. Analyze the meeting transcript and extract all action items, tasks, and commitments made by participants.

For each action item, identify:
1. **title**: A concise, actionable task description (imperative form, e.g., "Fix auth bug in middleware")
2. **assignee**: The name of the person who was assigned or volunteered for the task. Use their exact name from the transcript. If unclear, set to null.
3. **priority**: "high" (blocking, urgent, deadline soon), "medium" (normal work), or "low" (nice-to-have, future consideration)
4. **deadline**: If a specific deadline was mentioned (e.g., "by Friday", "end of sprint"), convert to ISO date string. If none mentioned, set to null.
5. **description**: Any additional context from the discussion about this task (1-2 sentences max). If none, set to null.
6. **project**: The project name, repository, module, or product area this task belongs to. Identify from context clues like repo names, product names, module names, or feature areas mentioned in the discussion (e.g., "nexus HR", "e-commerce", "Video module", "auth service"). If unclear, set to null.

Rules:
- Only extract concrete, actionable tasks — not discussions or opinions
- Ignore vague statements like "we should think about..." unless someone commits to it
- If multiple people are mentioned for one task, create separate entries
- Keep titles under 100 characters
- For the project field, use the most specific identifier mentioned (repo name > product name > module name > general area)
- Return ONLY valid JSON array, no markdown or explanation

Team members for reference: {team_members}

Respond with a JSON array:
[
  {
    "title": "Fix auth bug in login middleware",
    "assignee": "Adi",
    "priority": "high",
    "deadline": "2026-04-12T00:00:00Z",
    "description": "Users getting 401 errors after token refresh",
    "project": "nexus HR"
  }
]`;

export async function extractTasksFromTranscript(
  transcript: string,
  teamMembers: TeamMember[]
): Promise<ExtractedTask[]> {
  const memberNames = teamMembers.map((m) => m.name).join(', ');
  const prompt = EXTRACTION_PROMPT.replace('{team_members}', memberNames || 'unknown');
  const fullPrompt = `${prompt}\n\nMeeting Transcript:\n\n${transcript}`;

  try {
    const result = await generateText(fullPrompt);

    if (!result) {
      // No AI provider configured
      return [];
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const tasks: ExtractedTask[] = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    return tasks
      .filter((t) => t.title && typeof t.title === 'string')
      .map((t) => ({
        title: t.title.slice(0, 200),
        assignee: t.assignee ?? null,
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        deadline: t.deadline ?? null,
        description: t.description?.slice(0, 500) ?? null,
        project: t.project?.slice(0, 100) ?? null,
      }));
  } catch (err) {
    console.error('AI task extraction failed:', err);
    return [];
  }
}

// ---------- Task Persistence ----------

export async function persistExtractedTasks(
  meetingId: string,
  teamId: string,
  tasks: ExtractedTask[],
  teamMembers: TeamMember[]
): Promise<number> {
  if (tasks.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  let insertedCount = 0;

  for (const task of tasks) {
    // Match assignee name to team member (case-insensitive, partial match)
    let assigneeId: string | null = null;
    if (task.assignee) {
      const normalizedAssignee = task.assignee.toLowerCase().trim();

      // Primary: match by name
      const matched = teamMembers.find((m) => {
        const name = m.name.toLowerCase();
        return (
          name === normalizedAssignee ||
          name.includes(normalizedAssignee) ||
          normalizedAssignee.includes(name) ||
          name.split(' ')[0] === normalizedAssignee // first name match
        );
      });
      assigneeId = matched?.id ?? null;

      // Fallback: match via fireflies_display_names array
      if (!assigneeId) {
        try {
          const { data: firefliesMatch } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', teamId)
            .contains('fireflies_display_names', [task.assignee.trim()])
            .limit(1)
            .single();
          if (firefliesMatch) {
            assigneeId = firefliesMatch.id;
          }
        } catch {
          // Fallback failed — non-critical
        }
      }
    }

    const { error } = await supabase.from('tasks').insert({
      team_id: teamId,
      meeting_id: meetingId,
      assignee_id: assigneeId,
      title: task.title,
      description: task.description,
      source: 'fireflies',
      priority: task.priority,
      deadline: task.deadline,
      project: task.project ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (!error) {
      insertedCount++;

      // Insert timeline event for task assignment
      if (assigneeId) {
        await supabase.from('activity_timeline').insert({
          team_id: teamId,
          developer_id: assigneeId,
          event_type: 'task_assigned',
          title: `Task assigned: ${task.title}`,
          description: task.description,
          metadata: {
            meeting_id: meetingId,
            priority: task.priority,
            deadline: task.deadline,
            source: 'fireflies',
          },
          source_id: meetingId,
          source_table: 'meetings',
          occurred_at: new Date().toISOString(),
        });
      }
    }
  }

  // Update meeting action_items_count
  await supabase
    .from('meetings')
    .update({ action_items_count: insertedCount })
    .eq('id', meetingId);

  return insertedCount;
}
