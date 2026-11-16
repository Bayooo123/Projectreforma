import { prisma } from '@/lib/prisma';

/**
 * Finds the brief an /ai-native request is about, by id, brief number, or a
 * loose name match — the same resolution a lawyer would expect from typing
 * a reference into WhatsApp. Returns null (not an error) when no reference
 * was given or none matched, since several agents (Proofread, Ledger) don't
 * need a brief at all.
 */
export async function resolveBrief(workspaceId: string, ref: string) {
    const trimmed = ref?.trim();
    if (!trimmed) return null;

    return prisma.brief.findFirst({
        where: {
            workspaceId,
            deletedAt: null,
            OR: [
                { id: trimmed },
                { briefNumber: trimmed },
                { customBriefNumber: trimmed },
                { name: { contains: trimmed, mode: 'insensitive' } },
                { customTitle: { contains: trimmed, mode: 'insensitive' } },
            ],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            matter: { select: { id: true, name: true, court: true, caseNumber: true, judge: true } },
            client: { select: { id: true, name: true, company: true, email: true } },
        },
    });
}

export type ResolvedBrief = Awaited<ReturnType<typeof resolveBrief>>;
