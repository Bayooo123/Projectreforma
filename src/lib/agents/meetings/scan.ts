import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface MeetingAgentInsightData {
    calendarEntryId: string;
    meetingDate: string;
    prompt: string;
}

const LOOKBACK_DAYS = 14;

// Deterministic gap detection — same shape as the existing MISSING_COURT_OUTCOME
// anomaly rule (src/lib/anomaly/detector.ts), just for meetings instead of
// hearings. No LLM call needed to spot "this happened and nobody logged it."
export async function scanMeetingsForWorkspace(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const now = new Date();
    const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);

    const [unloggedMeetings, existingInsights] = await Promise.all([
        prisma.calendarEntry.findMany({
            where: {
                type: 'MEETING',
                briefId: { not: null },
                date: { gte: lookbackStart, lt: now },
                deletedAt: null,
                AND: [
                    { OR: [{ proceedings: null }, { proceedings: '' }] },
                    { OR: [{ outcome: null }, { outcome: '' }] },
                ],
            },
            select: { id: true, date: true, title: true, briefId: true, brief: { select: { name: true } } },
        }),
        prisma.agentInsight.findMany({
            where: { workspaceId, agentType: 'meetings', status: { in: ['new', 'viewed'] } },
            select: { data: true },
        }),
    ]);

    const alreadyTracked = new Set(
        existingInsights.map(i => (i.data as unknown as MeetingAgentInsightData)?.calendarEntryId).filter(Boolean)
    );

    let created = 0, skipped = 0;

    for (const entry of unloggedMeetings) {
        if (!entry.briefId || alreadyTracked.has(entry.id)) { skipped++; continue; }

        const dateStr = entry.date.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
        const data: MeetingAgentInsightData = {
            calendarEntryId: entry.id,
            meetingDate: entry.date.toISOString(),
            prompt: `What was discussed at the meeting on ${dateStr}${entry.title ? ` ("${entry.title}")` : ''}? Any decisions or follow-ups?`,
        };

        await prisma.agentInsight.create({
            data: {
                workspaceId,
                briefId: entry.briefId,
                agentType: 'meetings',
                title: entry.brief?.name ?? entry.title ?? 'Meeting',
                summary: `Meeting on ${dateStr} — no notes recorded yet`,
                data: data as unknown as Prisma.InputJsonValue,
                lastSignalAt: entry.date,
            },
        });
        created++;
    }

    return { created, skipped };
}

export async function scanMeetingsAllWorkspaces(): Promise<void> {
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    await Promise.all(workspaces.map(w => scanMeetingsForWorkspace(w.id).catch(console.error)));
}
