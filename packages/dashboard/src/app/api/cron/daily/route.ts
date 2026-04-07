import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    // Get all teams
    const { data: teams } = await supabase.from('teams').select('id, name');
    if (!teams || teams.length === 0) {
      return NextResponse.json({ success: true, teamsProcessed: 0, reportsGenerated: 0, alertsGenerated: 0 });
    }

    let reportsGenerated = 0;
    let alertsGenerated = 0;

    for (const team of teams) {
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name, email')
        .eq('team_id', team.id)
        .eq('is_active', true);

      if (!members || members.length === 0) continue;

      const developerReports: Array<{
        developerId: string;
        developerName: string;
        commitsCount: number;
        prsOpened: number;
        prsMerged: number;
        reviewsGiven: number;
        linesAdded: number;
        linesRemoved: number;
        aiSessionsCount: number;
        aiTotalCost: number;
        aiAvgPromptScore: number | null;
        aiTokensUsed: number;
        aiModelBreakdown: Record<string, number>;
        tasksAssigned: number;
        tasksCompleted: number;
        tasksInProgress: number;
        alignmentScore: number | null;
      }> = [];

      for (const member of members) {
        // Aggregate code changes from yesterday
        const { data: codeChanges } = await supabase
          .from('code_changes')
          .select('type, additions, deletions')
          .eq('developer_id', member.id)
          .gte('created_at', yesterdayStr)
          .lt('created_at', todayStr);

        const changes = codeChanges ?? [];
        const commitsCount = changes.filter(c => c.type === 'commit').length;
        const prsOpened = changes.filter(c => c.type === 'pr_opened').length;
        const prsMerged = changes.filter(c => c.type === 'pr_merged').length;
        const reviewsGiven = changes.filter(c => c.type === 'review').length;
        const linesAdded = changes.reduce((sum, c) => sum + (c.additions ?? 0), 0);
        const linesRemoved = changes.reduce((sum, c) => sum + (c.deletions ?? 0), 0);

        // Aggregate AI sessions from yesterday
        const { data: aiSessions } = await supabase
          .from('ai_sessions')
          .select('id, total_cost_usd, avg_prompt_score, total_input_tokens, total_output_tokens, model')
          .eq('developer_id', member.id)
          .gte('started_at', yesterdayStr)
          .lt('started_at', todayStr);

        const sessions = aiSessions ?? [];
        const aiSessionsCount = sessions.length;
        const aiTotalCost = sessions.reduce((sum, s) => sum + (s.total_cost_usd ?? 0), 0);
        const scoresWithValues = sessions.filter(s => s.avg_prompt_score != null);
        const aiAvgPromptScore = scoresWithValues.length > 0
          ? scoresWithValues.reduce((sum, s) => sum + (s.avg_prompt_score ?? 0), 0) / scoresWithValues.length
          : null;
        const aiTokensUsed = sessions.reduce((sum, s) => sum + (s.total_input_tokens ?? 0) + (s.total_output_tokens ?? 0), 0);

        const aiModelBreakdown: Record<string, number> = {};
        for (const s of sessions) {
          const model = s.model ?? 'unknown';
          aiModelBreakdown[model] = (aiModelBreakdown[model] ?? 0) + 1;
        }

        // Aggregate tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('status')
          .eq('team_id', team.id)
          .eq('assignee_id', member.id);

        const tasks = tasksData ?? [];
        const tasksAssigned = tasks.length;
        const tasksCompleted = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
        const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;

        // Calculate alignment score: ratio of planned work
        const plannedCommits = changes.filter(c => c.type === 'commit').length;
        const alignmentScore = tasksAssigned > 0
          ? Math.round((tasksCompleted / tasksAssigned) * 100)
          : null;

        // Generate AI summary
        const summaryParts: string[] = [];
        if (commitsCount > 0) summaryParts.push(`${commitsCount} commit${commitsCount > 1 ? 's' : ''}`);
        if (prsOpened > 0) summaryParts.push(`opened ${prsOpened} PR${prsOpened > 1 ? 's' : ''}`);
        if (prsMerged > 0) summaryParts.push(`merged ${prsMerged} PR${prsMerged > 1 ? 's' : ''}`);
        if (reviewsGiven > 0) summaryParts.push(`${reviewsGiven} review${reviewsGiven > 1 ? 's' : ''}`);

        let aiSummary = '';
        if (summaryParts.length > 0) {
          aiSummary = `${member.name} made ${summaryParts.join(', ')}.`;
        } else {
          aiSummary = `${member.name} had no code activity.`;
        }
        if (aiSessionsCount > 0) {
          aiSummary += ` Used AI for ${aiSessionsCount} session${aiSessionsCount > 1 ? 's' : ''} ($${aiTotalCost.toFixed(2)})`;
        }

        // Upsert into daily_reports
        const { error: upsertError } = await supabase
          .from('daily_reports')
          .upsert({
            team_id: team.id,
            developer_id: member.id,
            date: yesterdayStr,
            commits_count: commitsCount,
            prs_opened: prsOpened,
            prs_merged: prsMerged,
            reviews_given: reviewsGiven,
            lines_added: linesAdded,
            lines_removed: linesRemoved,
            ai_summary: aiSummary,
            tasks_assigned: tasksAssigned,
            tasks_completed: tasksCompleted,
            planned_commits: plannedCommits,
            unplanned_commits: 0,
            alignment_score: alignmentScore,
            ai_sessions_count: aiSessionsCount,
            ai_total_cost: aiTotalCost,
            ai_avg_prompt_score: aiAvgPromptScore,
            ai_tokens_used: aiTokensUsed,
            ai_model_breakdown: aiModelBreakdown,
            generated_at: now.toISOString(),
          }, { onConflict: 'developer_id,date' });

        if (!upsertError) reportsGenerated++;

        developerReports.push({
          developerId: member.id,
          developerName: member.name,
          commitsCount,
          prsOpened,
          prsMerged,
          reviewsGiven,
          linesAdded,
          linesRemoved,
          aiSessionsCount,
          aiTotalCost,
          aiAvgPromptScore,
          aiTokensUsed,
          aiModelBreakdown,
          tasksAssigned,
          tasksCompleted,
          tasksInProgress,
          alignmentScore,
        });
      }

      // Calculate team alignment report
      const activeDevelopers = developerReports.filter(
        r => r.commitsCount > 0 || r.aiSessionsCount > 0
      ).length;

      const totalCommits = developerReports.reduce((sum, r) => sum + r.commitsCount, 0);
      const totalPrs = developerReports.reduce((sum, r) => sum + r.prsOpened + r.prsMerged, 0);
      const totalAiCost = developerReports.reduce((sum, r) => sum + r.aiTotalCost, 0);
      const totalTasksAssigned = developerReports.reduce((sum, r) => sum + r.tasksAssigned, 0);
      const totalTasksCompleted = developerReports.reduce((sum, r) => sum + r.tasksCompleted, 0);
      const totalTasksInProgress = developerReports.reduce((sum, r) => sum + r.tasksInProgress, 0);
      const totalTasksDropped = Math.max(0, totalTasksAssigned - totalTasksCompleted - totalTasksInProgress);

      const scoresWithValues = developerReports
        .map(r => r.aiAvgPromptScore)
        .filter((s): s is number => s != null);
      const avgPromptScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length
        : null;

      // Team health: weighted average
      const taskRate = totalTasksAssigned > 0 ? totalTasksCompleted / totalTasksAssigned : 0.5;
      const activeRate = members.length > 0 ? activeDevelopers / members.length : 0.5;
      const promptScoreNorm = avgPromptScore != null ? avgPromptScore / 100 : 0.5;
      const teamHealthScore = Math.round(
        (taskRate * 35) + (activeRate * 25) + (promptScoreNorm * 25) + (Math.min(totalPrs / 10, 1) * 15)
      ) * 100 / 100;

      // Meeting to code rate: tasks with matched code / total tasks
      const { data: tasksWithCode } = await supabase
        .from('tasks')
        .select('id, matched_changes')
        .eq('team_id', team.id)
        .not('matched_changes', 'is', null);

      const meetingToCodeRate = totalTasksAssigned > 0
        ? (tasksWithCode ?? []).length / totalTasksAssigned
        : 0;

      await supabase
        .from('alignment_reports')
        .upsert({
          team_id: team.id,
          date: yesterdayStr,
          team_health_score: Math.min(Math.round(teamHealthScore * 100), 100),
          active_developers: activeDevelopers,
          total_developers: members.length,
          tasks_total: totalTasksAssigned,
          tasks_completed: totalTasksCompleted,
          tasks_in_progress: totalTasksInProgress,
          tasks_dropped: totalTasksDropped,
          unplanned_work_count: 0,
          total_commits: totalCommits,
          total_prs: totalPrs,
          total_ai_cost: totalAiCost,
          avg_prompt_score: avgPromptScore,
          meeting_to_code_rate: meetingToCodeRate,
          generated_at: now.toISOString(),
        }, { onConflict: 'team_id,date' });

      // Generate alerts
      const newAlerts: Array<{
        team_id: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        developer_id?: string;
        task_id?: string;
      }> = [];

      // Alert: task_stale — tasks with no activity for 3+ days
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: staleTasks } = await supabase
        .from('tasks')
        .select('id, title, assignee_id, status, status_updated_at, created_at')
        .eq('team_id', team.id)
        .in('status', ['pending', 'in_progress'])
        .lt('status_updated_at', threeDaysAgo.toISOString());

      // Also check tasks without status_updated_at using created_at
      const { data: staleTasksNoUpdate } = await supabase
        .from('tasks')
        .select('id, title, assignee_id, status, created_at')
        .eq('team_id', team.id)
        .in('status', ['pending', 'in_progress'])
        .is('status_updated_at', null)
        .lt('created_at', threeDaysAgo.toISOString());

      const allStaleTasks = [...(staleTasks ?? []), ...(staleTasksNoUpdate ?? [])];
      for (const task of allStaleTasks) {
        newAlerts.push({
          team_id: team.id,
          type: 'task_stale',
          severity: 'critical',
          title: `Stale task: ${task.title}`,
          description: `No activity for 3+ days. Status: ${task.status}`,
          developer_id: task.assignee_id ?? undefined,
          task_id: task.id,
        });
      }

      // Alert: high_ai_cost — developer AI cost > 2x team average
      const avgCost = members.length > 0 ? totalAiCost / members.length : 0;
      if (avgCost > 0) {
        for (const report of developerReports) {
          if (report.aiTotalCost > avgCost * 2) {
            newAlerts.push({
              team_id: team.id,
              type: 'high_ai_cost',
              severity: 'warning',
              title: `High AI cost: ${report.developerName}`,
              description: `Spent $${report.aiTotalCost.toFixed(2)} yesterday (team avg: $${avgCost.toFixed(2)})`,
              developer_id: report.developerId,
            });
          }
        }
      }

      // Alert: low_prompt_score — developer avg score < 40
      for (const report of developerReports) {
        if (report.aiAvgPromptScore != null && report.aiAvgPromptScore < 40) {
          newAlerts.push({
            team_id: team.id,
            type: 'low_prompt_score',
            severity: 'warning',
            title: `Low prompt quality: ${report.developerName}`,
            description: `Average prompt score of ${Math.round(report.aiAvgPromptScore)} (threshold: 40)`,
            developer_id: report.developerId,
          });
        }
      }

      // Alert: sprint_risk — < 50% tasks done with < 2 days left
      const { data: deadlineTasks } = await supabase
        .from('tasks')
        .select('id, title, status, deadline, assignee_id')
        .eq('team_id', team.id)
        .not('deadline', 'is', null);

      if (deadlineTasks && deadlineTasks.length > 0) {
        const twoDaysFromNow = new Date(now);
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

        const urgentTasks = deadlineTasks.filter(
          t => new Date(t.deadline) <= twoDaysFromNow
        );
        if (urgentTasks.length > 0) {
          const urgentDone = urgentTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
          const completionRate = urgentDone / urgentTasks.length;
          if (completionRate < 0.5) {
            newAlerts.push({
              team_id: team.id,
              type: 'sprint_risk',
              severity: 'critical',
              title: 'Sprint at risk',
              description: `Only ${Math.round(completionRate * 100)}% of deadline tasks completed with < 2 days remaining (${urgentDone}/${urgentTasks.length})`,
            });
          }
        }
      }

      // Alert: inactive_developer — no commits or AI sessions in 3 days
      for (const member of members) {
        const { data: recentCode } = await supabase
          .from('code_changes')
          .select('id')
          .eq('developer_id', member.id)
          .gte('created_at', threeDaysAgo.toISOString())
          .limit(1);

        const { data: recentAi } = await supabase
          .from('ai_sessions')
          .select('id')
          .eq('developer_id', member.id)
          .gte('started_at', threeDaysAgo.toISOString())
          .limit(1);

        if ((!recentCode || recentCode.length === 0) && (!recentAi || recentAi.length === 0)) {
          newAlerts.push({
            team_id: team.id,
            type: 'inactive_developer',
            severity: 'warning',
            title: `Inactive: ${member.name}`,
            description: 'No commits or AI sessions in the last 3 days',
            developer_id: member.id,
          });
        }
      }

      // Alert: high_performer — score > 85 consistently (positive alert)
      for (const report of developerReports) {
        if (
          report.aiAvgPromptScore != null &&
          report.aiAvgPromptScore > 85 &&
          report.commitsCount > 0
        ) {
          newAlerts.push({
            team_id: team.id,
            type: 'high_performer',
            severity: 'positive',
            title: `High performer: ${report.developerName}`,
            description: `Prompt score ${Math.round(report.aiAvgPromptScore)} with ${report.commitsCount} commits yesterday`,
            developer_id: report.developerId,
          });
        }
      }

      // Insert alerts
      if (newAlerts.length > 0) {
        const { error: alertError } = await supabase.from('alerts').insert(newAlerts);
        if (!alertError) alertsGenerated += newAlerts.length;
      }
    }

    return NextResponse.json({
      success: true,
      teamsProcessed: teams.length,
      reportsGenerated,
      alertsGenerated,
    });
  } catch (err) {
    console.error('Cron daily error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
