import { prisma } from '@/lib/prisma';
import { downloadWhatsAppMedia } from './media';
import { resolveUser } from './index';
import { sendWhatsAppMessage } from './send';
import { identifyBriefFromContent, getBriefRoutingCandidates } from '@/lib/services/email-processor';
import { ATTACHMENT_ALLOWED_TYPES, MAX_ATTACHMENT_BYTES } from '@/lib/services/email-ingestion';
import { addBriefActivity } from '@/lib/briefs';
import { recordFiledAttachment, recordPendingAttachment } from '@/lib/services/inbox-attachments';
import { scanAndNotifyBrief } from '@/lib/agents/brief-manager/scan';

export interface IncomingWhatsAppDocument {
    from: string;
    mediaId: string;
    filename: string;
    mimeType: string;
    caption?: string;
}

// Send a document (or photo) to the firm's WhatsApp number and it gets filed
// under the right brief — reuses the same AI brief-matching and OCR
// ingestion pipeline email attachments already go through. Routing is
// caption-driven the same way email routing is subject-driven.
//
// If the AI is confident, it files immediately. If it isn't, the file is
// still downloaded and stored right away — never discarded, never bounced
// back asking the sender to resend — it just lands in the shared Inbox as
// "pending" for a human to point at the right brief later.
export async function handleWhatsAppDocument(doc: IncomingWhatsAppDocument): Promise<void> {
    const resolved = await resolveUser(doc.from);
    if (!resolved) {
        await sendWhatsAppMessage(
            doc.from,
            'Your number is not registered on Reforma. Ask your firm administrator to add your phone number to your profile.',
        );
        return;
    }

    if (!ATTACHMENT_ALLOWED_TYPES.includes(doc.mimeType)) {
        await sendWhatsAppMessage(doc.from, `Sorry, I can't file "${doc.filename}" — unsupported file type (${doc.mimeType}).`);
        return;
    }

    const media = await downloadWhatsAppMedia(doc.mediaId);
    if (!media) {
        await sendWhatsAppMessage(doc.from, `Couldn't download "${doc.filename}" — please try sending it again.`);
        return;
    }
    if (media.size > MAX_ATTACHMENT_BYTES) {
        await sendWhatsAppMessage(doc.from, `"${doc.filename}" is too large to file (max 20MB).`);
        return;
    }

    const { briefs, matters } = await getBriefRoutingCandidates(resolved.workspaceId);
    const routingSubject = doc.caption || doc.filename;
    const identification = await identifyBriefFromContent(routingSubject, doc.caption || '', briefs, matters);

    const brief = identification.confidence > 0.5 && identification.briefId
        ? await prisma.brief.findFirst({
            where: { id: identification.briefId, workspaceId: resolved.workspaceId },
            select: { id: true, name: true },
        })
        : null;

    const { put } = await import('@vercel/blob');
    const safeName = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobPath = `whatsapp-attachments/${resolved.workspaceId}/${Date.now()}-${safeName}`;
    const blob = await put(blobPath, media.buffer, { access: 'public', contentType: media.mimeType });

    if (!brief) {
        await recordPendingAttachment({
            workspaceId: resolved.workspaceId,
            source: 'whatsapp',
            fileName: doc.filename,
            blobUrl: blob.url,
            contentType: media.mimeType,
            size: media.size,
            caption: doc.caption ?? null,
            whatsappFromNumber: doc.from,
            createdById: resolved.userId,
            suggestedBriefId: identification.briefId,
            confidence: identification.confidence,
            reasoning: identification.reasoning,
        });
        await sendWhatsAppMessage(
            doc.from,
            `Got it — I've saved "${doc.filename}" but couldn't tell which case it belongs to. It's in the Reforma Inbox waiting for someone to confirm.`,
        );
        return;
    }

    const { DocumentIngestionService } = await import('@/lib/services/ingestion');
    const folder = await DocumentIngestionService.getOrCreateCorrespondenceFolder(brief.id);
    const result = await DocumentIngestionService.ingest({
        name: doc.filename,
        buffer: media.buffer,
        contentType: media.mimeType,
        size: media.size,
        briefId: brief.id,
        folderId: folder.id,
        url: blob.url,
    });

    await recordFiledAttachment({
        workspaceId: resolved.workspaceId,
        source: 'whatsapp',
        fileName: doc.filename,
        blobUrl: blob.url,
        contentType: media.mimeType,
        size: media.size,
        caption: doc.caption ?? null,
        whatsappFromNumber: doc.from,
        createdById: resolved.userId,
        briefId: brief.id,
        documentId: result.documentId,
        confidence: identification.confidence,
        reasoning: identification.reasoning,
    });

    await addBriefActivity(
        brief.id,
        'document_uploaded',
        `📎 "${doc.filename}" received via WhatsApp from ${resolved.userName}`,
        {
            source: 'whatsapp',
            fromNumber: doc.from,
            caption: doc.caption,
            routingMethod: `AI Routing (${Math.round(identification.confidence * 100)}%): ${identification.reasoning}`,
        },
        resolved.userId,
    );

    await sendWhatsAppMessage(doc.from, `Filed "${doc.filename}" under ${brief.name}.`);

    // Fire-and-forget: look at what this document means for the brief right
    // now, rather than waiting for the next nightly scan — a document
    // arriving live over WhatsApp is exactly the kind of signal the "eye on
    // the file" should react to same-minute, not up to a day later. Never
    // blocks the filing confirmation above; any follow-up (a question, an
    // obligation) arrives as its own message shortly after.
    scanAndNotifyBrief(resolved.workspaceId, brief.id)
        .catch(err => console.error(`[WhatsApp Agent] On-demand rescan failed for brief ${brief.id}:`, err));
}
