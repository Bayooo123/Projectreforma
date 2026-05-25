import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    classifyEmailIntent,
    identifyBriefFromContent,
    BriefCandidate,
} from '@/lib/services/email-processor';
import { addBriefActivity } from '@/lib/briefs';
import { executeIntentActions } from '@/lib/institutional-memory/actions';

export async function POST(request: NextRequest) {
    console.log('📨 Institutional Memory: Incoming Email');

    try {
        const contentType = request.headers.get('content-type') || '';
        let recipient = '', sender = '', subject = '', body = '';

        if (contentType.includes('application/json')) {
            const json = await request.json();
            recipient = json.to || json.To || '';
            sender    = json.from || json.From || '';
            subject   = json.subject || json.Subject || '';
            body      = json.text || json.TextBody || json.html || json.HtmlBody || '';
        } else if (contentType.includes('multipart/form-data')) {
            const fd  = await request.formData();
            recipient = (fd.get('to')      || fd.get('To'))      as string ?? '';
            sender    = (fd.get('from')    || fd.get('From'))     as string ?? '';
            subject   = (fd.get('subject') || fd.get('Subject'))  as string ?? '';
            body      = ((fd.get('text')   || fd.get('TextBody')) as string)
                     || ((fd.get('html')   || fd.get('HtmlBody')) as string) || '';
        } else {
            return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
        }

        // ── 1. Workspace scoping ─────────────────────────────────────────────
        const toMatch   = recipient.match(/<(.+?)>/) || [null, recipient];
        const toEmail   = (toMatch[1] || recipient).toLowerCase().trim();

        const emailConfig = await prisma.workspaceEmailConfig.findFirst({
            where: { emailAddress: { equals: toEmail, mode: 'insensitive' }, isActive: true },
            select: { workspaceId: true },
        });

        if (!emailConfig) {
            console.log(`📭 No workspace for ${toEmail} — dropping`);
            return NextResponse.json({ received: true });
        }

        const workspaceId = emailConfig.workspaceId;

        // ── 2. Identity resolution ───────────────────────────────────────────
        const senderEmailMatch = sender.match(/<(.+?)>/);
        const senderEmail = (senderEmailMatch ? senderEmailMatch[1] : sender).toLowerCase().trim();
        const senderName  = senderEmailMatch ? sender.replace(/<.+>/, '').trim() : undefined;

        // Match against known clients first
        const knownClient = await prisma.client.findFirst({
            where: { workspaceId, email: { equals: senderEmail, mode: 'insensitive' } },
            select: { id: true, name: true },
        });

        // Upsert FirmContact
        const firmContact = await prisma.firmContact.upsert({
            where: { workspaceId_email: { workspaceId, email: senderEmail } },
            create: {
                workspaceId,
                email: senderEmail,
                name: knownClient?.name || senderName || senderEmail,
                type: knownClient ? 'client' : 'unknown',
                clientId: knownClient?.id,
            },
            update: {
                lastSeen:   new Date(),
                emailCount: { increment: 1 },
                ...(knownClient && { type: 'client', clientId: knownClient.id }),
                ...(senderName && !knownClient && { name: senderName }),
            },
        });

        // ── 3. Intent classification (runs in parallel with brief ID) ────────
        const [intentResult, briefIdResult] = await Promise.all([
            classifyEmailIntent(subject, body, senderEmail),
            (async () => {
                // Strategy A: brief sub-address
                const m = recipient.match(/brief-([a-zA-Z0-9-]+)@/);
                if (m) {
                    return prisma.brief.findFirst({
                        where: { inboundEmailId: m[1], workspaceId },
                        select: { id: true, name: true, lawyerId: true, lawyerInChargeId: true, matterId: true },
                    });
                }
                return null;
            })(),
        ]);

        // ── 4. Brief identification ──────────────────────────────────────────
        let brief = briefIdResult;
        let routingMethod = 'Direct Match (ID)';

        if (!brief) {
            const candidates = await prisma.brief.findMany({
                where: { status: 'active', workspaceId },
                take: 50,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, name: true, briefNumber: true, client: { select: { name: true } } },
            });

            const candidateList: BriefCandidate[] = candidates.map(b => ({
                id: b.id,
                name: b.name,
                briefNumber: b.briefNumber,
                clientName: b.client?.name || 'No Client',
            }));

            const identification = await identifyBriefFromContent(subject, body, candidateList);

            if (identification.briefId && identification.confidence > 0.6) {
                brief = await prisma.brief.findFirst({
                    where: { id: identification.briefId, workspaceId },
                    select: { id: true, name: true, lawyerId: true, lawyerInChargeId: true, matterId: true },
                });
                routingMethod = `AI Routing (${Math.round(identification.confidence * 100)}%): ${identification.reasoning}`;
            }
        }

        // ── 5. Determine assignee ────────────────────────────────────────────
        const assignedToId = brief?.lawyerInChargeId || brief?.lawyerId || null;

        // ── 6. Create PulseEvent ─────────────────────────────────────────────
        const pulseEvent = await prisma.pulseEvent.create({
            data: {
                workspaceId,
                source:      'email',
                intent:      intentResult.intent,
                urgency:     intentResult.urgency,
                title:       intentResult.title,
                summary:     intentResult.summary,
                senderName:  firmContact.name || senderEmail,
                senderEmail,
                briefId:     brief?.id || null,
                contactId:   firmContact.id,
                assignedToId,
                actionItems: intentResult.actionItems,
                status:      'new',
            },
        });

        console.log(`🧠 PulseEvent created: [${intentResult.intent}/${intentResult.urgency}] → ${brief?.name || 'Unmatched'}`);

        // ── 7. Log to brief activity feed ────────────────────────────────────
        if (brief) {
            await addBriefActivity(
                brief.id,
                'email_received',
                `📧 ${intentResult.title}`,
                {
                    emailSubject:  subject,
                    emailSender:   sender,
                    emailBody:     body,
                    intent:        intentResult.intent,
                    urgency:       intentResult.urgency,
                    summary:       intentResult.summary,
                    actionItems:   intentResult.actionItems,
                    pulseEventId:  pulseEvent.id,
                    routingMethod,
                },
                undefined
            );
        } else {
            // Still log to InboundEmail for workspace inbox
            await prisma.inboundEmail.create({
                data: {
                    workspaceId,
                    fromEmail:   senderEmail,
                    fromName:    firmContact.name || undefined,
                    subject,
                    bodyPreview: body.substring(0, 500),
                    receivedAt:  new Date(),
                },
            });
        }

        // ── 8. Execute intent actions (async — don't block response) ────────
        executeIntentActions({
            workspaceId,
            pulseEventId: pulseEvent.id,
            intent:       intentResult.intent,
            urgency:      intentResult.urgency,
            subject,
            body,
            senderName:   firmContact.name || senderEmail,
            senderEmail,
            summary:      intentResult.summary,
            actionItems:  intentResult.actionItems,
            brief:        brief ? {
                id:              brief.id,
                name:            brief.name,
                lawyerId:        brief.lawyerId,
                lawyerInChargeId: brief.lawyerInChargeId,
                matterId:        (brief as any).matterId ?? null,
            } : null,
            assignedToId,
        }).catch(err => console.error('Action engine error:', err));

        return NextResponse.json({
            success:      true,
            intent:       intentResult.intent,
            urgency:      intentResult.urgency,
            brief:        brief?.name || null,
            pulseEventId: pulseEvent.id,
        });

    } catch (error) {
        console.error('Institutional Memory pipeline error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
