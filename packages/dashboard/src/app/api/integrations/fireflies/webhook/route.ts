import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  extractTasksFromTranscript,
  persistExtractedTasks,
} from '@/lib/services/task-extractor';

// ---------- Types ----------

interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration: number; // seconds
  participants: string[];
  sentences: Array<{
    speaker_name: string;
    text: string;
    start_time: number;
    end_time: number;
  }>;
  summary?: {
    overview?: string;
    action_items?: string[] | string;
    shorthand_bullet?: string[] | string;
    short_summary?: string;
    keywords?: string[];
  };
  organizer_email?: string;
  transcript_url?: string;
}

interface FirefliesWebhookPayload {
  // Fireflies sends camelCase: meetingId, eventType, clientReferenceId
  meetingId: string;
  eventType: string;
  clientReferenceId?: string;
  // Also handle snake_case variants for safety
  event_type?: string;
  meeting_id?: string;
  data?: FirefliesTranscript;
  transcript_id?: string;
}

// ---------- Signature Verification ----------

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------- Helper: Fetch full transcript from Fireflies API ----------

async function fetchTranscript(
  meetingId: string,
  accessToken: string
): Promise<FirefliesTranscript | null> {
  try {
    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: `
          query Transcript($id: String!) {
            transcript(id: $id) {
              id
              title
              date
              duration
              participants
              organizer_email
              transcript_url
              sentences {
                speaker_name
                text
                start_time
                end_time
              }
              summary {
                overview
                action_items
                shorthand_bullet
                short_summary
                keywords
              }
            }
          }
        `,
        variables: { id: meetingId },
      }),
    });

    const result = await response.json();
    return result?.data?.transcript ?? null;
  } catch (err) {
    console.error('Failed to fetch Fireflies transcript:', err);
    return null;
  }
}

// ---------- Helper: Find team by Fireflies integration ----------

async function findTeamForFireflies(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizerEmail?: string
): Promise<{ teamId: string; accessToken: string } | null> {
  // Get all active Fireflies integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('team_id, access_token, config')
    .eq('provider', 'fireflies')
    .eq('status', 'active');

  if (!integrations || integrations.length === 0) return null;

  // If organizer email is available, try to match to a specific team
  if (organizerEmail) {
    for (const integration of integrations) {
      const config = integration.config as Record<string, unknown> | null;
      if (config?.account_email === organizerEmail) {
        return {
          teamId: integration.team_id,
          accessToken: integration.access_token,
        };
      }

      // Check if organizer is a team member
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', integration.team_id)
        .ilike('email', organizerEmail)
        .single();

      if (member) {
        return {
          teamId: integration.team_id,
          accessToken: integration.access_token,
        };
      }
    }
  }

  // Fallback: use first active integration
  return {
    teamId: integrations[0].team_id,
    accessToken: integrations[0].access_token,
  };
}

// ---------- Helper: Map participant names to team members ----------

async function mapParticipants(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
  participants: string[]
): Promise<Array<{ name: string; memberId: string | null }>> {
  const { data: members } = await supabase
    .from('team_members')
    .select('id, name, email')
    .eq('team_id', teamId);

  if (!members) return participants.map((name) => ({ name, memberId: null }));

  return participants.map((participantName) => {
    const normalized = participantName.toLowerCase().trim();
    const matched = members.find((m) => {
      const memberName = m.name.toLowerCase();
      return (
        memberName === normalized ||
        memberName.includes(normalized) ||
        normalized.includes(memberName) ||
        memberName.split(' ')[0] === normalized.split(' ')[0]
      );
    });
    return { name: participantName, memberId: matched?.id ?? null };
  });
}

// ---------- Helper: Build plain text transcript from sentences ----------

function buildTranscriptText(
  sentences: FirefliesTranscript['sentences']
): string {
  return sentences
    .map((s) => `${s.speaker_name}: ${s.text}`)
    .join('\n');
}

// ---------- Main Event Handler ----------

async function handleMeetingCompleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: FirefliesWebhookPayload
) {
  // Fireflies sends meetingId (camelCase), fall back to snake_case variants
  const meetingIdFromPayload = payload.meetingId ?? payload.meeting_id ?? payload.transcript_id;
  if (!meetingIdFromPayload) return;

  // Find which team this belongs to
  const organizerEmail = payload.data?.organizer_email;
  const teamInfo = await findTeamForFireflies(supabase, organizerEmail);
  if (!teamInfo) {
    console.warn('No team found for Fireflies webhook — ignoring');
    return;
  }

  const { teamId, accessToken } = teamInfo;

  // Get full transcript data — prefer payload data, fallback to API fetch
  let transcriptData: FirefliesTranscript | null = payload.data ?? null;
  if (!transcriptData?.sentences || transcriptData.sentences.length === 0) {
    transcriptData = await fetchTranscript(meetingIdFromPayload, accessToken);
  }

  if (!transcriptData) {
    console.warn('Could not retrieve transcript data for:', meetingIdFromPayload);
    return;
  }

  // Check for duplicate (idempotency)
  const { data: existing } = await supabase
    .from('meetings')
    .select('id')
    .eq('external_id', transcriptData.id)
    .eq('team_id', teamId)
    .single();

  if (existing) {
    console.log('Meeting already processed:', transcriptData.id);
    return;
  }

  // Map participants to team members
  const participantMappings = await mapParticipants(
    supabase,
    teamId,
    transcriptData.participants ?? []
  );

  // Build full transcript text
  const transcriptText = transcriptData.sentences
    ? buildTranscriptText(transcriptData.sentences)
    : '';

  const durationMinutes = transcriptData.duration
    ? Math.round(transcriptData.duration / 60)
    : null;

  // Build rich summary from all available Fireflies summary fields
  const summaryParts: string[] = [];
  if (transcriptData.summary?.overview) {
    summaryParts.push(transcriptData.summary.overview);
  }
  if (transcriptData.summary?.shorthand_bullet?.length) {
    const bullets = transcriptData.summary.shorthand_bullet;
    if (typeof bullets === 'string') {
      summaryParts.push('\n**Key Points:**\n' + bullets);
    } else {
      summaryParts.push(
        '\n**Key Points:**\n' + bullets.map((b) => `• ${b}`).join('\n')
      );
    }
  }
  const richSummary = summaryParts.length > 0 ? summaryParts.join('\n') : null;

  // Store keywords and raw action items in metadata
  const meetingMetadata: Record<string, unknown> = {};
  if (transcriptData.summary?.keywords?.length) {
    meetingMetadata.keywords = transcriptData.summary.keywords;
  }
  if (transcriptData.summary?.action_items?.length) {
    meetingMetadata.fireflies_action_items = transcriptData.summary.action_items;
  }
  if (transcriptData.summary?.short_summary) {
    meetingMetadata.short_summary = transcriptData.summary.short_summary;
  }
  if (transcriptData.transcript_url) {
    meetingMetadata.transcript_url = transcriptData.transcript_url;
  }

  // Insert meeting record
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      team_id: teamId,
      external_id: transcriptData.id,
      title: transcriptData.title ?? 'Untitled Meeting',
      date: transcriptData.date
        ? new Date(transcriptData.date).toISOString()
        : new Date().toISOString(),
      duration_minutes: durationMinutes,
      participants: participantMappings.map((p) => ({
        name: p.name,
        member_id: p.memberId,
      })),
      transcript: transcriptText,
      summary: richSummary,
      source: 'fireflies',
      action_items_count: 0,
      metadata: Object.keys(meetingMetadata).length > 0 ? meetingMetadata : null,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (meetingError || !meeting) {
    console.error('Failed to insert meeting:', meetingError);
    return;
  }

  // Insert timeline events for each participant
  for (const participant of participantMappings) {
    if (participant.memberId) {
      await supabase.from('activity_timeline').insert({
        team_id: teamId,
        developer_id: participant.memberId,
        event_type: 'meeting',
        title: `Meeting: ${transcriptData.title ?? 'Untitled'}`,
        description: transcriptData.summary?.overview
          ? transcriptData.summary.overview.slice(0, 300)
          : `${durationMinutes ?? '?'}min meeting with ${transcriptData.participants?.length ?? 0} participants`,
        metadata: {
          meeting_id: meeting.id,
          external_id: transcriptData.id,
          duration_minutes: durationMinutes,
          participants_count: transcriptData.participants?.length ?? 0,
          source: 'fireflies',
          transcript_url: transcriptData.transcript_url ?? null,
        },
        source_id: meeting.id,
        source_table: 'meetings',
        occurred_at: transcriptData.date
          ? new Date(transcriptData.date).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  // Extract tasks from transcript using AI, with Fireflies fallback
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name, email')
    .eq('team_id', teamId);

  const members = teamMembers ?? [];
  let extractedTasks: import('@/lib/services/task-extractor').ExtractedTask[] = [];

  if (transcriptText.length > 50) {
    extractedTasks = await extractTasksFromTranscript(transcriptText, members);
  }

  // Fallback: use Fireflies action_items if AI extraction returned nothing
  if (extractedTasks.length === 0 && transcriptData.summary?.action_items?.length) {
    const rawItems = transcriptData.summary.action_items;
    // Fireflies may return action_items as a single string — split into lines
    const itemList = typeof rawItems === 'string'
      ? rawItems.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('**'))
      : rawItems;

    extractedTasks = itemList.map((item) => ({
      title: item.length > 200 ? item.slice(0, 200) : item,
      assignee: null,
      priority: 'medium' as const,
      deadline: null,
      description: null,
      project: null,
    }));
  }

  if (extractedTasks.length > 0) {
    await persistExtractedTasks(meeting.id, teamId, extractedTasks, members);
  }
}

// ---------- Main Handler ----------

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature');

    // Verify signature if webhook secret is configured
    if (process.env.FIREFLIES_WEBHOOK_SECRET) {
      if (!verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: FirefliesWebhookPayload = JSON.parse(rawBody);
    const supabase = getSupabaseAdmin();

    // Fireflies sends eventType (camelCase), normalize
    const eventType = payload.eventType ?? payload.event_type ?? '';

    switch (eventType) {
      case 'Transcription completed':
      case 'transcription_completed':
      case 'meeting_completed':
        await handleMeetingCompleted(supabase, payload);
        break;
      case 'ping':
        return NextResponse.json({ message: 'pong' });
      default:
        return NextResponse.json({
          message: `Acknowledged event: ${eventType}`,
        });
    }

    return NextResponse.json({
      message: `Processed ${eventType} event`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Fireflies webhook error:', message, stack);
    return NextResponse.json(
      { error: 'Webhook processing failed', detail: message },
      { status: 500 }
    );
  }
}
