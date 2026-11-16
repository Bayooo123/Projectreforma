import { prisma } from '@/lib/prisma';

export async function findOrCreateOpenGap(workspaceId: string, briefId: string, text: string, hint?: string | null) {
    const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, briefId, status: 'open' } });
    if (existing) return existing;
    return prisma.knowledgeGap.create({ data: { workspaceId, briefId, text, hint: hint ?? null } });
}

/** Answering a gap also saves an Instruction, so the same gap doesn't get raised again once Junior knows the answer. */
export async function resolveGap(workspaceId: string, userId: string, gapId: string, answer: string) {
    const gap = await prisma.knowledgeGap.findFirst({ where: { id: gapId, workspaceId } });
    if (!gap) return { error: 'Gap not found.' };
    if (!answer.trim()) return { error: 'Type an answer first.' };

    await prisma.knowledgeGap.update({
        where: { id: gapId },
        data: { status: 'closed', answer: answer.trim(), resolvedAt: new Date() },
    });
    const instruction = await prisma.instruction.create({
        data: { workspaceId, briefId: gap.briefId, text: answer.trim(), createdById: userId },
    });
    return { success: true as const, instruction };
}

export async function listOpenGaps(workspaceId: string, briefId?: string | null) {
    return prisma.knowledgeGap.findMany({
        where: { workspaceId, status: 'open', ...(briefId ? { briefId } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { brief: { select: { name: true } } },
    });
}
