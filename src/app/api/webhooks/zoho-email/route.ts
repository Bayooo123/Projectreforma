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
        const { from, to, subject, body, receivedAt } = payload;

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

        const result = await ingestInboundEmail({
            workspaceId,
            fromEmail,
            subject: subject || '(No Subject)',
            body: body || '',
            messageId: receivedAt ? undefined : payload.messageId,
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
