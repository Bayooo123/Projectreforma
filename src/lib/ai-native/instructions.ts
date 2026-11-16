import { prisma } from '@/lib/prisma';

export async function addInstruction(workspaceId: string, userId: string, text: string, briefId?: string | null) {
    return prisma.instruction.create({
        data: { workspaceId, briefId: briefId ?? null, text, createdById: userId },
    });
}

/** Firm-wide instructions (briefId null) always apply alongside whatever is scoped to the brief being viewed. */
export async function listInstructions(workspaceId: string, briefId?: string | null) {
    return prisma.instruction.findMany({
        where: {
            workspaceId,
            ...(briefId ? { OR: [{ briefId }, { briefId: null }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { brief: { select: { name: true } } },
    });
}
