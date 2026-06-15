import {
    getPulseFeedFirmwide,
    getPulseFeedUser,
    getMyBriefs,
} from '@/app/actions/pulse';
import { getPendingMatterQuestions } from '@/app/actions/matterQuestions';
import { getOpenAnomalies } from '@/app/actions/anomalies';
import { getTodayWorkEntries, getFirmWorkLog } from '@/app/actions/work-entries';
import { PulseService } from '@/lib/services/pulse/pulse-service';
import { prisma } from '@/lib/prisma';
import { isLegalRole } from '@/lib/roles';
import PulseClient from './PulseClient';

interface PulseContentProps {
    workspaceId: string;
    userId: string;
    userName: string;
}

const empty: any[] = [];

export default async function PulseContent({ workspaceId, userId, userName }: PulseContentProps) {
    const [
        firmStats, userStats, firmFeed, userFeed,
        pendingQuestions, anomalies, myBriefs,
        todayEntries, firmWorkLog, teamMembers, briefs, memberRecord, userRecord,
    ] = await Promise.all([
        PulseService.getFirmStats(workspaceId).catch(() => ({ activeBriefs: 0, activeBriefsDelta: '—', unbilledMatters: 0, unbilledAmount: '₦0', hearingsThisWeek: 0, nextHearingLabel: '—', openEscalations: 0 })),
        PulseService.getUserStats(workspaceId, userId).catch(() => ({ myBriefs: 0, myBriefsSubLabel: '', tasksOverdue: 0, myHearings: 0, unreadNotifications: 0 })),
        getPulseFeedFirmwide(workspaceId).catch(() => empty),
        getPulseFeedUser(workspaceId).catch(() => empty),
        getPendingMatterQuestions(workspaceId).catch(() => empty),
        getOpenAnomalies(workspaceId).catch(() => empty),
        getMyBriefs(workspaceId).catch(() => empty),
        (() => {
            const today = new Date();
            const start = new Date(today); start.setHours(0, 0, 0, 0);
            const end = new Date(today); end.setHours(23, 59, 59, 999);
            return prisma.workEntry.findMany({
                where: { workspaceId, userId, date: { gte: start, lte: end } },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    createdBy: { select: { id: true, name: true, email: true } },
                    brief: { select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true } },
                },
                orderBy: [{ createdAt: 'asc' }],
            });
        })().catch(() => empty),
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
        prisma.workspaceMember.findFirst({
            where: { workspaceId, userId, status: 'active' },
            select: { role: true },
        }).catch(() => null),
        prisma.user.findUnique({
            where: { id: userId },
            select: { isPlatformAdmin: true },
        }).catch(() => null),
    ]);

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
            myBriefs={myBriefs}
            todayEntries={todayEntries}
            firmWorkLog={firmWorkLog}
            teamMembers={legalTeamMembers}
            briefs={briefs}
            userId={userId}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
        />
    );
}
