import {
    getPulseFeedFirmwide,
    getPulseFeedUser,
    getMyBriefs,
} from '@/app/actions/pulse';
import { getPendingMatterQuestions } from '@/app/actions/matterQuestions';
import { getOpenAnomalies } from '@/app/actions/anomalies';
import { getTodayWorkEntries, getFirmWorkLog, getWorkspaceTeamMembers } from '@/app/actions/work-entries';
import { PulseService } from '@/lib/services/pulse/pulse-service';
import { prisma } from '@/lib/prisma';
import PulseClient from './PulseClient';

interface PulseContentProps {
    workspaceId: string;
    userId: string;
    userName: string;
}

export default async function PulseContent({ workspaceId, userId, userName }: PulseContentProps) {
    const [
        firmStats, userStats, firmFeed, userFeed,
        pendingQuestions, anomalies, myBriefs,
        todayEntries, firmWorkLog, teamMembers, briefs, memberRecord, userRecord,
    ] = await Promise.all([
        PulseService.getFirmStats(workspaceId),
        PulseService.getUserStats(workspaceId, userId),
        getPulseFeedFirmwide(workspaceId),
        getPulseFeedUser(workspaceId),
        getPendingMatterQuestions(workspaceId).catch(() => [] as any[]),
        getOpenAnomalies(workspaceId).catch(() => [] as any[]),
        getMyBriefs(workspaceId),
        getTodayWorkEntries(workspaceId).catch(() => [] as any[]),
        getFirmWorkLog(workspaceId).catch(() => [] as any[]),
        getWorkspaceTeamMembers(workspaceId).catch(() => [] as any[]),
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: null, status: 'active' },
            select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true },
            orderBy: { briefNumber: 'asc' },
        }),
        prisma.workspaceMember.findFirst({
            where: { workspaceId, userId, status: 'active' },
            select: { role: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { isPlatformAdmin: true } }),
    ]);

    const adminRoles = ['admin', 'owner', 'managing partner'];
    const isAdmin = !!(
        userRecord?.isPlatformAdmin ||
        (memberRecord?.role && adminRoles.includes(memberRecord.role.toLowerCase()))
    );

    const attentionCount = (firmFeed ?? []).filter(i => i.severity === 'urgent').length;

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
            myBriefs={myBriefs}
            todayEntries={todayEntries}
            firmWorkLog={firmWorkLog}
            teamMembers={teamMembers}
            briefs={briefs}
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
        />
    );
}
