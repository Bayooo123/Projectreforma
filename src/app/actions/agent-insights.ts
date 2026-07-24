'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { generateBriefManagerInsight, upsertInsightForBrief } from '@/lib/agents/brief-manager/scan';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export async function getOpenAgentInsights(workspaceId: string, agentType?: string) {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    return prisma.agentInsight.findMany({
        where: { workspaceId, status: { in: ['new', 'viewed'] }, ...(agentType ? { agentType } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { brief: { select: { id: true, name: true, briefNumber: true } } },
    });
}

export interface BriefBoardRow {
    id: string;
    name: string;
    briefNumber: string;
    client: string | null;
    lawyerInCharge: string | null;
    dueDate: Date | null;
    insight: {
        id: string;
        summary: string;
        data: Record<string, unknown>;
        messages: unknown;
        status: string;
    } | null;
}

// The comprehensive "where do we stand on every brief" board — unlike
// getOpenAgentInsights (an alert queue that empties out once dismissed/resolved),
// this always shows every active brief with its most recent Brief Manager
// assessment regardless of that insight's status, plus briefs never yet checked.
export async function getBriefManagerBoard(workspaceId: string, scope: 'firm' | 'mine'): Promise<BriefBoardRow[]> {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    const [briefs, insights] = await Promise.all([
        prisma.brief.findMany({
            where: {
                workspaceId,
                status: 'active',
                deletedAt: null,
                ...(scope === 'mine' ? { OR: [{ lawyerId: session.user.id }, { lawyerInChargeId: session.user.id }] } : {}),
            },
            select: {
                id: true, name: true, briefNumber: true, dueDate: true,
                client: { select: { name: true } },
                lawyerInCharge: { select: { name: true } },
                lawyer: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.agentInsight.findMany({
            where: { workspaceId, agentType: 'brief_manager', briefId: { not: null } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, briefId: true, summary: true, data: true, messages: true, status: true },
        }),
    ]);

    // Keep only the most recent insight per brief (insights is already newest-first).
    const latestByBrief = new Map<string, (typeof insights)[number]>();
    for (const insight of insights) {
        if (insight.briefId && !latestByBrief.has(insight.briefId)) {
            latestByBrief.set(insight.briefId, insight);
        }
    }

    return briefs.map(b => {
        const insight = latestByBrief.get(b.id);
        return {
            id: b.id,
            name: b.name,
            briefNumber: b.briefNumber,
            client: b.client?.name ?? null,
            lawyerInCharge: b.lawyerInCharge?.name ?? b.lawyer?.name ?? null,
            dueDate: b.dueDate,
            insight: insight ? {
                id: insight.id,
                summary: insight.summary,
                data: insight.data as Record<string, unknown>,
                messages: insight.messages,
                status: insight.status,
            } : null,
        };
    });
}

// Cheap re-fetch of one insight's current stored data — used to pick up a
// record_brief_update regeneration that runs via after() post-response, so the
// board's collapsed "what happened last" line catches up shortly after a chat
// turn without the chat reply itself having to wait for that regeneration.
export async function getInsightSnapshot(insightId: string): Promise<{ summary: string; data: Record<string, unknown> } | null> {
    const session = await getSession();
    const insight = await prisma.agentInsight.findUnique({
        where: { id: insightId },
        select: { workspaceId: true, summary: true, data: true },
    });
    if (!insight || insight.workspaceId !== session.user.workspaceId) return null;
    return { summary: insight.summary, data: insight.data as Record<string, unknown> };
}

export interface BulkCheckResult {
    total: number;
    succeeded: number;
    failed: number;
    failures: Array<{ briefId: string; briefName: string; reason: string }>;
}

// "Check all" — runs generateBriefManagerInsight for every active brief in the
// workspace that has real material to review (at least one uploaded document
// or at least one linked email), skipping briefs with neither since there'd
// be nothing for the model to work from. Sequential, not parallel: this can
// cover dozens of briefs, and running them concurrently would just hit the
// same rate limits/timeouts faster for no real speed benefit on a background
// bulk job the user isn't watching turn-by-turn.
export async function runBriefManagerBulk(workspaceId: string): Promise<BulkCheckResult> {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) {
        return { total: 0, succeeded: 0, failed: 0, failures: [] };
    }

    const briefs = await prisma.brief.findMany({
        where: {
            workspaceId,
            status: 'active',
            deletedAt: null,
            OR: [
                { documents: { some: {} } },
                { pulseEvents: { some: { inboundEmailId: { not: null } } } },
            ],
        },
        select: { id: true, name: true },
    });

    const result: BulkCheckResult = { total: briefs.length, succeeded: 0, failed: 0, failures: [] };

    for (const brief of briefs) {
        try {
            const generated = await generateBriefManagerInsight(brief.id);
            if (!generated.success) {
                result.failed++;
                result.failures.push({ briefId: brief.id, briefName: brief.name, reason: generated.reason });
                continue;
            }
            await upsertInsightForBrief(workspaceId, brief.id, generated.insight);
            result.succeeded++;
        } catch (error) {
            result.failed++;
            result.failures.push({
                briefId: brief.id,
                briefName: brief.name,
                reason: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    revalidatePath('/pulse');
    return result;
}

// Triggered by "Ask Brief Manager" — always regenerates, bypassing the
// nightly scan's staleness check, since the user explicitly asked for a fresh look.
export async function runBriefManagerNow(briefId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();

    const brief = await prisma.brief.findUnique({ where: { id: briefId }, select: { workspaceId: true } });
    if (!brief || brief.workspaceId !== session.user.workspaceId) {
        return { success: false, error: 'Brief not found' };
    }

    try {
        const generated = await generateBriefManagerInsight(briefId);
        if (!generated.success) {
            return { success: false, error: generated.reason };
        }

        await upsertInsightForBrief(brief.workspaceId, briefId, generated.insight);
        revalidatePath('/pulse');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true };
    } catch (error) {
        console.error('[runBriefManagerNow] Failed:', error);
        return { success: false, error: 'Something went wrong generating this insight — please try again' };
    }
}

export async function viewAgentInsight(insightId: string) {
    const session = await getSession();
    const insight = await prisma.agentInsight.findUnique({ where: { id: insightId }, select: { workspaceId: true } });
    if (!insight || insight.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.agentInsight.update({ where: { id: insightId }, data: { status: 'viewed' } });
    return { success: true };
}

export async function dismissAgentInsight(insightId: string) {
    const session = await getSession();
    const insight = await prisma.agentInsight.findUnique({ where: { id: insightId }, select: { workspaceId: true } });
    if (!insight || insight.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.agentInsight.update({
        where: { id: insightId },
        data: { status: 'dismissed', dismissedAt: new Date() },
    });
    revalidatePath('/pulse');
    return { success: true };
}

export async function resolveAgentInsight(insightId: string) {
    const session = await getSession();
    const insight = await prisma.agentInsight.findUnique({ where: { id: insightId }, select: { workspaceId: true } });
    if (!insight || insight.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.agentInsight.update({
        where: { id: insightId },
        data: { status: 'resolved', resolvedAt: new Date() },
    });
    revalidatePath('/pulse');
    return { success: true };
}
