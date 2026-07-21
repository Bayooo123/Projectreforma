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

export async function getOpenAgentInsights(workspaceId: string) {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    return prisma.agentInsight.findMany({
        where: { workspaceId, agentType: 'brief_manager', status: { in: ['new', 'viewed'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { brief: { select: { id: true, name: true, briefNumber: true } } },
    });
}

// Triggered by "Ask Brief Manager" — always regenerates, bypassing the
// nightly scan's staleness check, since the user explicitly asked for a fresh look.
export async function runBriefManagerNow(briefId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();

    const brief = await prisma.brief.findUnique({ where: { id: briefId }, select: { workspaceId: true } });
    if (!brief || brief.workspaceId !== session.user.workspaceId) {
        return { success: false, error: 'Brief not found' };
    }

    const generated = await generateBriefManagerInsight(briefId);
    if (!generated) {
        return { success: false, error: 'Could not generate an insight for this brief right now' };
    }

    await upsertInsightForBrief(brief.workspaceId, briefId, generated);
    revalidatePath('/pulse');
    revalidatePath(`/briefs/${briefId}`);
    return { success: true };
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
