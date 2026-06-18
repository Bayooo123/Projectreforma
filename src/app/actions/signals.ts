'use server';

import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import type { ChronologyRow } from '@/lib/services/brief-summary-generator';

export interface EmailSignal {
    id: string;
    intent: string;
    urgency: string;
    title: string;
    summary: string;
    senderName: string | null;
    senderEmail: string | null;
    actionItems: unknown;
    createdAt: Date;
    status: string;
    inboundEmail: {
        id: string;
        subject: string;
        fromName: string | null;
        fromEmail: string;
        body: string | null;
        bodyPreview: string | null;
        receivedAt: Date;
    } | null;
    brief: {
        id: string;
        name: string;
        category: string;
        status: string;
        aiSummaryProse: string | null;
        aiSummaryChronology: ChronologyRow[] | null;
        client: { name: string } | null;
    } | null;
}

export async function getEmailSignals(): Promise<EmailSignal[]> {
    const session = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: session.id },
        select: { workspaceId: true },
    });
    if (!membership) return [];

    const events = await prisma.pulseEvent.findMany({
        where: {
            workspaceId: membership.workspaceId,
            inboundEmailId: { not: null },
            status: { in: ['new', 'viewed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            inboundEmail: {
                select: {
                    id: true,
                    subject: true,
                    fromName: true,
                    fromEmail: true,
                    body: true,
                    bodyPreview: true,
                    receivedAt: true,
                },
            },
            brief: {
                select: {
                    id: true,
                    name: true,
                    category: true,
                    status: true,
                    aiSummaryProse: true,
                    aiSummaryChronology: true,
                    client: { select: { name: true } },
                },
            },
        },
    });

    return events.map(e => ({
        ...e,
        brief: e.brief
            ? {
                ...e.brief,
                aiSummaryChronology: e.brief.aiSummaryChronology as ChronologyRow[] | null,
            }
            : null,
    }));
}

export async function generateSignalDraft(
    pulseEventId: string,
): Promise<{ draft: string } | { error: string }> {
    await requireAuth();

    const event = await prisma.pulseEvent.findUnique({
        where: { id: pulseEventId },
        include: {
            inboundEmail: true,
            brief: {
                select: {
                    name: true,
                    category: true,
                    status: true,
                    aiSummaryProse: true,
                    aiSummaryChronology: true,
                    client: { select: { name: true } },
                },
            },
        },
    });

    if (!event?.inboundEmail) return { error: 'Signal not found or has no linked email.' };

    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) return { error: 'AI service not configured.' };

    const { brief, inboundEmail: email } = event;

    const chronology = brief?.aiSummaryChronology as ChronologyRow[] | null;
    const recentChronology = chronology?.slice(-8).map(r =>
        `${r.dateDisplay || r.date} — ${r.narrative ?? `${r.title ?? ''} ${r.summary ?? ''}`.trim()}`
    ).join('\n') ?? 'No chronology available.';

    const matterBlock = brief
        ? `Brief: ${brief.name}
Client: ${brief.client?.name ?? 'Unknown'}
Category: ${brief.category}
Status: ${brief.status}`
        : 'No brief linked — respond based on email content only.';

    const prompt = `You are a senior legal assistant.

An email has arrived on an active matter. Draft a professional response grounded in the full matter history.

## Matter
${matterBlock}
Signal type: ${event.intent.replace(/_/g, ' ')} | Urgency: ${event.urgency}

## Matter Summary (what has happened up to now)
${brief?.aiSummaryProse ?? 'No summary generated yet for this matter.'}

## Chronology (recent events — earliest to latest)
${recentChronology}

## Incoming Email (the present signal)
From: ${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
Subject: ${email.subject}
Received: ${new Date(email.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

${email.body || email.bodyPreview || 'No email body available.'}

## Action Items Pre-Identified
${event.actionItems ? JSON.stringify(event.actionItems, null, 2) : event.summary}

---

Draft a professional legal response. Requirements:
- Address each specific point raised in the incoming email
- Remain consistent with the matter history above — do not contradict established facts
- Use appropriate legal correspondence tone and structure
- Mark any specific detail the lawyer must confirm as [CONFIRM: description]
- Close with a professional sign-off, leaving the lawyer's name as [LAWYER NAME]

Open with the line:
FIRST DRAFT — FOR LAWYER REVIEW AND APPROVAL BEFORE SENDING

Then the draft:`;

    try {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        if (!text) return { error: 'No draft returned from AI.' };
        return { draft: text };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Draft generation failed: ${msg}` };
    }
}
