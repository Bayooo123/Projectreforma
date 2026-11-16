'use server';

import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
import { resolveBrief } from '@/lib/ai-native/resolve-brief';
import { classifyIntent } from '@/lib/ai-native/junior';
import { dispatchAgent } from '@/lib/ai-native/agents';

async function requireWorkspaceContext() {
    const data = await getCurrentUserWithWorkspace();
    if (!data?.user || !data.workspace) throw new Error('Unauthorized: please log in to a workspace.');
    return { userId: data.user.id, workspaceId: data.workspace.id };
}

/**
 * The /ai-native screen's one entry point: Junior classifies the input,
 * then the matching specialist actually runs against real data.
 */
export async function runJunior(input: string, briefRef: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();

    if (!input?.trim()) return { error: 'Type something for Junior to work with.' };

    const brief = briefRef?.trim() ? await resolveBrief(workspaceId, briefRef.trim()) : null;
    const { agent, reason } = await classifyIntent(input);
    const result = await dispatchAgent(agent, { input, brief, workspaceId, userId });

    return { agent, reason, briefName: brief?.name ?? null, ...result };
}

export async function listRecentBriefs() {
    const { workspaceId } = await requireWorkspaceContext();
    return prisma.brief.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, name: true, briefNumber: true, matter: { select: { name: true } } },
    });
}

export async function getLedgerSummary() {
    const { workspaceId } = await requireWorkspaceContext();
    const entries = await prisma.expense.findMany({
        where: { workspaceId },
        orderBy: { date: 'desc' },
        take: 20,
    });
    const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    return {
        total,
        entries: entries.map(e => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            category: e.category,
            date: e.date.toISOString(),
        })),
    };
}
