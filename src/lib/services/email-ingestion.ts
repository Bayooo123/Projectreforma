/**
 * Shared inbound-email processing core.
 *
 * Previously this logic was duplicated (and inconsistently implemented)
 * across three separate webhook routes — one created a PulseEvent and tried
 * to save attachments as Documents (unreliably), one only ever wrote a
 * BriefActivityLog entry or fell back to dumping an unrouted email into a
 * Task in "the oldest workspace", and one saved attachments as raw blobs
 * without OCR ingestion and never created a PulseEvent at all. Whichever
 * pipeline happened to receive a given email (which depends entirely on how
 * the mail provider is configured, outside this codebase) decided whether
 * correspondence showed up as a PulseEvent, whether an attachment became a
 * searchable Document, or both, or neither.
 *
 * Every inbound-email webhook now parses its own provider-specific payload,
 * resolves a workspace, and calls ingestInboundEmail() here — so the same
 * email, arriving through any of the three integrations, always produces
 * the same records: InboundEmail, PulseEvent, BriefActivityLog (if a brief
 * matched), and Documents for attachments (ingested through the same OCR
 * pipeline the web upload UI uses).
 */

import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { after } from 'next/server';
import {
    classifyEmailIntent,
    identifyBriefFromContent,
    type BriefCandidate,
    type MatterCandidate,
} from '@/lib/services/email-processor';
import { addBriefActivity } from '@/lib/briefs';
import { executeIntentActions } from '@/lib/institutional-memory/actions';

// ── Attachments ──────────────────────────────────────────────────────────────

export interface RawAttachment {
    name: string;
    content: string; // base64
    contentType: string;
    contentLength: number;
}

// Widened from the original list (which silently dropped anything else,
// server-log only, with no trace visible anywhere in the product): common
// legal-correspondence formats — forwarded messages, scanned/exported mail,
// compressed bundles of exhibits — are real attachments a firm receives,
// not edge cases.
export const ATTACHMENT_ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-outlook',        // .msg
    'message/rfc822',                    // .eml
    'application/rtf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
];

// Raised from 10MB — scanned legal bundles/exhibits routinely exceed that.
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

async function ingestAttachments(
    attachments: RawAttachment[],
    workspaceId: string,
    inboundEmailId: string,
    briefId: string | null,
): Promise<void> {
    const { DocumentIngestionService } = await import('@/lib/services/ingestion');

    let correspondenceFolderId: string | null = null;
    if (briefId) {
        const folder = await DocumentIngestionService.getOrCreateCorrespondenceFolder(briefId);
        correspondenceFolderId = folder.id;
    }

    for (const att of attachments) {
        try {
            if (!ATTACHMENT_ALLOWED_TYPES.includes(att.contentType)) {
                console.log(`[EmailIngestion] Skipping attachment "${att.name}" — unsupported type ${att.contentType}`);
                continue;
            }

            const buffer = Buffer.from(att.content, 'base64');
            if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
                console.log(`[EmailIngestion] Skipping attachment "${att.name}" — too large (${buffer.byteLength} bytes)`);
                continue;
            }

            const safeName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const blobPath = `email-attachments/${workspaceId}/${inboundEmailId}/${safeName}`;
            const blob = await put(blobPath, buffer, { access: 'public', contentType: att.contentType });

            await prisma.emailAttachment.create({
                data: {
                    inboundEmailId,
                    name: att.name,
                    url: blob.url,
                    contentType: att.contentType,
                    size: buffer.byteLength,
                },
            });

            if (briefId) {
                await DocumentIngestionService.ingest({
                    name: att.name,
                    buffer,
                    contentType: att.contentType,
                    size: buffer.byteLength,
                    briefId,
                    folderId: correspondenceFolderId,
                    url: blob.url,
                });
                console.log(`[EmailIngestion] "${att.name}" ingested into brief vault (Correspondence folder)`);
            } else {
                console.log(`[EmailIngestion] "${att.name}" saved as EmailAttachment only (no brief match)`);
            }
        } catch (err) {
            console.error(`[EmailIngestion] Attachment upload failed for "${att.name}":`, err);
        }
    }
}

// ── Noise filtering ──────────────────────────────────────────────────────────

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
    'zohoaccounts.com', 'zohomail.com', 'accounts.google.com',
    'facebookmail.com', 'linkedin.com', 'mailchimp.com', 'sendgrid.net', 'amazonses.com',
];

function isSystemNoise(senderEmail: string, subject: string): boolean {
    const lower = senderEmail.toLowerCase();
    if (NOISE_SENDER_PATTERNS.some(p => p.test(lower))) return true;
    const domain = lower.split('@')[1] || '';
    if (NOISE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true;
    const subjectLower = subject.toLowerCase();
    if (subjectLower.startsWith('delivery status') || subjectLower.startsWith('undeliverable')) return true;
    return false;
}

// ── Workspace resolution (shared by any route that routes on recipient address) ──

export async function resolveWorkspaceByRecipient(recipient: string): Promise<string | null> {
    const toMatch = recipient.match(/<(.+?)>/) || [null, recipient];
    const toEmail = (toMatch[1] || recipient).toLowerCase().trim();
    const emailConfig = await prisma.workspaceEmailConfig.findFirst({
        where: { emailAddress: { equals: toEmail, mode: 'insensitive' }, isActive: true },
        select: { workspaceId: true },
    });
    return emailConfig?.workspaceId ?? null;
}

// ── Core ingestion ───────────────────────────────────────────────────────────

export interface InboundEmailInput {
    workspaceId: string;
    fromEmail: string;
    fromName?: string;
    subject: string;
    body: string;
    messageId?: string;
    /** Raw "To" header, if available — used to match a brief-specific routing alias (brief-<token>@domain). */
    recipientRaw?: string;
    /**
     * Some integrations resolve the brief via their own domain-specific logic
     * before calling in here (e.g. matching sender-to-client, then subject
     * text to a matter name) — pass the result through and it's used as-is,
     * skipping the recipient-alias/AI-routing fallback below entirely.
     */
    knownBriefId?: string;
    attachments: RawAttachment[];
    /** Which webhook/integration this came through, for logging only. */
    source: string;
}

export interface InboundEmailResult {
    duplicate: boolean;
    filtered: 'noise' | null;
    inboundEmailId: string | null;
    pulseEventId: string | null;
    briefId: string | null;
    briefName: string | null;
    routingMethod: string;
}

export async function ingestInboundEmail(input: InboundEmailInput): Promise<InboundEmailResult> {
    const { workspaceId, fromName, subject, body, messageId, recipientRaw, knownBriefId, attachments, source } = input;
    const senderEmail = input.fromEmail.toLowerCase().trim();

    if (isSystemNoise(senderEmail, subject)) {
        console.log(`[EmailIngestion:${source}] Noise filtered: ${senderEmail} — "${subject}"`);
        return { duplicate: false, filtered: 'noise', inboundEmailId: null, pulseEventId: null, briefId: null, briefName: null, routingMethod: 'Filtered (noise)' };
    }

    // Dedup: primary by Message-ID, fallback same sender+subject within 2 minutes —
    // guards against a provider firing the same webhook more than once.
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const duplicate = await prisma.inboundEmail.findFirst({
        where: {
            workspaceId,
            ...(messageId
                ? { messageId }
                : { fromEmail: senderEmail, subject, receivedAt: { gte: twoMinutesAgo } }),
        },
        select: { id: true },
    });
    if (duplicate) {
        console.log(`[EmailIngestion:${source}] Duplicate dropped: ${senderEmail} — "${subject}"`);
        return { duplicate: true, filtered: null, inboundEmailId: duplicate.id, pulseEventId: null, briefId: null, briefName: null, routingMethod: 'Duplicate' };
    }

    const inboundEmail = await prisma.inboundEmail.create({
        data: {
            workspaceId,
            fromEmail: senderEmail,
            fromName: fromName || undefined,
            subject,
            bodyPreview: body.slice(0, 500),
            body,
            messageId: messageId || undefined,
            attachmentCount: attachments.length,
            attachmentNames: attachments.length ? attachments.map(a => a.name).join(', ') : undefined,
            receivedAt: new Date(),
        },
    });

    const knownClient = await prisma.client.findFirst({
        where: { workspaceId, email: { equals: senderEmail, mode: 'insensitive' } },
        select: { id: true, name: true },
    });

    const firmContact = await prisma.firmContact.upsert({
        where: { workspaceId_email: { workspaceId, email: senderEmail } },
        create: {
            workspaceId,
            email: senderEmail,
            name: knownClient?.name || fromName || senderEmail,
            type: knownClient ? 'client' : 'unknown',
            clientId: knownClient?.id,
        },
        update: {
            lastSeen: new Date(),
            emailCount: { increment: 1 },
            ...(knownClient && { type: 'client', clientId: knownClient.id }),
            ...(fromName && !knownClient && { name: fromName }),
        },
    });

    const briefSelect = { id: true, name: true, lawyerId: true, lawyerInChargeId: true, matterId: true } as const;

    const [intentResult, briefIdResult] = await Promise.all([
        classifyEmailIntent(subject, body, senderEmail),
        (async () => {
            if (knownBriefId) {
                return prisma.brief.findFirst({ where: { id: knownBriefId, workspaceId }, select: briefSelect });
            }
            const m = recipientRaw?.match(/brief-([a-zA-Z0-9-]+)@/);
            if (!m) return null;
            return prisma.brief.findFirst({ where: { inboundEmailId: m[1], workspaceId }, select: briefSelect });
        })(),
    ]);

    let brief = briefIdResult;
    let routingMethod = brief ? (knownBriefId ? 'Direct Match (caller-resolved)' : 'Direct Match (ID)') : 'Unrouted';

    if (!brief) {
        const [briefCandidates, matterCandidates] = await Promise.all([
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

        const briefList: BriefCandidate[] = briefCandidates.map(b => ({
            id: b.id, name: b.name, briefNumber: b.briefNumber, clientName: b.client?.name || 'No Client',
        }));
        const matterList: MatterCandidate[] = matterCandidates.map(m => ({
            id: m.id, name: m.name, caseNumber: m.caseNumber, status: m.status,
        }));

        const identification = await identifyBriefFromContent(subject, body, briefList, matterList);
        routingMethod = `AI Routing (${Math.round(identification.confidence * 100)}%): ${identification.reasoning}`;

        if (identification.confidence > 0.5 && identification.briefId) {
            brief = await prisma.brief.findFirst({
                where: { id: identification.briefId, workspaceId },
                select: briefSelect,
            });
        } else if (identification.confidence > 0.5 && identification.matterId) {
            await prisma.inboundEmail.update({ where: { id: inboundEmail.id }, data: { matterId: identification.matterId } });
        }
    }

    const assignedToId = brief?.lawyerInChargeId || brief?.lawyerId || null;

    const pulseEvent = await prisma.pulseEvent.create({
        data: {
            workspaceId,
            source: 'email',
            intent: intentResult.intent,
            urgency: intentResult.urgency,
            title: intentResult.title,
            summary: intentResult.summary,
            senderName: firmContact.name || senderEmail,
            senderEmail,
            senderType: intentResult.senderType,
            briefId: brief?.id || null,
            contactId: firmContact.id,
            assignedToId,
            inboundEmailId: inboundEmail.id,
            actionItems: intentResult.actionItems,
            status: 'new',
        },
    });

    console.log(`[EmailIngestion:${source}] PulseEvent created: [${intentResult.intent}/${intentResult.urgency}] → ${brief?.name || 'Unmatched'} (${routingMethod})`);

    if (brief) {
        await addBriefActivity(
            brief.id,
            'email_received',
            `📧 ${intentResult.title}`,
            {
                emailSubject: subject,
                emailSender: senderEmail,
                inboundEmailId: inboundEmail.id,
                intent: intentResult.intent,
                urgency: intentResult.urgency,
                summary: intentResult.summary,
                actionItems: intentResult.actionItems,
                pulseEventId: pulseEvent.id,
                routingMethod,
                source,
            },
            undefined,
        );
    }

    // Attachment upload deferred via after() rather than a bare, un-awaited
    // promise: without it, the serverless function can be torn down once the
    // response below is sent, cutting the upload off mid-way — the exact bug
    // that let correspondence link to a brief while its attachment silently
    // never became a Document.
    if (attachments.length > 0) {
        after(() =>
            ingestAttachments(attachments, workspaceId, inboundEmail.id, brief?.id || null)
                .catch(err => console.error(`[EmailIngestion:${source}] Attachment ingestion error:`, err)),
        );
    }

    executeIntentActions({
        workspaceId,
        pulseEventId: pulseEvent.id,
        intent: intentResult.intent,
        urgency: intentResult.urgency,
        subject,
        body,
        senderName: firmContact.name || senderEmail,
        senderEmail,
        summary: intentResult.summary,
        actionItems: intentResult.actionItems,
        brief: brief ? {
            id: brief.id,
            name: brief.name,
            lawyerId: brief.lawyerId,
            lawyerInChargeId: brief.lawyerInChargeId,
            matterId: brief.matterId ?? null,
        } : null,
        assignedToId,
    }).catch(err => console.error(`[EmailIngestion:${source}] Action engine error:`, err));

    return {
        duplicate: false,
        filtered: null,
        inboundEmailId: inboundEmail.id,
        pulseEventId: pulseEvent.id,
        briefId: brief?.id ?? null,
        briefName: brief?.name ?? null,
        routingMethod,
    };
}
