import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { ingestInboundEmail, resolveWorkspaceByRecipient } from '@/lib/services/email-ingestion';

// Secret token to verify the request comes from Zoho Flow
const WEBHOOK_SECRET = config.EMAIL_WEBHOOK_SECRET;

interface ZohoEmailPayload {
    from: string;
    to: string;
    subject: string;
    body: string;
    receivedAt?: string;
    messageId?: string;
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('secret');
    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        console.log('[Zoho Webhook] Unauthorized request - invalid secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload: ZohoEmailPayload = await req.json();
        const { from, to, subject, body } = payload;

        console.log(`[Zoho Webhook] Received email from: ${from}, subject: ${subject}`);

        const fromEmailMatch = from?.match(/<(.+)>/);
        const fromEmail = (fromEmailMatch ? fromEmailMatch[1] : (from || '')).trim();

        // Resolve workspace the same way every other inbound-email integration
        // does — by the recipient address's WorkspaceEmailConfig — falling back
        // to the sender's own workspace membership, then the oldest workspace,
        // only for the workspaces that don't have an inbound alias configured
        // yet (today, that's every workspace except ASCOLP).
        let workspaceId = to ? await resolveWorkspaceByRecipient(to) : null;
        if (!workspaceId) {
            const user = await prisma.user.findUnique({ where: { email: fromEmail } });
            if (user) {
                const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
                workspaceId = membership?.workspaceId ?? null;
            }
        }
        if (!workspaceId) {
            const fallbackWorkspace = await prisma.workspace.findFirst({
                orderBy: { createdAt: 'asc' },
                select: { id: true },
            });
            workspaceId = fallbackWorkspace?.id ?? null;
        }

        if (!workspaceId) {
            console.log('[Zoho Webhook] No workspace available to route this email into');
            return NextResponse.json({ success: false, message: 'No workspace available' }, { status: 200 });
        }

        // Permanent, queryable record that Zoho actually called this endpoint —
        // independent of whether ingestion below succeeds, and independent of
        // Vercel's short runtime-log retention. Without this, "has Zoho even
        // been hitting this URL" was only answerable while logs happened to
        // still be around; every future silence question now has a real
        // answer via scripts/diagnose-email-ingestion.ts instead of a guess.
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
        if (workspace) {
            await prisma.workspaceActivityLog.create({
                data: {
                    workspaceId,
                    userId: workspace.ownerId,
                    resource: 'EMAIL_WEBHOOK',
                    action: 'zoho_hit',
                    resourceName: subject || '(No Subject)',
                    metadata: { from: fromEmail, to: to ?? null },
                },
            }).catch(err => console.error('[Zoho Webhook] Failed to record hit log:', err));
        }

        const result = await ingestInboundEmail({
            workspaceId,
            fromEmail,
            subject: subject || '(No Subject)',
            body: body || '',
            // Was previously backwards — "messageId: receivedAt ? undefined :
            // payload.messageId" discarded the real Message-ID on every payload
            // that included a receivedAt timestamp, which Zoho's payloads
            // always do in practice. That silently starved ingestInboundEmail's
            // primary dedup path (exact Message-ID match), leaving it always
            // falling back to the narrower same-sender+subject+2-minute window.
            messageId: payload.messageId,
            recipientRaw: to,
            attachments: [],
            source: 'zoho',
        });

        if (result.filtered) return NextResponse.json({ success: true, message: 'Filtered as noise' });
        if (result.duplicate) return NextResponse.json({ success: true, message: 'Duplicate, already logged' });

        console.log(`[Zoho Webhook] Routed: ${result.briefName ?? 'Unmatched'} (${result.routingMethod})`);
        return NextResponse.json({
            success: true,
            briefId: result.briefId,
            briefName: result.briefName,
            routingMethod: result.routingMethod,
            pulseEventId: result.pulseEventId,
        });
    } catch (error) {
        console.error('[Zoho Webhook] Error processing email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Allow GET for webhook verification (some services ping the URL)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('secret');

    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        message: 'Zoho Email Webhook is active',
        timestamp: new Date().toISOString()
    });
}
