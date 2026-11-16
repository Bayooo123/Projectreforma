import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth-utils';

/**
 * Exports sent client-update drafts as instruction-tuning pairs: the context
 * the AI was given (matter, client, what happened in court) as the prompt,
 * and finalText — what the lawyer actually sent, after any edits — as the
 * target. This is the real house-style signal: every edit a lawyer makes to
 * an AI draft before sending it is free, firm-specific training data. Scoped
 * to sent drafts only (status='sent'), since draftText/finalText only
 * diverges meaningfully once a human has actually reviewed and approved it.
 */
export async function GET(req: NextRequest) {
    await requirePlatformAdmin();

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId query param is required' }, { status: 400 });
    }

    const drafts = await prisma.clientUpdateDraft.findMany({
        where: { workspaceId, status: 'sent', finalText: { not: null } },
        orderBy: { sentAt: 'asc' },
        include: {
            matter: {
                select: {
                    name: true,
                    court: true,
                    caseNumber: true,
                    client: { select: { name: true, company: true } },
                },
            },
            calendarEntry: { select: { date: true, proceedings: true, outcome: true } },
        },
    });

    const lines = drafts.map((d) => {
        const client = d.matter.client;
        const context = [
            `Matter: ${d.matter.name}`,
            d.matter.court ? `Court: ${d.matter.court}` : null,
            d.matter.caseNumber ? `Suit number: ${d.matter.caseNumber}` : null,
            client ? `Client: ${client.name}${client.company ? ` (${client.company})` : ''}` : null,
            d.calendarEntry?.date ? `Date of proceeding: ${d.calendarEntry.date.toISOString().slice(0, 10)}` : null,
            d.calendarEntry?.proceedings ? `What happened: ${d.calendarEntry.proceedings}` : null,
            d.calendarEntry?.outcome ? `Outcome: ${d.calendarEntry.outcome}` : null,
        ].filter(Boolean).join('\n');

        return JSON.stringify({
            id: d.id,
            context,
            draftText: d.draftText,
            finalText: d.finalText,
            edited: d.draftText.trim() !== (d.finalText ?? '').trim(),
        });
    });

    const body = lines.join('\n');
    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/jsonl; charset=utf-8',
            'Content-Disposition': `attachment; filename="training-data-${workspaceId}.jsonl"`,
        },
    });
}
