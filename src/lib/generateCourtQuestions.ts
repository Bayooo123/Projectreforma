import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

async function buildQuestion(
    matterName: string,
    caseNumber: string | null,
    court: string | null,
    judge: string | null,
    hearingDate: Date,
    hearingTitle: string | null,
): Promise<string> {
    const dateStr = hearingDate.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const fallback = `What was the outcome of the ${hearingTitle || 'court appearance'} for ${matterName} on ${dateStr}? Please record any adjournment, ruling, or order made.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return fallback;

    try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            messages: [{
                role: 'user',
                content: `A court hearing for a Nigerian law firm happened but no proceedings were recorded. Write one specific, concise question to ask the escalation officer about what happened. Focus on capturing the actionable outcome (ruling, adjournment date, orders made).

Matter: ${matterName}${caseNumber ? ` (${caseNumber})` : ''}
Court: ${court || 'Not specified'}
Judge: ${judge || 'Not specified'}
Hearing date: ${dateStr}
Hearing purpose: ${hearingTitle || 'Court appearance'}

Reply with only the question — no preamble, no explanation.`,
            }],
        });
        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        return text || fallback;
    } catch {
        return fallback;
    }
}

export async function generateCourtQuestions(): Promise<{ generated: number; errors: string[] }> {
    const errors: string[] = [];
    let generated = 0;

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const entries = await prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            date: { gte: twoDaysAgo, lte: endOfToday },
            matterId: { not: null },
            OR: [{ proceedings: null }, { proceedings: '' }],
            matterQuestions: { none: {} },
        },
        include: {
            matter: {
                select: {
                    id: true,
                    name: true,
                    caseNumber: true,
                    court: true,
                    judge: true,
                    workspaceId: true,
                },
            },
        },
    });

    for (const entry of entries) {
        if (!entry.matter) continue;

        try {
            const question = await buildQuestion(
                entry.matter.name,
                entry.matter.caseNumber,
                entry.court || entry.matter.court,
                entry.judge || entry.matter.judge,
                entry.date,
                entry.title,
            );

            await prisma.matterQuestion.create({
                data: {
                    workspaceId: entry.matter.workspaceId,
                    matterId: entry.matter.id,
                    calendarEntryId: entry.id,
                    question,
                    context: `Hearing: ${entry.title || 'Court appearance'} · ${entry.date.toLocaleDateString('en-GB')}`,
                },
            });

            generated++;
        } catch (err) {
            errors.push(`Entry ${entry.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return { generated, errors };
}
