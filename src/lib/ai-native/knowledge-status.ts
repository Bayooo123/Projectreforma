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

const STALE_MATTER_DAYS = 60;
const STALE_DRAFT_HOURS = 24;

/**
 * A real, bounded check — not the full semantic "re-reads every brief,
 * filing and email" review the design describes, which would need its own
 * scheduled AI pipeline. It checks three concrete things, each becoming a
 * real KnowledgeGap (never a simulated one) when it finds something:
 *
 * 1. Does every active matter have a next date on record?
 * 2. Has anything actually landed on an active matter recently — a court
 *    entry, a filed document, an inbound email — or has it gone quiet
 *    (e.g. nothing since a correspondence in August, checked in November)?
 * 3. Is a client-update letter still sitting unreviewed well after it was
 *    drafted and sent to the lawyer — over WhatsApp especially, where
 *    there's no in-app "Approve" to close the loop, so Reforma would
 *    otherwise never learn whether, or in what final form, it went out?
 */
export async function runKnowledgePass(workspaceId: string) {
    const matters = await prisma.matter.findMany({
        where: { workspaceId, status: 'active', deletedAt: null },
        select: { id: true, name: true, nextCourtDate: true, briefs: { select: { id: true }, take: 1 } },
    });

    let created = 0;
    for (const m of matters) {
        const briefId = m.briefs[0]?.id;
        if (!briefId) continue;

        if (!m.nextCourtDate) {
            const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, briefId, status: 'open', category: 'info' } });
            if (!existing) {
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
        }

        const [lastCalendar, lastDocument, lastEmail] = await Promise.all([
            prisma.calendarEntry.findFirst({ where: { matterId: m.id }, orderBy: { date: 'desc' }, select: { date: true } }),
            prisma.document.findFirst({ where: { briefId }, orderBy: { uploadedAt: 'desc' }, select: { uploadedAt: true } }),
            prisma.inboundEmail.findFirst({ where: { matterId: m.id }, orderBy: { receivedAt: 'desc' }, select: { receivedAt: true } }),
        ]);
        const signals = [lastCalendar?.date, lastDocument?.uploadedAt, lastEmail?.receivedAt].filter((d): d is Date => !!d);
        const lastActivity = signals.length ? new Date(Math.max(...signals.map(d => d.getTime()))) : null;

        if (lastActivity && Date.now() - lastActivity.getTime() > STALE_MATTER_DAYS * 24 * 3600_000) {
            const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, briefId, status: 'open', category: 'stale_matter' } });
            if (!existing) {
                const since = lastActivity.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                await prisma.knowledgeGap.create({
                    data: {
                        workspaceId,
                        briefId,
                        category: 'stale_matter',
                        refId: m.id,
                        text: `Nothing new on ${m.name} since ${since} — check whether a filing, email, or update has been missed.`,
                        hint: 'e.g. Still awaiting the other side\'s response',
                    },
                });
                created++;
            }
        }
    }

    const stalePendingDrafts = await prisma.clientUpdateDraft.findMany({
        where: { workspaceId, status: 'pending', createdAt: { lt: new Date(Date.now() - STALE_DRAFT_HOURS * 3600_000) } },
        select: { id: true, createdAt: true, matter: { select: { name: true, briefs: { select: { id: true }, take: 1 } } } },
    });
    for (const d of stalePendingDrafts) {
        const briefId = d.matter.briefs[0]?.id;
        if (!briefId) continue;
        const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, category: 'confirm_update', refId: d.id, status: 'open' } });
        if (existing) continue;
        const since = d.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        await prisma.knowledgeGap.create({
            data: {
                workspaceId,
                briefId,
                category: 'confirm_update',
                refId: d.id,
                text: `A client-update letter for ${d.matter.name}, drafted ${since}, is still unreviewed — reply with the final text you sent, or "sent as drafted" if nothing changed.`,
                hint: 'Paste the final text, or type "sent as drafted"',
            },
        });
        created++;
    }

    return { checked: matters.length, created };
}
