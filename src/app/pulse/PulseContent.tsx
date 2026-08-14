import {
    getPulseFeedFirmwide,
    getPulseFeedUser,
    getMyBriefs,
} from '@/app/actions/pulse';
import { getPendingMatterQuestions } from '@/app/actions/matterQuestions';
import { getOpenAnomalies } from '@/app/actions/anomalies';
import { getOpenAgentInsights } from '@/app/actions/agent-insights';
import { PulseService } from '@/lib/services/pulse/pulse-service';
import { prisma } from '@/lib/prisma';
import { isLegalRole } from '@/lib/roles';
import PulseClient from './PulseClient';

interface PulseContentProps {
    workspaceId: string;
    userId: string;
    userName: string;
    agent?: string;
}

const empty: any[] = [];

export default async function PulseContent({ workspaceId, userId, userName, agent }: PulseContentProps) {
    const [
        firmStats, userStats, firmFeed, userFeed,
        pendingQuestions, anomalies, agentInsights, myBriefs,
        firmWorkLog, teamMembers, briefs, userRecord,
    ] = await Promise.all([
        PulseService.getFirmStats(workspaceId).catch(() => ({ activeBriefs: 0, activeBriefsDelta: '—', unbilledMatters: 0, unbilledAmount: '₦0', hearingsThisWeek: 0, nextHearingLabel: '—', openEscalations: 0 })),
        PulseService.getUserStats(workspaceId, userId).catch(() => ({ myBriefs: 0, myBriefsSubLabel: '', tasksOverdue: 0, myHearings: 0, unreadNotifications: 0 })),
        getPulseFeedFirmwide(workspaceId).catch(() => empty),
        getPulseFeedUser(workspaceId).catch(() => empty),
        getPendingMatterQuestions(workspaceId).catch(() => empty),
        getOpenAnomalies(workspaceId).catch(() => empty),
        getOpenAgentInsights(workspaceId).catch(() => empty),
        getMyBriefs(workspaceId).catch(() => empty),
        // Firm-wide work log for today — today's entries for the current user
        // (previously its own separate query) are just a filtered subset of
        // this same result, so they're derived below instead of fetched twice.
        (() => {
            const today = new Date();
            const start = new Date(today); start.setHours(0, 0, 0, 0);
            const end = new Date(today); end.setHours(23, 59, 59, 999);
            return prisma.workEntry.findMany({
                where: { workspaceId, date: { gte: start, lte: end } },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    createdBy: { select: { id: true, name: true, email: true } },
                    brief: { select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true } },
                },
                orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }],
            });
        })().catch(() => empty),
        prisma.workspaceMember.findMany({
            where: { workspaceId, status: 'active' },
            select: { userId: true, role: true, user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: 'asc' } },
        }).catch(() => empty),
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: null, status: 'active' },
            select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true },
            orderBy: { briefNumber: 'asc' },
        }).catch(() => empty),
        prisma.user.findUnique({
            where: { id: userId },
            select: { isPlatformAdmin: true },
        }).catch(() => null),
    ]);

    // The current user's own membership record is already present in
    // teamMembers (same workspaceId + status:'active' filter) — no need for
    // a separate findFirst just to read one role field off a row we already have.
    const memberRecord = (teamMembers as { userId: string; role: string }[]).find(m => m.userId === userId) ?? null;
    // Same idea: today's entries for the current user are already inside
    // firmWorkLog, ordered by user.name then createdAt — filtering to one
    // user collapses the leading sort key to a no-op, leaving the same
    // createdAt-ascending order the old dedicated query produced.
    const todayEntries = firmWorkLog.filter((e: { userId: string }) => e.userId === userId);

    const adminRoles = ['admin', 'owner', 'managing partner'];
    const isAdmin = !!(
        userRecord?.isPlatformAdmin ||
        (memberRecord?.role && adminRoles.includes(memberRecord.role.toLowerCase()))
    );

    // Only lawyers appear in work logs, assignments, and firm-wide views
    const legalTeamMembers = (teamMembers as any[]).filter((m: any) => isLegalRole(m.role));

    const attentionCount = (firmFeed ?? []).filter((i: any) => i.severity === 'urgent').length;

    return (
        <PulseClient
            firmStats={firmStats}
            userStats={userStats}
            firmFeed={firmFeed}
            userFeed={userFeed}
            userName={userName}
            attentionCount={attentionCount}
            pendingQuestions={pendingQuestions}
            anomalies={anomalies}
            agentInsights={agentInsights}
            myBriefs={myBriefs}
            todayEntries={todayEntries}
            firmWorkLog={firmWorkLog}
            teamMembers={legalTeamMembers}
            briefs={briefs}
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            agent={agent}
        />
    );
}
