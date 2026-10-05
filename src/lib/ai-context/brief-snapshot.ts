import { prisma } from '@/lib/prisma';

// The one "gather everything relevant to this brief" query shared by every AI
// surface. Brief Manager's scan, Eureka's get_brief_detail and (through
// Eureka's tool catalogue) the WhatsApp agent all read from here, so a new
// source of context added once reaches all three — and each surface sees the
// structured conclusions the others recorded in AgentInsight, rather than
// rebuilding its understanding of the brief from scratch.

export interface BriefSnapshotLimits {
    chronology?: number;
    correspondence?: number;
    tasks?: number;
    lawyerNotes?: number;
    documents?: number;
    documentChars?: number;
}

const DEFAULT_LIMITS: Required<BriefSnapshotLimits> = {
    chronology: 30,
    correspondence: 5,
    tasks: 10,
    lawyerNotes: 15,
    documents: 3,
    documentChars: 2000,
};

export interface AgentAssessment {
    agentType: string;
    summary: string;
    status: string;
    assessedAt: Date;
    basedOnActivityUpTo: Date;
    // Shape is BriefManagerInsightData for agentType 'brief_manager'.
    data: Record<string, unknown>;
}

export async function getLatestAgentAssessment(briefId: string): Promise<AgentAssessment | null> {
    const insight = await prisma.agentInsight.findFirst({
        where: { briefId, status: { not: 'dismissed' } },
        orderBy: { createdAt: 'desc' },
        select: { agentType: true, summary: true, status: true, createdAt: true, lastSignalAt: true, data: true },
    });
    if (!insight) return null;
    return {
        agentType: insight.agentType,
        summary: insight.summary,
        status: insight.status,
        assessedAt: insight.createdAt,
        basedOnActivityUpTo: insight.lastSignalAt,
        data: (insight.data ?? {}) as Record<string, unknown>,
    };
}

export async function getBriefSnapshot(briefId: string, limits: BriefSnapshotLimits = {}) {
    const l = { ...DEFAULT_LIMITS, ...limits };

    const brief = await prisma.brief.findUnique({
        where: { id: briefId, deletedAt: null },
        select: {
            id: true, workspaceId: true, name: true, briefNumber: true, category: true, status: true,
            dueDate: true, createdAt: true, aiSummaryProse: true,
            client: { select: { name: true } },
            lawyerInCharge: { select: { name: true } },
            lawyer: { select: { name: true } },
            matter: {
                select: {
                    id: true, name: true, court: true,
                    opponentName: true, opponentCounsel: true,
                    nextCourtDate: true, lastClientContact: true,
                },
            },
        },
    });
    if (!brief) return null;

    const [chronology, correspondence, openTasks, nextHearing, lawyerNotes, recentDocuments, assessment] = await Promise.all([
        prisma.documentTimelineEvent.findMany({
            where: { briefId },
            orderBy: { eventDate: 'desc' },
            take: l.chronology,
            select: { eventDateRaw: true, description: true },
        }),
        prisma.pulseEvent.findMany({
            where: { briefId },
            orderBy: { createdAt: 'desc' },
            take: l.correspondence,
            select: { createdAt: true, senderType: true, senderName: true, intent: true, summary: true },
        }),
        prisma.task.findMany({
            where: { briefId, status: { not: 'completed' } },
            orderBy: { dueDate: 'asc' },
            take: l.tasks,
            select: { title: true, dueDate: true, status: true },
        }),
        prisma.calendarEntry.findFirst({
            where: { briefId, date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            select: { date: true, adjournedFor: true, court: true },
        }),
        prisma.briefActivityLog.findMany({
            where: { briefId, activityType: { in: ['agent_memory', 'status_changed'] } },
            orderBy: { timestamp: 'desc' },
            take: l.lawyerNotes,
            select: { timestamp: true, description: true },
        }),
        prisma.document.findMany({
            where: { briefId, ocrText: { not: null } },
            orderBy: { uploadedAt: 'desc' },
            take: l.documents,
            select: { name: true, ocrText: true },
        }),
        getLatestAgentAssessment(briefId),
    ]);

    return {
        brief: {
            ...brief,
            lawyerInChargeName: brief.lawyerInCharge?.name ?? brief.lawyer?.name ?? null,
        },
        chronology,
        correspondence,
        openTasks,
        nextHearing,
        lawyerNotes,
        recentDocuments: recentDocuments.map(d => ({ name: d.name, text: (d.ocrText ?? '').slice(0, l.documentChars) })),
        assessment,
    };
}

export type BriefSnapshot = NonNullable<Awaited<ReturnType<typeof getBriefSnapshot>>>;
