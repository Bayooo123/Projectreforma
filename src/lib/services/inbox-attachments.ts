import { prisma } from '@/lib/prisma';

// Every document that arrives via email or WhatsApp gets a row here — filed
// immediately for high-confidence AI matches, pending otherwise. Nothing is
// ever silently dropped: the file is already stored (blobUrl) by the time
// either function below is called, so a "pending" row always has a real,
// downloadable file behind it, waiting for a human to confirm which brief it
// belongs to.

export type InboxAttachmentSource = 'email' | 'whatsapp' | 'upload';

interface BaseAttachmentInput {
    workspaceId: string;
    source: InboxAttachmentSource;
    fileName: string;
    blobUrl: string;
    contentType: string;
    size: number;
    caption?: string | null;
    inboundEmailId?: string | null;
    whatsappFromNumber?: string | null;
    createdById?: string | null;
}

export interface RecordFiledAttachmentInput extends BaseAttachmentInput {
    briefId: string;
    documentId: string;
    confidence?: number | null;
    reasoning?: string | null;
}

export async function recordFiledAttachment(input: RecordFiledAttachmentInput) {
    return prisma.inboxAttachment.create({
        data: {
            workspaceId: input.workspaceId,
            source: input.source,
            fileName: input.fileName,
            blobUrl: input.blobUrl,
            contentType: input.contentType,
            size: input.size,
            caption: input.caption ?? null,
            inboundEmailId: input.inboundEmailId ?? null,
            whatsappFromNumber: input.whatsappFromNumber ?? null,
            createdById: input.createdById ?? null,
            suggestedBriefId: input.briefId,
            suggestedConfidence: input.confidence ?? null,
            suggestedReasoning: input.reasoning ?? null,
            confirmedBriefId: input.briefId,
            documentId: input.documentId,
            status: 'filed',
            filedAt: new Date(),
        },
    });
}

export interface RecordPendingAttachmentInput extends BaseAttachmentInput {
    suggestedBriefId?: string | null;
    confidence?: number | null;
    reasoning?: string | null;
}

export async function recordPendingAttachment(input: RecordPendingAttachmentInput) {
    return prisma.inboxAttachment.create({
        data: {
            workspaceId: input.workspaceId,
            source: input.source,
            fileName: input.fileName,
            blobUrl: input.blobUrl,
            contentType: input.contentType,
            size: input.size,
            caption: input.caption ?? null,
            inboundEmailId: input.inboundEmailId ?? null,
            whatsappFromNumber: input.whatsappFromNumber ?? null,
            createdById: input.createdById ?? null,
            suggestedBriefId: input.suggestedBriefId ?? null,
            suggestedConfidence: input.confidence ?? null,
            suggestedReasoning: input.reasoning ?? null,
            status: 'pending',
        },
    });
}

// Files a pending row into a brief — refetches the already-stored blob bytes
// (no re-upload, it's already sitting in storage), runs it through the same
// OCR/classification pipeline every other document goes through, and marks
// the row filed.
export async function fileInboxAttachment(id: string, briefId: string) {
    const item = await prisma.inboxAttachment.findUnique({ where: { id } });
    if (!item) throw new Error('Inbox item not found');
    if (item.status === 'filed') throw new Error('This item has already been filed');

    const res = await fetch(item.blobUrl);
    if (!res.ok) throw new Error(`Could not fetch the stored file (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const { DocumentIngestionService } = await import('@/lib/services/ingestion');
    const folder = await DocumentIngestionService.getOrCreateCorrespondenceFolder(briefId);
    const result = await DocumentIngestionService.ingest({
        name: item.fileName,
        buffer,
        contentType: item.contentType,
        size: item.size,
        briefId,
        folderId: folder.id,
        url: item.blobUrl,
    });

    return prisma.inboxAttachment.update({
        where: { id },
        data: {
            confirmedBriefId: briefId,
            documentId: result.documentId,
            status: 'filed',
            filedAt: new Date(),
        },
    });
}
