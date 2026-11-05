import { prisma } from '@/lib/prisma';
import { MilestoneStatus } from '@prisma/client';

function fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

/**
 * Assembles First Draft's post-court-update context: what happened at the
 * most recent court attendance, the next date, what the client was last
 * told, and which procedural steps are still open — reusing the models
 * that already exist for each (CalendarEntry, ClientCommunication,
 * LitigationMilestone) rather than inventing a new data source.
 */
export async function assemblePostCourtContext(matterId: string, calendarEntryId: string): Promise<string> {
    const [calendarEntry, matter, lastCommunication, openMilestones] = await Promise.all([
        prisma.calendarEntry.findUnique({
            where: { id: calendarEntryId },
            select: { date: true, court: true, judge: true, proceedings: true, outcome: true, adjournedFor: true, adjournedTo: true },
        }),
        prisma.matter.findUnique({
            where: { id: matterId },
            select: { name: true, nextCourtDate: true, client: { select: { name: true } } },
        }),
        prisma.clientCommunication.findFirst({
            where: { matterId },
            orderBy: { sentAt: 'desc' },
            select: { subject: true, summary: true, sentAt: true },
        }),
        prisma.litigationMilestone.findMany({
            where: { matterId, status: { not: MilestoneStatus.COMPLETED } },
            select: { type: true, dueDate: true },
            orderBy: { dueDate: 'asc' },
        }),
    ]);

    if (!calendarEntry) throw new Error(`Calendar entry ${calendarEntryId} not found`);
    if (!matter) throw new Error(`Matter ${matterId} not found`);

    const lines: string[] = [`Matter: ${matter.name}`];
    if (matter.client?.name) lines.push(`Client: ${matter.client.name}`);

    lines.push(`\nMost recent court attendance (${fmtDate(calendarEntry.date)}):`);
    if (calendarEntry.court) lines.push(`Court: ${calendarEntry.court}${calendarEntry.judge ? ` (${calendarEntry.judge})` : ''}`);
    lines.push(`What happened: ${calendarEntry.proceedings || 'Not recorded'}`);
    if (calendarEntry.outcome) lines.push(`Outcome: ${calendarEntry.outcome}`);

    const nextDate = calendarEntry.adjournedTo || matter.nextCourtDate;
    if (nextDate) {
        lines.push(`Next court date: ${fmtDate(nextDate)}${calendarEntry.adjournedFor ? ` (for ${calendarEntry.adjournedFor})` : ''}`);
    } else {
        lines.push('Next court date: not yet fixed.');
    }

    if (lastCommunication) {
        lines.push(`\nWhat the client was last told (${fmtDate(lastCommunication.sentAt)}): "${lastCommunication.subject}" — ${lastCommunication.summary}`);
    } else {
        lines.push('\nNo prior client update is on record for this matter — this may be the first one.');
    }

    if (openMilestones.length > 0) {
        const steps = openMilestones.map(m => m.type + (m.dueDate ? ` (due ${fmtDate(m.dueDate)})` : '')).join(', ');
        lines.push(`\nOther open procedural steps on this matter: ${steps}.`);
    }

    return lines.join('\n');
}
