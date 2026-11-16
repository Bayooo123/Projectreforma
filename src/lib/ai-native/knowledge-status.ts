import { prisma } from '@/lib/prisma';

export async function getKnowledgeStatus(workspaceId: string) {
    const [briefsAndFilings, courtRecords, correspondence, precedents, openGapCount] = await Promise.all([
        prisma.document.count({ where: { brief: { workspaceId } } }),
        prisma.calendarEntry.count({ where: { matter: { workspaceId } } }),
        prisma.inboundEmail.count({ where: { workspaceId } }),
        prisma.draftingTemplate.count({ where: { workspaceId, isPublished: true } }),
        prisma.knowledgeGap.count({ where: { workspaceId, status: 'open' } }),
    ]);

    return {
        sources: [
            { name: 'Briefs & filings', count: briefsAndFilings },
            { name: 'Court records', count: courtRecords },
            { name: 'Correspondence', count: correspondence },
            { name: 'Firm precedents', count: precedents },
        ],
        openGapCount,
    };
}

/**
 * A real, bounded check — not the full semantic "re-reads every brief,
 * filing and email" review the design describes, which would need its own
 * scheduled AI pipeline. This checks exactly one thing: does every active
 * matter have a next date on record? Anything it finds becomes a real
 * KnowledgeGap, not a simulated one.
 */
export async function runKnowledgePass(workspaceId: string) {
    const matters = await prisma.matter.findMany({
        where: { workspaceId, status: 'active', deletedAt: null },
        select: { id: true, name: true, nextCourtDate: true, briefs: { select: { id: true }, take: 1 } },
    });

    let created = 0;
    for (const m of matters) {
        const briefId = m.briefs[0]?.id;
        if (!briefId || m.nextCourtDate) continue;
        const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, briefId, status: 'open' } });
        if (existing) continue;
        await prisma.knowledgeGap.create({
            data: {
                workspaceId,
                briefId,
                text: `No next date recorded for ${m.name}.`,
                hint: 'e.g. Adjourned to 4 December for hearing',
            },
        });
        created++;
    }
    return { checked: matters.length, created };
}
