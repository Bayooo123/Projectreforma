import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processEmailWithAI, identifyBriefFromContent, BriefCandidate } from '@/lib/services/email-processor';
import { addBriefActivity } from '@/lib/briefs';

export async function POST(request: NextRequest) {
    console.log('📨 Webhook received: Incoming Email');

    try {
        // Handle both JSON (simulation/Postmark) and FormData (SendGrid/Mailgun)
        const contentType = request.headers.get('content-type') || '';

        let recipient = '';
        let sender = '';
        let subject = '';
        let body = '';

        if (contentType.includes('application/json')) {
            const json = await request.json();
            recipient = json.to || json.To || '';
            sender = json.from || json.From || '';
            subject = json.subject || json.Subject || '';
            body = json.text || json.TextBody || json.html || json.HtmlBody || '';
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            recipient = (formData.get('to') || formData.get('To')) as string;
            sender = (formData.get('from') || formData.get('From')) as string;
            subject = (formData.get('subject') || formData.get('Subject')) as string;
            body = ((formData.get('text') || formData.get('TextBody')) as string) ||
                ((formData.get('html') || formData.get('HtmlBody')) as string) || '';
        } else {
            console.error('Unsupported content type:', contentType);
            return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
        }

        console.log('📨 Processing Email:', { recipient, sender, subject });

        let brief = null;
        let identificationReason = 'Direct Match (ID)';

        // Strategy 1: Attempt to parse Brief ID from Recipient (High Confidence)
        // Format: brief-[inboundEmailId]@...
        const match = recipient.match(/brief-([a-zA-Z0-9-]+)@/);
        const inboundId = match ? match[1] : null;

        if (inboundId) {
            brief = await prisma.brief.findUnique({
                where: { inboundEmailId: inboundId },
                select: { id: true, name: true, workspaceId: true }
            });
        }

        // Strategy 2: Content-Based Routing (Fallback)
        if (!brief) {
            console.log('⚠️ No ID found in recipient. Attempting Content-Based Routing...');

            // Fetch ALL active briefs (Limit to most recent 50 for performance/context window)
            // Ideally we should filter by Workspace, but Webhook context is global.
            // Assumption: Sender email might link to a known user/workspace, but for now we look globally (or just fetch top 50 active).
            const candidates = await prisma.brief.findMany({
                where: { status: 'active' },
                take: 50,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    briefNumber: true,
                    client: { select: { name: true } }
                }
            });

            const candidateList: BriefCandidate[] = candidates.map(b => ({
                id: b.id,
                name: b.name,
                briefNumber: b.briefNumber,
                clientName: b.client.name
            }));

            const identification = await identifyBriefFromContent(subject, body, candidateList);

            if (identification.briefId && identification.confidence > 0.6) {
                brief = await prisma.brief.findUnique({
                    where: { id: identification.briefId },
                    select: { id: true, name: true, workspaceId: true }
                });
                identificationReason = `AI Routing: ${identification.reasoning}`;
            } else {
                console.warn('❌ Could not identify brief. Confidence too low:', identification.confidence);
            }
        }

        if (!brief) {
            console.warn('Brief not found / Could not route email.');
            // Log to a generic "Unprocessed Emails" table if it existed
            return NextResponse.json({ error: 'Brief not found and routing failed' }, { status: 404 });
        }

        console.log(`✅ Identified Brief: ${brief.name} (${brief.id}). Method: ${identificationReason}`);

        // Process email content with AI
        const analysis = await processEmailWithAI(subject, body, sender);

        // Create Activity Log entry
        await addBriefActivity(
            brief.id,
            'email_received',
            `📧 Rec'd: ${subject}`,
            {
                emailSubject: subject,
                emailSender: sender,
                emailBody: body,
                aiAnalysis: analysis,
                routingMethod: identificationReason
            },
            undefined // System action
        );

        return NextResponse.json({
            success: true,
            message: 'Email processed and activity logged',
            analysis,
            routing: identificationReason
        });

    } catch (error) {
        console.error('Error processing inbound email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
