import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import {
    classifyEmailIntent,
    identifyBriefFromContent,
    BriefCandidate,
} from '@/lib/services/email-processor';
import { addBriefActivity } from '@/lib/briefs';
import { executeIntentActions } from '@/lib/institutional-memory/actions';

// ── Attachment helpers ───────────────────────────────────────────────────────

interface RawAttachment {
    name: string;
    content: string;   // base64
    contentType: string;
    contentLength: number;
}

const ALLOWED_ATTACHMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'text/plain',
];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

async function uploadAttachments(
    attachments: RawAttachment[],
    workspaceId: string,
    inboundEmailId: string,
    briefId: string | null
): Promise<void> {
    for (const att of attachments) {
        try {
            if (!ALLOWED_ATTACHMENT_TYPES.includes(att.contentType)) {
                console.log(`⏭  Skipping attachment "${att.name}" — unsupported type ${att.contentType}`);
                continue;
            }

            const buffer = Buffer.from(att.content, 'base64');
            if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
                console.log(`⏭  Skipping attachment "${att.name}" — too large (${buffer.byteLength} bytes)`);
                continue;
            }

            const safeName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const blobPath = `email-attachments/${workspaceId}/${inboundEmailId}/${safeName}`;

            const blob = await put(blobPath, buffer, {
                access: 'public',
                contentType: att.contentType,
            });

            // Always create EmailAttachment record
            await prisma.emailAttachment.create({
                data: {
                    inboundEmailId,
                    name: att.name,
                    url: blob.url,
                    contentType: att.contentType,
                    size: buffer.byteLength,
                },
            });

            // If matched to a brief, also create a Document so it appears in the brief vault
            if (briefId) {
                const ext = safeName.split('.').pop()?.toLowerCase() || 'bin';
                await prisma.document.create({
                    data: {
                        name: att.name,
                        url: blob.url,
                        type: ext,
                        size: buffer.byteLength,
                        briefId,
                    },
                });
                console.log(`📎 Attachment "${att.name}" → Brief vault + EmailAttachment`);
            } else {
                console.log(`📎 Attachment "${att.name}" → EmailAttachment (unmatched)`);
            }
        } catch (err) {
            console.error(`Error uploading attachment "${att.name}":`, err);
        }
    }
}

// ── Fix 2: Noise filter ──────────────────────────────────────────────────────
// Domains and address patterns that are always automated system mail.
// Emails from these are stored as InboundEmail for audit but never create a PulseEvent.
const NOISE_SENDER_PATTERNS = [
    /^no[-.]?reply@/i,
    /^noreply@/i,
    /^do[-.]?not[-.]?reply@/i,
    /^mailer-daemon@/i,
    /^postmaster@/i,
    /^bounce[s]?@/i,
    /^notifications?@/i,
    /^alerts?@/i,
    /^support@zoho/i,
];

const NOISE_DOMAINS = [
    'zohoaccounts.com',
    'zohomail.com',
    'accounts.google.com',
    'facebookmail.com',
    'linkedin.com',
    'mailchimp.com',
    'sendgrid.net',
    'amazonses.com',
];

function isSystemNoise(senderEmail: string, subject: string): boolean {
    const lower = senderEmail.toLowerCase();
    if (NOISE_SENDER_PATTERNS.some(p => p.test(lower))) return true;
    const domain = lower.split('@')[1] || '';
    if (NOISE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true;
    // Subject-level signals
    const subjectLower = subject.toLowerCase();
    if (subjectLower.startsWith('delivery status') || subjectLower.startsWith('undeliverable')) return true;
    return false;
}

export async function POST(request: NextRequest) {
    console.log('📨 Institutional Memory: Incoming Email');

    try {
        const contentType = request.headers.get('content-type') || '';
        let recipient = '', sender = '', subject = '', body = '', messageId = '';
        let rawAttachments: RawAttachment[] = [];

        if (contentType.includes('application/json')) {
            const json = await request.json();
            recipient = json.OriginalRecipient || json.originalRecipient || json.to || json.To || '';
            sender    = json.from || json.From || '';
            subject   = json.subject || json.Subject || '';
            body      = json.text || json.TextBody || json.html || json.HtmlBody || '';
            messageId = json.MessageID || json['Message-ID'] || json.messageId || '';
            // Postmark: Attachments array with { Name, Content (base64), ContentType, ContentLength }
            const atts = json.Attachments || json.attachments || [];
            rawAttachments = atts.map((a: any) => ({
                name:          a.Name          || a.name          || 'attachment',
                content:       a.Content       || a.content       || '',
                contentType:   a.ContentType   || a.contentType   || 'application/octet-stream',
                contentLength: a.ContentLength || a.contentLength || 0,
            }));
        } else if (contentType.includes('multipart/form-data')) {
            const fd  = await request.formData();
            recipient = (fd.get('OriginalRecipient') || fd.get('to') || fd.get('To')) as string ?? '';
            sender    = (fd.get('from')      || fd.get('From'))       as string ?? '';
            subject   = (fd.get('subject')   || fd.get('Subject'))    as string ?? '';
            body      = ((fd.get('text')     || fd.get('TextBody'))   as string)
                     || ((fd.get('html')     || fd.get('HtmlBody'))   as string) || '';
            messageId = (fd.get('MessageID') || fd.get('Message-ID')) as string ?? '';
            // Multipart attachments are File objects
            const attachmentCount = parseInt(fd.get('attachments') as string || '0', 10);
            for (let i = 1; i <= attachmentCount; i++) {
                const file = fd.get(`attachment${i}`) as File | null;
                if (file) {
                    const ab = await file.arrayBuffer();
                    rawAttachments.push({
                        name:          file.name,
                        content:       Buffer.from(ab).toString('base64'),
                        contentType:   file.type || 'application/octet-stream',
                        contentLength: file.size,
                    });
                }
            }
        } else {
            return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
        }

        // ── 1. Workspace scoping ─────────────────────────────────────────────
        const toMatch = recipient.match(/<(.+?)>/) || [null, recipient];
        const toEmail = (toMatch[1] || recipient).toLowerCase().trim();

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

        // ── Fix 2: Drop system noise before any processing ───────────────────
        if (isSystemNoise(senderEmail, subject)) {
            console.log(`🔇 Noise filtered: ${senderEmail} — "${subject}"`);
            return NextResponse.json({ received: true, filtered: 'noise' });
        }

        // ── Fix 3: Deduplication ─────────────────────────────────────────────
        // Guard against Postmark firing the same webhook multiple times.
        // Primary: match by Message-ID header. Fallback: same sender+subject within 2 minutes.
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const duplicate = await prisma.inboundEmail.findFirst({
            where: {
                workspaceId,
                ...(messageId
                    ? { messageId }
                    : {
                        fromEmail: senderEmail,
                        subject,
                        receivedAt: { gte: twoMinutesAgo },
                    }),
            },
            select: { id: true },
        });

        if (duplicate) {
            console.log(`♻️  Duplicate dropped: ${senderEmail} — "${subject}"`);
            return NextResponse.json({ received: true, duplicate: true });
        }

        // ── Fix 1: Create InboundEmail first (always, matched or not) ────────
        const inboundEmail = await prisma.inboundEmail.create({
            data: {
                workspaceId,
                fromEmail:       senderEmail,
                fromName:        senderName || undefined,
                subject,
                bodyPreview:     body.substring(0, 500),
                body,
                messageId:       messageId || undefined,
                attachmentCount: rawAttachments.length,
                attachmentNames: rawAttachments.length
                    ? rawAttachments.map(a => a.name).join(', ')
                    : undefined,
                receivedAt:      new Date(),
            },
        });

        // ── 3. Match against known clients ───────────────────────────────────
        const knownClient = await prisma.client.findFirst({
            where: { workspaceId, email: { equals: senderEmail, mode: 'insensitive' } },
            select: { id: true, name: true },
        });

        // Upsert FirmContact
        const firmContact = await prisma.firmContact.upsert({
            where: { workspaceId_email: { workspaceId, email: senderEmail } },
            create: {
                workspaceId,
                email:    senderEmail,
                name:     knownClient?.name || senderName || senderEmail,
                type:     knownClient ? 'client' : 'unknown',
                clientId: knownClient?.id,
            },
            update: {
                lastSeen:   new Date(),
                emailCount: { increment: 1 },
                ...(knownClient && { type: 'client', clientId: knownClient.id }),
                ...(senderName && !knownClient && { name: senderName }),
            },
        });

        // ── 4. Intent classification + brief ID (parallel) ───────────────────
        const [intentResult, briefIdResult] = await Promise.all([
            classifyEmailIntent(subject, body, senderEmail),
            (async () => {
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

        // ── 5. Brief identification via AI ───────────────────────────────────
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

        const assignedToId = brief?.lawyerInChargeId || brief?.lawyerId || null;

        // ── 6. Create PulseEvent (linked to InboundEmail) ────────────────────
        const pulseEvent = await prisma.pulseEvent.create({
            data: {
                workspaceId,
                source:         'email',
                intent:         intentResult.intent,
                urgency:        intentResult.urgency,
                title:          intentResult.title,
                summary:        intentResult.summary,
                senderName:     firmContact.name || senderEmail,
                senderEmail,
                briefId:        brief?.id || null,
                contactId:      firmContact.id,
                assignedToId,
                inboundEmailId: inboundEmail.id,
                actionItems:    intentResult.actionItems,
                status:         'new',
            },
        });

        console.log(`🧠 PulseEvent created: [${intentResult.intent}/${intentResult.urgency}] → ${brief?.name || 'Unmatched'}`);

        // ── 7. Log to brief activity feed (if matched) ───────────────────────
        if (brief) {
            await addBriefActivity(
                brief.id,
                'email_received',
                `📧 ${intentResult.title}`,
                {
                    emailSubject:   subject,
                    emailSender:    sender,
                    inboundEmailId: inboundEmail.id,
                    intent:         intentResult.intent,
                    urgency:        intentResult.urgency,
                    summary:        intentResult.summary,
                    actionItems:    intentResult.actionItems,
                    pulseEventId:   pulseEvent.id,
                    routingMethod,
                },
                undefined
            );
        }

        // ── 8. Upload attachments (non-blocking — don't delay the response) ────
        if (rawAttachments.length > 0) {
            uploadAttachments(rawAttachments, workspaceId, inboundEmail.id, brief?.id || null)
                .catch(err => console.error('Attachment upload error:', err));
        }

        // ── 9. Execute intent actions (non-blocking) ─────────────────────────
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
            brief: brief ? {
                id:               brief.id,
                name:             brief.name,
                lawyerId:         brief.lawyerId,
                lawyerInChargeId: brief.lawyerInChargeId,
                matterId:         (brief as any).matterId ?? null,
            } : null,
            assignedToId,
        }).catch(err => console.error('Action engine error:', err));

        return NextResponse.json({
            success:      true,
            intent:       intentResult.intent,
            urgency:      intentResult.urgency,
            brief:        brief?.name || null,
            pulseEventId: pulseEvent.id,
            attachments:  rawAttachments.length,
        });

    } catch (error) {
        console.error('Institutional Memory pipeline error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
