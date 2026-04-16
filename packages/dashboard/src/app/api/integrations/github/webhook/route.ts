import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { matchCodeChangeToTasks } from '@/lib/services/task-matcher';

/**
 * POST /api/integrations/github/webhook
 *
 * Handles incoming GitHub webhook events (push, pull_request, pull_request_review).
 *
 * OPTIONAL: This endpoint is NOT required for the OAuth-based sync flow.
 * Currently, syncing is done via manual "Sync Now" or (future) cron polling.
 *
 * This webhook is kept for future use if:
 * - A GitHub App is re-enabled for real-time event delivery
 * - Organization webhooks are configured to point here
 * - Repository-level webhooks are set up via the GitHub API
 *
 * To enable: set GITHUB_WEBHOOK_SECRET in env and configure the webhook URL
 * in GitHub (org or repo settings) pointing to this endpoint.
 */

// ---------- Signature Verification ----------

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------- Helper: Map GitHub username to developer_id ----------

async function mapGitHubUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
  githubUsername: string | null,
  email: string | null
): Promise<string | null> {
  if (!githubUsername && !email) return null;

  if (githubUsername) {
    const { data } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .ilike('github_username', githubUsername)
      .single();
    if (data) return data.id;
  }

  if (email) {
    const { data } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .ilike('email', email)
      .single();
    if (data) return data.id;
  }

  return null;
}

// ---------- Helper: Insert activity timeline event ----------

async function insertTimelineEvent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    teamId: string;
    developerId: string | null;
    eventType: string;
    title: string;
    description: string | null;
    metadata: Record<string, unknown>;
    sourceId: string;
    occurredAt: string;
  }
) {
  await supabase.from('activity_timeline').insert({
    team_id: params.teamId,
    developer_id: params.developerId,
    event_type: params.eventType,
    title: params.title,
    description: params.description,
    metadata: params.metadata,
    source_id: params.sourceId,
    source_table: 'code_changes',
    occurred_at: params.occurredAt,
  });
}

// ---------- Helper: Find team by repo ----------

async function findTeamByRepo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  repoFullName: string
): Promise<string | null> {
  const { data: integrations } = await supabase
    .from('integrations')
    .select('team_id, config')
    .eq('provider', 'github')
    .eq('status', 'active');

  if (!integrations) return null;

  for (const integration of integrations) {
    const config = integration.config as Record<string, unknown> | null;
    const trackedRepos = config?.tracked_repos as string[] | undefined;
    if (trackedRepos?.includes(repoFullName)) {
      return integration.team_id;
    }
  }

  return null;
}

// ---------- Event Handlers ----------

async function handlePush(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
  payload: Record<string, unknown>
) {
  const repoFullName = (payload.repository as Record<string, unknown>)?.full_name as string;
  const ref = payload.ref as string;
  const branch = ref?.replace('refs/heads/', '') ?? null;
  const commits = payload.commits as Array<Record<string, unknown>> | undefined;
  if (!commits || commits.length === 0) return;

  for (const commit of commits) {
    const authorEmail = (commit.author as Record<string, unknown>)?.email as string | null;
    const authorUsername = (commit.author as Record<string, unknown>)?.username as string | null;
    const developerId = await mapGitHubUser(supabase, teamId, authorUsername, authorEmail);

    const added = (commit.added as string[])?.length ?? 0;
    const removed = (commit.removed as string[])?.length ?? 0;
    const modified = (commit.modified as string[])?.length ?? 0;
    const filesChanged = added + removed + modified;
    const sha = commit.id as string;
    const message = commit.message as string;
    const timestamp = commit.timestamp as string;

    // Idempotency: skip if already processed
    const { data: existing } = await supabase
      .from('code_changes')
      .select('id')
      .eq('external_id', sha)
      .eq('team_id', teamId)
      .single();
    if (existing) continue;

    const { data: codeChange } = await supabase
      .from('code_changes')
      .insert({
        team_id: teamId,
        developer_id: developerId,
        type: 'commit',
        external_id: sha,
        repo: repoFullName,
        branch,
        title: message?.split('\n')[0] ?? sha,
        body: message,
        files_changed: filesChanged,
        additions: added + modified,
        deletions: removed,
        created_at: timestamp ?? new Date().toISOString(),
      })
      .select('id')
      .single();

    await insertTimelineEvent(supabase, {
      teamId,
      developerId,
      eventType: 'commit',
      title: `Committed: ${message?.split('\n')[0] ?? sha.slice(0, 8)}`,
      description: `${filesChanged} file(s) changed in ${repoFullName}`,
      metadata: { sha, repo: repoFullName, branch, files_changed: filesChanged },
      sourceId: codeChange?.id ?? sha,
      occurredAt: timestamp ?? new Date().toISOString(),
    });

    if (codeChange?.id) {
      matchCodeChangeToTasks(codeChange.id, teamId, developerId).catch((err) =>
        console.error('Task matching failed for commit:', err)
      );
    }
  }
}

async function handlePullRequest(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
  payload: Record<string, unknown>
) {
  const action = payload.action as string;
  const pr = payload.pull_request as Record<string, unknown>;
  const repo = payload.repository as Record<string, unknown>;
  if (!pr || !repo) return;

  let type: string;
  if (action === 'opened') type = 'pr_opened';
  else if (action === 'closed' && pr.merged) type = 'pr_merged';
  else if (action === 'closed') type = 'pr_closed';
  else return;

  const repoFullName = repo.full_name as string;
  const senderUsername = (payload.sender as Record<string, unknown>)?.login as string | null;
  const developerId = await mapGitHubUser(supabase, teamId, senderUsername, null);

  const prNumber = pr.number as number;
  const prTitle = pr.title as string;
  const prBody = pr.body as string | null;
  const additions = (pr.additions as number) ?? 0;
  const deletions = (pr.deletions as number) ?? 0;
  const changedFiles = (pr.changed_files as number) ?? 0;
  const branch = (pr.head as Record<string, unknown>)?.ref as string | null;
  const timestamp = (pr.merged_at ?? pr.updated_at ?? pr.created_at) as string;

  const externalId = `pr-${prNumber}-${action}`;
  const { data: existing } = await supabase
    .from('code_changes')
    .select('id')
    .eq('external_id', externalId)
    .eq('team_id', teamId)
    .single();
  if (existing) return;

  const { data: codeChange } = await supabase
    .from('code_changes')
    .insert({
      team_id: teamId,
      developer_id: developerId,
      type,
      external_id: externalId,
      repo: repoFullName,
      branch,
      title: prTitle,
      body: prBody,
      files_changed: changedFiles,
      additions,
      deletions,
      created_at: timestamp ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  const eventLabels: Record<string, string> = {
    pr_opened: 'Opened PR',
    pr_merged: 'Merged PR',
    pr_closed: 'Closed PR',
  };

  await insertTimelineEvent(supabase, {
    teamId,
    developerId,
    eventType: type,
    title: `${eventLabels[type]}: #${prNumber} ${prTitle}`,
    description: `${changedFiles} file(s), +${additions} -${deletions} in ${repoFullName}`,
    metadata: { pr_number: prNumber, repo: repoFullName, branch, additions, deletions, files_changed: changedFiles },
    sourceId: codeChange?.id ?? externalId,
    occurredAt: timestamp ?? new Date().toISOString(),
  });

  if (codeChange?.id) {
    matchCodeChangeToTasks(codeChange.id, teamId, developerId).catch((err) =>
      console.error('Task matching failed for PR:', err)
    );
  }
}

async function handlePullRequestReview(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
  payload: Record<string, unknown>
) {
  const action = payload.action as string;
  if (action !== 'submitted') return;

  const review = payload.review as Record<string, unknown>;
  const pr = payload.pull_request as Record<string, unknown>;
  const repo = payload.repository as Record<string, unknown>;
  if (!review || !pr || !repo) return;

  const repoFullName = repo.full_name as string;
  const reviewerUsername = (review.user as Record<string, unknown>)?.login as string | null;
  const developerId = await mapGitHubUser(supabase, teamId, reviewerUsername, null);

  const reviewState = review.state as string;
  const reviewBody = review.body as string | null;
  const prNumber = pr.number as number;
  const prTitle = pr.title as string;
  const submittedAt = review.submitted_at as string;

  const externalId = `review-${review.id}`;
  const { data: existing } = await supabase
    .from('code_changes')
    .select('id')
    .eq('external_id', externalId)
    .eq('team_id', teamId)
    .single();
  if (existing) return;

  const { data: codeChange } = await supabase
    .from('code_changes')
    .insert({
      team_id: teamId,
      developer_id: developerId,
      type: 'review',
      external_id: externalId,
      repo: repoFullName,
      branch: (pr.head as Record<string, unknown>)?.ref as string | null,
      title: `Review on #${prNumber}: ${prTitle}`,
      body: reviewBody,
      files_changed: 0,
      additions: 0,
      deletions: 0,
      created_at: submittedAt ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  const stateLabels: Record<string, string> = {
    approved: 'Approved',
    changes_requested: 'Requested changes on',
    commented: 'Commented on',
  };

  await insertTimelineEvent(supabase, {
    teamId,
    developerId,
    eventType: 'review',
    title: `${stateLabels[reviewState] ?? 'Reviewed'} PR #${prNumber}: ${prTitle}`,
    description: reviewBody?.slice(0, 200) ?? null,
    metadata: { pr_number: prNumber, repo: repoFullName, review_state: reviewState, reviewer: reviewerUsername },
    sourceId: codeChange?.id ?? externalId,
    occurredAt: submittedAt ?? new Date().toISOString(),
  });
}

// ---------- Main Handler ----------

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event');
    const payload = JSON.parse(rawBody);
    const supabase = getSupabaseAdmin();

    // Find team by repo (matches against tracked_repos in integration config)
    const repoFullName =
      (payload.repository as Record<string, unknown>)?.full_name as string | undefined;

    let teamId: string | null = null;
    if (repoFullName) {
      teamId = await findTeamByRepo(supabase, repoFullName);
    }

    if (!teamId) {
      return NextResponse.json({ message: 'No team found for this event' }, { status: 200 });
    }

    switch (event) {
      case 'push':
        await handlePush(supabase, teamId, payload);
        break;
      case 'pull_request':
        await handlePullRequest(supabase, teamId, payload);
        break;
      case 'pull_request_review':
        await handlePullRequestReview(supabase, teamId, payload);
        break;
      case 'ping':
        return NextResponse.json({ message: 'pong' });
      default:
        return NextResponse.json({ message: `Ignored event: ${event}` });
    }

    return NextResponse.json({ message: `Processed ${event} event` });
  } catch (err) {
    console.error('GitHub webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
