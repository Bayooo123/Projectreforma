import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addBriefActivity } from '@/lib/briefs';

// Secret token to verify the request comes from Zoho Flow
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET;

interface ZohoEmailPayload {
    from: string;
    to: string;
    subject: string;
    body: string;
    receivedAt?: string;
}

export async function POST(req: NextRequest) {
    // 1. Security Check
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('secret');

    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        console.log('[Zoho Webhook] Unauthorized request - invalid secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Parse JSON payload from Zoho Flow
        const payload: ZohoEmailPayload = await req.json();
        const { from, to, subject, body, receivedAt } = payload;

        console.log(`[Zoho Webhook] Received email from: ${from}, subject: ${subject}`);

        // 3. Extract sender email if in "Name <email>" format
        const fromEmailMatch = from?.match(/<(.+)>/);
        const fromEmail = fromEmailMatch ? fromEmailMatch[1] : (from || '').trim();

        // 4. Try to identify a Brief from the recipient address
        // Format: brief-[inboundEmailId]@domain or just check "to" field
        const briefMatch = to?.match(/brief-([a-zA-Z0-9-]+)@/);
        const inboundId = briefMatch ? briefMatch[1] : null;

        let brief = null;
        let routingMethod = 'Unrouted';

        if (inboundId) {
            brief = await prisma.brief.findUnique({
                where: { inboundEmailId: inboundId },
                select: { id: true, name: true, workspaceId: true }
            });
            if (brief) routingMethod = 'Direct Match (Brief ID)';
        }

        // 5. Fallback: Try to find brief by subject content matching
        if (!brief && subject) {
            // Look for brief numbers like "BRF-001" in subject
            const briefNumMatch = subject.match(/BRF-\d{3,}/i);
            if (briefNumMatch) {
                brief = await prisma.brief.findFirst({
                    where: { briefNumber: { contains: briefNumMatch[0], mode: 'insensitive' } },
                    select: { id: true, name: true, workspaceId: true }
                });
                if (brief) routingMethod = 'Subject Pattern Match';
            }
        }

        // 6. Log to BriefActivityLog if we found a brief
        if (brief) {
            await addBriefActivity(
                brief.id,
                'email_received',
                `📧 Rec'd: ${subject || '(No Subject)'}`,
                {
                    emailSubject: subject,
                    emailSender: fromEmail,
                    emailBody: body?.substring(0, 1000), // Truncate for storage
                    routingMethod,
                    receivedAt: receivedAt || new Date().toISOString()
                },
                undefined // System action, no user
            );

            console.log(`[Zoho Webhook] Logged email to Brief: ${brief.name} (${brief.id})`);

            return NextResponse.json({
                success: true,
                message: 'Email logged to Brief activity',
                briefId: brief.id,
                briefName: brief.name,
                routingMethod
            });
        }

        // 7. Fallback: Try to find user by sender email and log to MatterActivityLog
        const user = await prisma.user.findUnique({
            where: { email: fromEmail }
        });

        if (user) {
            // Find user's primary workspace
            const membership = await prisma.workspaceMember.findFirst({
                where: { userId: user.id }
            });

            if (membership) {
                // Create a task to track the unrouted email
                await prisma.task.create({
                    data: {
                        title: `📧 Email: ${subject || '(No Subject)'}`,
                        description: body?.substring(0, 500) || 'Email received via Zoho',
                        status: 'pending',
                        priority: 'medium',
                        source: 'email',
                        sourceEmail: fromEmail,
                        emailSubject: subject,
                        emailBody: body,
                        assignedById: user.id,
                        workspaceId: membership.workspaceId
                    }
                });

                console.log(`[Zoho Webhook] Created task for unrouted email from known user: ${fromEmail}`);

                return NextResponse.json({
                    success: true,
                    message: 'Email logged as Task (no brief match)',
                    routingMethod: 'User Fallback'
                });
            }
        }

        // 8. No match at all - still return 200 to prevent retries
        console.log(`[Zoho Webhook] Could not route email from: ${fromEmail}`);
        return NextResponse.json({
            success: false,
            message: 'Email received but could not be routed',
            hint: 'Sender not recognized and no brief ID in recipient'
        }, { status: 200 }); // 200 to prevent webhook retries

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
