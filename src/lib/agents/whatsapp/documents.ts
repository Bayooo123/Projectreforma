import { prisma } from '@/lib/prisma';
import { downloadWhatsAppMedia } from './media';
import { resolveUser } from './index';
import { sendWhatsAppMessage } from './send';
import { identifyBriefFromContent, getBriefRoutingCandidates } from '@/lib/services/email-processor';
import { ATTACHMENT_ALLOWED_TYPES, MAX_ATTACHMENT_BYTES } from '@/lib/services/email-ingestion';
import { addBriefActivity } from '@/lib/briefs';

export interface IncomingWhatsAppDocument {
    from: string;
    mediaId: string;
    filename: string;
    mimeType: string;
    caption?: string;
}

// Send a document (or photo) to the firm's WhatsApp number and it gets filed
// under the right brief automatically — reuses the same AI brief-matching and
// OCR ingestion pipeline email attachments already go through. Routing is
// caption-driven the same way email routing is subject-driven: if the AI
// can't tell which case it belongs to, we ask the sender to resend with the
// case name/number in the caption rather than guessing wrong.
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

    if (!brief) {
        await sendWhatsAppMessage(
            doc.from,
            `I couldn't tell which case "${doc.filename}" belongs to. Please resend it with the case name or number in the caption.`,
        );
        return;
    }

    const { DocumentIngestionService } = await import('@/lib/services/ingestion');
    const { put } = await import('@vercel/blob');

    const safeName = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobPath = `whatsapp-attachments/${resolved.workspaceId}/${Date.now()}-${safeName}`;
    const blob = await put(blobPath, media.buffer, { access: 'public', contentType: media.mimeType });

    const folder = await DocumentIngestionService.getOrCreateCorrespondenceFolder(brief.id);
    await DocumentIngestionService.ingest({
        name: doc.filename,
        buffer: media.buffer,
        contentType: media.mimeType,
        size: media.size,
        briefId: brief.id,
        folderId: folder.id,
        url: blob.url,
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
}
