import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { withApiAuth } from '@/lib/api-auth';
import {
    classifyEmailIntent,
    identifyBriefFromContent,
    BriefCandidate,
    MatterCandidate,
} from '@/lib/services/email-processor';
import { addBriefActivity } from '@/lib/briefs';
import { executeIntentActions } from '@/lib/institutional-memory/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportAttachment {
    filename: string;
    content_type: string;
    data: string; // base64
}

interface ImportEmail {
    message_id?: string;
    from: string;
    to?: string;
    cc?: string;
    date?: string;
    subject: string;
    body_text?: string;
    body_html?: string;
    folder?: string;
    attachments?: ImportAttachment[];
}

interface EmailResult {
    message_id: string | null;
    subject: string;
    status: 'ok' | 'duplicate' | 'noise' | 'error';
    duplicate: boolean;
    matched_matter: string | null;
    pulse_event_id: string | null;
    error?: string;
}

// ── Noise filter (shared with Postmark webhook) ───────────────────────────────

const NOISE_SENDER_PATTERNS = [
    /^no[-.]?reply@/i, /^noreply@/i, /^do[-.]?not[-.]?reply@/i,
    /^mailer-daemon@/i, /^postmaster@/i, /^bounce[s]?@/i,
    /^notifications?@/i, /^alerts?@/i, /^support@zoho/i,
];

const NOISE_DOMAINS = [
    'zohoaccounts.com', 'zohomail.com', 'accounts.google.com',
    'facebookmail.com', 'linkedin.com', 'mailchimp.com',
    'sendgrid.net', 'amazonses.com',
];

function isNoise(senderEmail: string, subject: string): boolean {
    const lower = senderEmail.toLowerCase();
    if (NOISE_SENDER_PATTERNS.some(p => p.test(lower))) return true;
    const domain = lower.split('@')[1] || '';
    if (NOISE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true;
    const sub = subject.toLowerCase();
    if (sub.startsWith('delivery status') || sub.startsWith('undeliverable')) return true;
    return false;
}

// ── Attachment upload ────────────────────────────────────────────────────────

const ALLOWED_TYPES = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain',
];

async function uploadAttachments(
    attachments: ImportAttachment[],
    workspaceId: string,
    inboundEmailId: string,
    briefId: string | null,
): Promise<void> {
    for (const att of attachments) {
        try {
            if (!ALLOWED_TYPES.includes(att.content_type)) continue;
            const buffer = Buffer.from(att.data, 'base64');
            if (buffer.byteLength > 10 * 1024 * 1024) continue;
            const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const blob = await put(
                `email-attachments/${workspaceId}/${inboundEmailId}/${safeName}`,
                buffer,
                { access: 'public', contentType: att.content_type },
            );
            await prisma.emailAttachment.create({
                data: { inboundEmailId, name: att.filename, url: blob.url, contentType: att.content_type, size: buffer.byteLength },
            });
            if (briefId) {
                const ext = safeName.split('.').pop()?.toLowerCase() || 'bin';
                await prisma.document.create({
                    data: { name: att.filename, url: blob.url, type: ext, size: buffer.byteLength, briefId },
                });
            }
        } catch (err) {
            console.error(`[BulkImport] Attachment upload failed: ${att.filename}`, err);
        }
    }
}

// ── Per-email processing (same pipeline as Postmark webhook) ─────────────────

async function processEmail(
    email: ImportEmail,
    workspaceId: string,
): Promise<EmailResult> {
    const subject    = email.subject?.trim() || '(no subject)';
    const messageId  = email.message_id?.trim() || null;
    const body       = email.body_text || email.body_html || '';
    const attachments = email.attachments || [];

    // Parse sender
    const fromRaw   = email.from || '';
    const senderMatch = fromRaw.match(/<(.+?)>/);
    const senderEmail = ((senderMatch ? senderMatch[1] : fromRaw).toLowerCase().trim());
    const senderName  = senderMatch ? fromRaw.replace(/<.+>/, '').trim() : undefined;

    // Parse original date — fall back to now if missing/invalid
    let receivedAt = new Date();
    if (email.date) {
        const parsed = new Date(email.date);
        if (!isNaN(parsed.getTime())) receivedAt = parsed;
    }

    const base: EmailResult = { message_id: messageId, subject, status: 'ok', duplicate: false, matched_matter: null, pulse_event_id: null };

    // Noise filter
    if (isNoise(senderEmail, subject)) {
        return { ...base, status: 'noise' };
    }

    // Deduplication — primary: messageId; fallback: sender+subject within 5 minutes
    const fiveMinutesAgo = new Date(receivedAt.getTime() - 5 * 60 * 1000);
    const duplicate = await prisma.inboundEmail.findFirst({
        where: {
            workspaceId,
            ...(messageId
                ? { messageId }
                : { fromEmail: senderEmail, subject, receivedAt: { gte: fiveMinutesAgo } }),
        },
        select: { id: true },
    });

    if (duplicate) {
        return { ...base, status: 'duplicate', duplicate: true };
    }

    try {
        // Create InboundEmail record
        const inboundEmail = await prisma.inboundEmail.create({
            data: {
                workspaceId,
                fromEmail:       senderEmail,
                fromName:        senderName || undefined,
                subject,
                bodyPreview:     body.substring(0, 500),
                body,
                messageId:       messageId || undefined,
                attachmentCount: attachments.length,
                attachmentNames: attachments.length ? attachments.map(a => a.filename).join(', ') : undefined,
                receivedAt,
            },
        });

        // Known client lookup + FirmContact upsert
        const knownClient = await prisma.client.findFirst({
            where: { workspaceId, email: { equals: senderEmail, mode: 'insensitive' } },
            select: { id: true, name: true },
        });

        const firmContact = await prisma.firmContact.upsert({
            where: { workspaceId_email: { workspaceId, email: senderEmail } },
            create: {
                workspaceId, email: senderEmail,
                name:     knownClient?.name || senderName || senderEmail,
                type:     knownClient ? 'client' : 'unknown',
                clientId: knownClient?.id,
            },
            update: {
                lastSeen: new Date(), emailCount: { increment: 1 },
                ...(knownClient && { type: 'client', clientId: knownClient.id }),
                ...(senderName && !knownClient && { name: senderName }),
            },
        });

        // Intent classification + brief/matter matching (parallel)
        const [intentResult, briefCandidates, matterCandidates] = await Promise.all([
            classifyEmailIntent(subject, body, senderEmail),
            prisma.brief.findMany({
                where: { status: 'active', workspaceId },
                take: 50,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, name: true, briefNumber: true, client: { select: { name: true } } },
            }),
            prisma.matter.findMany({
                where: { workspaceId, deletedAt: null, status: { notIn: ['closed', 'archived'] } },
                orderBy: { updatedAt: 'desc' },
                select: { id: true, name: true, caseNumber: true, status: true },
            }),
        ]);

        const briefList: BriefCandidate[]  = briefCandidates.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber, clientName: b.client?.name || 'No Client' }));
        const matterList: MatterCandidate[] = matterCandidates.map(m => ({ id: m.id, name: m.name, caseNumber: m.caseNumber, status: m.status }));

        const identification = await identifyBriefFromContent(subject, body, briefList, matterList);

        let brief: { id: string; name: string; lawyerId: string; lawyerInChargeId: string | null; matterId: string | null } | null = null;
        let matchedMatterId: string | null = null;
        let routingMethod = 'Unmatched';

        if (identification.confidence > 0.5) {
            const pct = Math.round(identification.confidence * 100);
            routingMethod = `AI Routing (${pct}%): ${identification.reasoning}`;
            if (identification.briefId) {
                brief = await prisma.brief.findFirst({
                    where: { id: identification.briefId, workspaceId },
                    select: { id: true, name: true, lawyerId: true, lawyerInChargeId: true, matterId: true },
                });
                matchedMatterId = brief?.matterId ?? null;
            } else if (identification.matterId) {
                matchedMatterId = identification.matterId;
                await prisma.inboundEmail.update({
                    where: { id: inboundEmail.id },
                    data: { matterId: identification.matterId },
                });
            }
        }

        const assignedToId = brief?.lawyerInChargeId || brief?.lawyerId || null;
        const linkedMatterId = brief?.matterId ?? matchedMatterId ?? null;

        // PulseEvent
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
                matterId:       linkedMatterId,
                contactId:      firmContact.id,
                assignedToId,
                inboundEmailId: inboundEmail.id,
                actionItems:    intentResult.actionItems,
                status:         'new',
            },
        });

        // Brief activity log
        if (brief) {
            await addBriefActivity(
                brief.id, 'email_received', `📧 ${intentResult.title}`,
                {
                    emailSubject: subject, emailSender: fromRaw,
                    inboundEmailId: inboundEmail.id, intent: intentResult.intent,
                    urgency: intentResult.urgency, summary: intentResult.summary,
                    actionItems: intentResult.actionItems, pulseEventId: pulseEvent.id,
                    routingMethod,
                },
                undefined,
            );
        }

        // Non-blocking: attachments + intent actions
        if (attachments.length > 0) {
            uploadAttachments(attachments, workspaceId, inboundEmail.id, brief?.id || null)
                .catch(err => console.error('[BulkImport] Attachment error:', err));
        }

        executeIntentActions({
            workspaceId, pulseEventId: pulseEvent.id,
            intent: intentResult.intent, urgency: intentResult.urgency,
            subject, body,
            senderName: firmContact.name || senderEmail, senderEmail,
            summary: intentResult.summary, actionItems: intentResult.actionItems,
            brief: brief ? {
                id: brief.id, name: brief.name,
                lawyerId: brief.lawyerId, lawyerInChargeId: brief.lawyerInChargeId,
                matterId: brief.matterId,
            } : null,
            assignedToId,
        }).catch(err => console.error('[BulkImport] Action engine error:', err));

        return {
            ...base,
            matched_matter: brief?.name || null,
            pulse_event_id: pulseEvent.id,
        };

    } catch (err: any) {
        console.error('[BulkImport] Email processing error:', err);
        return { ...base, status: 'error', error: err?.message ?? 'Processing failed' };
    }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    // Auth
    const { auth, error } = await withApiAuth(request);
    if (error) return error;
    const workspaceId = auth!.workspaceId;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    // Accept single email or array
    const emails: ImportEmail[] = Array.isArray(body) ? body : [body as ImportEmail];

    if (emails.length === 0) {
        return NextResponse.json({ success: false, error: 'No emails provided' }, { status: 400 });
    }

    if (emails.length > 100) {
        return NextResponse.json(
            { success: false, error: 'Maximum 100 emails per request. Send in batches.' },
            { status: 400 },
        );
    }

    // Validate required fields up-front
    for (let i = 0; i < emails.length; i++) {
        if (!emails[i].from || !emails[i].subject) {
            return NextResponse.json(
                { success: false, error: `Email at index ${i} is missing required field: from, subject` },
                { status: 400 },
            );
        }
    }

    console.log(`[BulkImport] Processing ${emails.length} emails for workspace ${workspaceId}`);

    // Process with concurrency limit of 5 to avoid DB pool exhaustion
    const results: EmailResult[] = [];
    const CONCURRENCY = 5;

    for (let i = 0; i < emails.length; i += CONCURRENCY) {
        const batch = emails.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(e => processEmail(e, workspaceId)));
        results.push(...batchResults);
    }

    const summary = {
        total:      results.length,
        processed:  results.filter(r => r.status === 'ok').length,
        duplicates: results.filter(r => r.status === 'duplicate').length,
        noise:      results.filter(r => r.status === 'noise').length,
        errors:     results.filter(r => r.status === 'error').length,
    };

    console.log(`[BulkImport] Done — ${summary.processed} processed, ${summary.duplicates} duplicates, ${summary.errors} errors`);

    return NextResponse.json({ success: true, summary, results });
}

export async function GET() {
    return NextResponse.json({
        endpoint: 'POST /api/import/emails',
        status: 'live',
        auth: 'Authorization: Bearer <api_key>',
        batch_limit: 100,
    });
}
