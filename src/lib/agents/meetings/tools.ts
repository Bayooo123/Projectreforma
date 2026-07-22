import { prisma } from '@/lib/prisma';
import { addBriefActivity } from '@/lib/briefs';
import type { MeetingAgentInsightData } from './scan';

function tool(name: string, description: string, properties: Record<string, unknown>, required?: string[]) {
    return { name, description, input_schema: { type: 'object' as const, properties, ...(required && { required }) } };
}

export const MEETINGS_TOOLS = [
    tool('record_meeting_notes', 'Record what happened at this meeting. Call this as soon as the lawyer tells you what was discussed.', {
        notes: { type: 'string', description: 'What was discussed at the meeting, as a clear summary' },
        followUps: { type: 'array', items: { type: 'string' }, description: 'Any follow-up actions or decisions arising from the meeting (optional)' },
    }, ['notes']),

    tool('mark_resolved', 'Mark this meeting check-in as resolved once notes have been recorded.', {
        note: { type: 'string', description: 'Short note on the resolution' },
    }, []),

    tool('dismiss', 'Dismiss this check-in without recording notes — e.g. the meeting was cancelled or notes aren\'t needed.', {
        note: { type: 'string', description: 'Short note on why' },
    }, []),
];

async function recordMeetingNotes(briefId: string, insightId: string, userId: string | undefined, insightData: MeetingAgentInsightData, notes: string, followUps: string[]) {
    const outcome = followUps.length > 0 ? `Follow-ups: ${followUps.join('; ')}` : 'Discussed — no further action required';

    await prisma.calendarEntry.update({
        where: { id: insightData.calendarEntryId },
        data: { proceedings: notes, outcome },
    });

    const statement = `Meeting on ${new Date(insightData.meetingDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}: ${notes}${followUps.length > 0 ? ` Follow-ups: ${followUps.join('; ')}` : ''}`;
    await addBriefActivity(briefId, 'agent_memory', statement, { source: 'meetings_agent', insightId, calendarEntryId: insightData.calendarEntryId }, userId);

    return { success: true, message: 'Meeting notes recorded.' };
}

export async function executeMeetingsTool(
    name: string,
    input: Record<string, unknown>,
    ctx: { insightId: string; briefId: string; insightData: MeetingAgentInsightData; userId?: string },
) {
    switch (name) {
        case 'record_meeting_notes': {
            const followUps = Array.isArray(input.followUps) ? input.followUps.filter((f): f is string => typeof f === 'string') : [];
            return recordMeetingNotes(ctx.briefId, ctx.insightId, ctx.userId, ctx.insightData, String(input.notes ?? ''), followUps);
        }

        case 'mark_resolved':
            await prisma.agentInsight.update({ where: { id: ctx.insightId }, data: { status: 'resolved', resolvedAt: new Date() } });
            return { success: true, resolved: true, message: 'Marked resolved.' };

        case 'dismiss':
            await prisma.agentInsight.update({ where: { id: ctx.insightId }, data: { status: 'dismissed', dismissedAt: new Date() } });
            return { success: true, dismissed: true, message: 'Dismissed.' };

        default:
            return { error: `Unknown tool: ${name}` };
    }
}
