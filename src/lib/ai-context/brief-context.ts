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

// getCaseChronology is the single canonical case-history builder. It used to
// exist as two separate, unequally-complete implementations: WhatsApp's
// covered only DocumentTimelineEvent facts (dates extracted from inside
// documents), while Eureka's get_brief_timeline covered hearings, tasks,
// document uploads, and recorded agent notes but never looked at
// DocumentTimelineEvent at all. Neither agent had the full picture. This
// version merges every source both of those had, so any surface calling it
// gets the same complete timeline.
export interface ChronologyEvent {
    date: string; // ISO date (YYYY-MM-DD), or the raw as-recorded string when no real date could be parsed
    when: 'past' | 'today' | 'future' | 'undated';
    type: string;
    title: string;
    details?: Record<string, unknown>;
}

export interface CaseChronologyResult {
    brief: { id: string; name: string; briefNumber: string; status: string; client: string | null };
    summary: {
        totalEvents: number;
        pastEvents: number;
        upcomingEvents: number;
        documentsUploaded: number;
        documentsWithOcr: number;
        pendingTasks: number;
        completedTasks: number;
        agentRecordedNotes: number;
        extractedFacts: number;
    };
    events: ChronologyEvent[];
}

export async function getCaseChronology(
    briefId: string,
    workspaceId: string,
    limit = 100,
): Promise<CaseChronologyResult | { error: string }> {
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId, deletedAt: null },
        select: {
            id: true, name: true, briefNumber: true, status: true,
            createdAt: true, dueDate: true, matterId: true,
            client: { select: { name: true } },
        },
    });
    if (!brief) return { error: 'Brief not found' };

    const [extractedFacts, calendarEntries, tasks, documents, agentNotes] = await Promise.all([
        prisma.documentTimelineEvent.findMany({
            where: { briefId },
            select: { eventDate: true, eventDateRaw: true, description: true, documentName: true },
            take: limit,
        }),
        prisma.calendarEntry.findMany({
            where: {
                deletedAt: null,
                OR: [{ briefId }, ...(brief.matterId ? [{ matterId: brief.matterId }] : [])],
            },
            select: {
                date: true, type: true, court: true, judge: true,
                proceedings: true, outcome: true, adjournedTo: true, adjournedFor: true,
                appearances: { select: { name: true } },
            },
            orderBy: { date: 'asc' },
        }),
        prisma.task.findMany({
            where: { briefId },
            select: {
                title: true, description: true, status: true, priority: true,
                createdAt: true, dueDate: true, completedAt: true,
                assignedTo: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.document.findMany({
            where: { briefId },
            select: { name: true, uploadedAt: true, ocrStatus: true, ocrText: true },
            orderBy: { uploadedAt: 'asc' },
        }),
        // Facts a lawyer told an agent directly, outside any document — recorded
        // via web chat (agent_memory) or WhatsApp's record_brief_update
        // (status_changed). Both types must be included or a fact recorded
        // through one channel is invisible to agents reading through another.
        prisma.briefActivityLog.findMany({
            where: { briefId, activityType: { in: ['agent_memory', 'status_changed'] } },
            select: { timestamp: true, description: true, metadata: true },
            orderBy: { timestamp: 'asc' },
        }),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const classify = (date: Date): 'past' | 'today' | 'future' => {
        if (date < todayStart) return 'past';
        if (date.toDateString() === now.toDateString()) return 'today';
        return 'future';
    };
    const isoDate = (date: Date) => date.toISOString().split('T')[0];

    const events: ChronologyEvent[] = [];

    events.push({ date: isoDate(brief.createdAt), when: classify(brief.createdAt), type: 'brief_created', title: 'Brief opened' });
    if (brief.dueDate) events.push({ date: isoDate(brief.dueDate), when: classify(brief.dueDate), type: 'brief_due', title: 'Brief due date' });

    for (const f of extractedFacts) {
        events.push({
            date: f.eventDate ? isoDate(f.eventDate) : f.eventDateRaw,
            when: f.eventDate ? classify(f.eventDate) : 'undated',
            type: 'document_fact',
            title: f.description,
            details: { source: f.documentName },
        });
    }

    for (const e of calendarEntries) {
        events.push({
            date: isoDate(e.date), when: classify(e.date),
            type: e.type === 'MEETING' ? 'meeting' : 'court_hearing',
            title: e.proceedings || (e.type === 'MEETING' ? 'Meeting' : 'Court Hearing'),
            details: {
                court: e.court, judge: e.judge, outcome: e.outcome,
                adjournedTo: e.adjournedTo, adjournedFor: e.adjournedFor,
                counsel: e.appearances.map(a => a.name),
            },
        });
        if (e.adjournedTo) {
            events.push({
                date: isoDate(e.adjournedTo), when: classify(e.adjournedTo), type: 'court_adjourned',
                title: `Adjournment (from: ${e.proceedings || 'hearing'})`, details: { court: e.court },
            });
        }
    }

    for (const t of tasks) {
        events.push({
            date: isoDate(t.createdAt), when: classify(t.createdAt), type: 'task_created', title: t.title,
            details: { priority: t.priority, assignedTo: t.assignedTo?.name, description: t.description },
        });
        if (t.completedAt) {
            events.push({ date: isoDate(t.completedAt), when: classify(t.completedAt), type: 'task_completed', title: `Completed: ${t.title}` });
        } else if (t.dueDate) {
            events.push({ date: isoDate(t.dueDate), when: classify(t.dueDate), type: 'task_deadline', title: `Deadline: ${t.title}`, details: { assignedTo: t.assignedTo?.name } });
        }
    }

    for (const d of documents) {
        events.push({
            date: isoDate(d.uploadedAt), when: classify(d.uploadedAt), type: 'document_uploaded', title: d.name,
            details: {
                ocrStatus: d.ocrStatus,
                content: d.ocrText ? d.ocrText.slice(0, 600) + (d.ocrText.length > 600 ? '…' : '') : null,
            },
        });
    }

    for (const n of agentNotes) {
        const source = (n.metadata as { source?: string } | null)?.source;
        const recordedVia = source === 'meetings_agent' ? 'Meetings agent' : source === 'whatsapp' ? 'WhatsApp' : 'Brief Manager';
        events.push({ date: isoDate(n.timestamp), when: classify(n.timestamp), type: 'agent_note', title: n.description, details: { recordedVia } });
    }

    events.sort((a, b) => {
        if (a.date === 'undated' && b.date === 'undated') return 0;
        if (a.date === 'undated') return 1;
        if (b.date === 'undated') return -1;
        return a.date.localeCompare(b.date);
    });

    return {
        brief: { id: brief.id, name: brief.name, briefNumber: brief.briefNumber, status: brief.status, client: brief.client?.name ?? null },
        summary: {
            totalEvents: events.length,
            pastEvents: events.filter(e => e.when === 'past').length,
            upcomingEvents: events.filter(e => e.when === 'future').length,
            documentsUploaded: documents.length,
            documentsWithOcr: documents.filter(d => d.ocrStatus === 'completed').length,
            pendingTasks: tasks.filter(t => t.status !== 'completed').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            agentRecordedNotes: agentNotes.length,
            extractedFacts: extractedFacts.length,
        },
        events,
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
