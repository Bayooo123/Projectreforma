import { prisma } from '@/lib/prisma';

// Shared, read-only context-gathering functions used by more than one AI
// surface (Pulse's Brief Manager, Eureka, the WhatsApp agent). Each surface
// previously hand-rolled its own near-identical version of these three
// queries — brief search, case chronology, upcoming hearings — found
// duplicated verbatim (or near enough) across all three during an
// architecture review. This module is step one of consolidating them: one
// implementation, called from wherever it's needed, instead of copy-pasted
// per surface and free to drift apart.
//
// Surfaces with genuinely different needs (e.g. Eureka's much richer,
// multi-source get_brief_timeline) aren't forced through here — only the
// pieces that were actually the same query in more than one place.

export interface BriefSearchResult {
    id: string;
    name: string;
    briefNumber: string;
    status: string;
    client: string | null;
    matter: string | null;
    dueDate: string | null;
}

export async function searchBriefsByQuery(query: string, workspaceId: string, limit = 5): Promise<BriefSearchResult[]> {
    const results = await prisma.brief.findMany({
        where: {
            workspaceId,
            deletedAt: null,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { client: { name: { contains: query, mode: 'insensitive' } } },
                { matter: { name: { contains: query, mode: 'insensitive' } } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            status: true,
            dueDate: true,
            client: { select: { name: true } },
            matter: { select: { name: true } },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
    });
    return results.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        status: b.status,
        client: b.client?.name ?? null,
        matter: b.matter?.name ?? null,
        dueDate: b.dueDate?.toISOString().split('T')[0] ?? null,
    }));
}

export interface CaseChronologyEvent {
    date: string | null;
    description: string;
    source: string;
}

export interface CaseChronologyResult {
    briefName: string;
    eventCount: number;
    events: CaseChronologyEvent[];
}

export async function getCaseChronology(
    briefId: string,
    workspaceId: string,
    limit = 30,
): Promise<CaseChronologyResult | { error: string }> {
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId },
        select: { id: true, name: true },
    });
    if (!brief) return { error: 'Brief not found' };

    const events = await prisma.documentTimelineEvent.findMany({
        where: { briefId },
        select: { eventDate: true, eventDateRaw: true, description: true, documentName: true },
        take: limit,
    });

    const sorted = events.sort((a, b) => {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return a.eventDate.getTime() - b.eventDate.getTime();
    });

    return {
        briefName: brief.name,
        eventCount: sorted.length,
        events: sorted.map(e => ({
            date: e.eventDate?.toISOString().split('T')[0] ?? e.eventDateRaw,
            description: e.description,
            source: e.documentName,
        })),
    };
}

export interface UpcomingHearing {
    date: string;
    title: string | null;
    type: string | null;
    court: string | null;
    judge: string | null;
    brief: string | null;
    matter: string | null;
}

export async function getUpcomingHearingsForWorkspace(
    workspaceId: string,
    daysAhead = 30,
    limit = 15,
): Promise<UpcomingHearing[]> {
    const from = new Date();
    const to = new Date(from.getTime() + daysAhead * 86_400_000);

    const entries = await prisma.calendarEntry.findMany({
        where: {
            date: { gte: from, lte: to },
            deletedAt: null,
            OR: [
                { brief: { workspaceId } },
                { matter: { workspaceId } },
            ],
        },
        select: {
            date: true,
            title: true,
            type: true,
            court: true,
            judge: true,
            brief: { select: { name: true } },
            matter: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: limit,
    });

    return entries.map(e => ({
        date: e.date.toISOString().split('T')[0],
        title: e.title,
        type: e.type,
        court: e.court ?? null,
        judge: e.judge ?? null,
        brief: e.brief?.name ?? null,
        matter: e.matter?.name ?? null,
    }));
}
