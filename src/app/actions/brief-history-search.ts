'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export type SearchResultType = 'document' | 'note' | 'timeline' | 'hearing' | 'correspondence' | 'task' | 'conversation';

export interface SearchResultItem {
    id: string;
    type: SearchResultType;
    briefId: string;
    briefName: string;
    title: string;
    snippet: string;
    date: Date;
    participant: string | null;
}

export interface SearchFilters {
    dateFrom?: string;
    dateTo?: string;
    type?: SearchResultType;
    participant?: string;
}

const MAX_RESULTS_PER_SOURCE = 25;
const SNIPPET_RADIUS = 120;

function snippetAround(text: string, query: string): string {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text.slice(0, SNIPPET_RADIUS * 2);
    const start = Math.max(0, idx - SNIPPET_RADIUS);
    const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
    return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

// No full-text-search infra exists in this app, and the per-brief data
// volumes here (dozens of rows, not millions) don't warrant standing one up —
// this is a lightweight heuristic, not a real search engine's relevance model.
function scoreResult(query: string, title: string, snippet: string, date: Date): number {
    const q = query.toLowerCase();
    let score = 0;
    if (title.toLowerCase().includes(q)) score += 10;
    const occurrences = snippet.toLowerCase().split(q).length - 1;
    score += Math.min(occurrences, 5);
    const daysOld = (Date.now() - date.getTime()) / 86_400_000;
    score += Math.max(0, 3 - daysOld / 30); // small recency bonus, decays over ~3 months
    return score;
}

export async function searchBriefHistory(workspaceId: string, query: string, filters: SearchFilters = {}): Promise<SearchResultItem[]> {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];
    if (!query || query.trim().length < 2) return [];

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    const [documents, activityLogs, timelineEvents, hearings, correspondence, tasks, insights] = await Promise.all([
        prisma.document.findMany({
            where: {
                brief: { workspaceId },
                OR: [{ name: { contains: query, mode: 'insensitive' } }, { ocrText: { contains: query, mode: 'insensitive' } }],
            },
            orderBy: { uploadedAt: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, name: true, ocrText: true, uploadedAt: true, briefId: true, brief: { select: { name: true } } },
        }),
        prisma.briefActivityLog.findMany({
            where: { brief: { workspaceId }, description: { contains: query, mode: 'insensitive' } },
            orderBy: { timestamp: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, description: true, timestamp: true, briefId: true, activityType: true, brief: { select: { name: true } }, user: { select: { name: true } } },
        }),
        prisma.documentTimelineEvent.findMany({
            where: { brief: { workspaceId }, description: { contains: query, mode: 'insensitive' } },
            orderBy: { eventDate: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, description: true, eventDate: true, createdAt: true, briefId: true, documentName: true, brief: { select: { name: true } } },
        }),
        prisma.calendarEntry.findMany({
            where: {
                briefId: { not: null },
                brief: { workspaceId },
                OR: [
                    { court: { contains: query, mode: 'insensitive' } },
                    { judge: { contains: query, mode: 'insensitive' } },
                    { proceedings: { contains: query, mode: 'insensitive' } },
                    { outcome: { contains: query, mode: 'insensitive' } },
                    { adjournedFor: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { date: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, date: true, court: true, proceedings: true, outcome: true, briefId: true, submittingLawyerName: true, brief: { select: { name: true } } },
        }),
        prisma.pulseEvent.findMany({
            where: {
                workspaceId, briefId: { not: null },
                OR: [{ summary: { contains: query, mode: 'insensitive' } }, { senderName: { contains: query, mode: 'insensitive' } }],
            },
            orderBy: { createdAt: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, summary: true, createdAt: true, briefId: true, senderName: true, intent: true, brief: { select: { name: true } } },
        }),
        prisma.task.findMany({
            where: {
                workspaceId, briefId: { not: null },
                OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }],
            },
            orderBy: { createdAt: 'desc' },
            take: MAX_RESULTS_PER_SOURCE,
            select: { id: true, title: true, description: true, createdAt: true, briefId: true, assignedTo: { select: { name: true } }, brief: { select: { name: true } } },
        }),
        prisma.agentInsight.findMany({
            where: { workspaceId, briefId: { not: null } },
            select: { id: true, briefId: true, messages: true, brief: { select: { name: true } } },
        }),
    ]);

    const results: SearchResultItem[] = [];

    for (const d of documents) {
        if (!d.briefId) continue;
        const text = d.ocrText ?? d.name;
        results.push({
            id: `document-${d.id}`, type: 'document', briefId: d.briefId, briefName: d.brief.name,
            title: d.name, snippet: snippetAround(text, query), date: d.uploadedAt, participant: null,
        });
    }
    for (const a of activityLogs) {
        results.push({
            id: `note-${a.id}`, type: 'note', briefId: a.briefId, briefName: a.brief.name,
            title: a.activityType.replace(/_/g, ' '), snippet: snippetAround(a.description, query), date: a.timestamp,
            participant: a.user?.name ?? null,
        });
    }
    for (const t of timelineEvents) {
        results.push({
            id: `timeline-${t.id}`, type: 'timeline', briefId: t.briefId, briefName: t.brief.name,
            title: t.documentName, snippet: snippetAround(t.description, query), date: t.eventDate ?? t.createdAt, participant: null,
        });
    }
    for (const h of hearings) {
        if (!h.briefId) continue;
        const text = [h.proceedings, h.outcome, h.court].filter(Boolean).join(' — ');
        results.push({
            id: `hearing-${h.id}`, type: 'hearing', briefId: h.briefId, briefName: h.brief!.name,
            title: h.court ? `Hearing at ${h.court}` : 'Hearing', snippet: snippetAround(text, query), date: h.date,
            participant: h.submittingLawyerName ?? null,
        });
    }
    for (const p of correspondence) {
        if (!p.briefId) continue;
        results.push({
            id: `correspondence-${p.id}`, type: 'correspondence', briefId: p.briefId, briefName: p.brief!.name,
            title: p.intent.replace(/_/g, ' '), snippet: snippetAround(p.summary, query), date: p.createdAt,
            participant: p.senderName ?? null,
        });
    }
    for (const t of tasks) {
        if (!t.briefId) continue;
        results.push({
            id: `task-${t.id}`, type: 'task', briefId: t.briefId, briefName: t.brief!.name,
            title: t.title, snippet: snippetAround(t.description ?? t.title, query), date: t.createdAt,
            participant: t.assignedTo?.name ?? null,
        });
    }
    for (const insight of insights) {
        if (!insight.briefId) continue;
        const messages = Array.isArray(insight.messages) ? insight.messages as unknown as { role: string; content: string }[] : [];
        for (const [i, m] of messages.entries()) {
            if (m.content?.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    id: `conversation-${insight.id}-${i}`, type: 'conversation', briefId: insight.briefId, briefName: insight.brief!.name,
                    title: m.role === 'user' ? 'You said' : 'Brief Manager said',
                    snippet: snippetAround(m.content, query), date: new Date(), participant: m.role === 'user' ? 'You' : 'Brief Manager',
                });
            }
        }
    }

    let filtered = results;
    if (filters.type) filtered = filtered.filter(r => r.type === filters.type);
    if (dateFrom) filtered = filtered.filter(r => r.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(r => r.date <= dateTo);
    if (filters.participant) {
        const p = filters.participant.toLowerCase();
        filtered = filtered.filter(r => r.participant?.toLowerCase().includes(p));
    }

    return filtered
        .map(r => ({ r, score: scoreResult(query, r.title, r.snippet, r.date) }))
        .sort((a, b) => b.score - a.score)
        .map(({ r }) => r)
        .slice(0, 50);
}
