'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { fileInboxAttachment, recordPendingAttachment } from '@/lib/services/inbox-attachments';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export interface InboxAttachmentRow {
    id: string;
    source: string;
    fileName: string;
    blobUrl: string;
    contentType: string;
    size: number;
    caption: string | null;
    status: string;
    createdAt: Date;
    filedAt: Date | null;
    senderLabel: string;
    suggestedBriefId: string | null;
    suggestedBriefName: string | null;
    suggestedConfidence: number | null;
    suggestedReasoning: string | null;
    confirmedBriefId: string | null;
    confirmedBriefName: string | null;
}

// Every document that arrived via email or WhatsApp — filed ones stay
// visible as an audit trail, pending ones are waiting on a human to say
// which brief they belong to. Nothing in this table was ever silently
// dropped on arrival.
export async function getInboxAttachments(
    workspaceId: string,
    status: 'pending' | 'filed' | 'all' = 'pending',
): Promise<InboxAttachmentRow[]> {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    const items = await prisma.inboxAttachment.findMany({
        where: {
            workspaceId,
            ...(status !== 'all' ? { status } : {}),
        },
        select: {
            id: true, source: true, fileName: true, blobUrl: true, contentType: true, size: true,
            caption: true, status: true, createdAt: true, filedAt: true,
            whatsappFromNumber: true,
            inboundEmail: { select: { fromEmail: true, fromName: true } },
            createdBy: { select: { name: true } },
            suggestedBriefId: true, suggestedConfidence: true, suggestedReasoning: true,
            suggestedBrief: { select: { name: true } },
            confirmedBriefId: true,
            confirmedBrief: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    return items.map(i => ({
        id: i.id,
        source: i.source,
        fileName: i.fileName,
        blobUrl: i.blobUrl,
        contentType: i.contentType,
        size: i.size,
        caption: i.caption,
        status: i.status,
        createdAt: i.createdAt,
        filedAt: i.filedAt,
        senderLabel: i.source === 'email'
            ? (i.inboundEmail?.fromName || i.inboundEmail?.fromEmail || 'Unknown sender')
            : (i.createdBy?.name || i.whatsappFromNumber || 'Unknown sender'),
        suggestedBriefId: i.suggestedBriefId,
        suggestedBriefName: i.suggestedBrief?.name ?? null,
        suggestedConfidence: i.suggestedConfidence,
        suggestedReasoning: i.suggestedReasoning,
        confirmedBriefId: i.confirmedBriefId,
        confirmedBriefName: i.confirmedBrief?.name ?? null,
    }));
}

// Bulk-upload path: a lawyer drops in a pile of documents without knowing
// yet which brief each belongs to. Files are already sitting in blob storage
// by the time this runs (client-side upload already completed) — this just
// records each as a pending inbox row, same shape as anything that arrived
// by email or WhatsApp, so the existing confirm-to-brief flow sorts them too.
export interface ManualUploadInput {
    fileName: string;
    blobUrl: string;
    contentType: string;
    size: number;
}

export async function recordManualUploads(workspaceId: string, files: ManualUploadInput[]) {
    try {
        const session = await getSession();
        if (session.user.workspaceId !== workspaceId) {
            return { success: false, error: 'Not a member of this workspace' };
        }

        await Promise.all(files.map(f => recordPendingAttachment({
            workspaceId,
            source: 'upload',
            fileName: f.fileName,
            blobUrl: f.blobUrl,
            contentType: f.contentType,
            size: f.size,
            createdById: session.user.id,
        })));

        revalidatePath('/inbox');
        return { success: true, count: files.length };
    } catch (error) {
        console.error('Error recording manual uploads:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save uploaded files' };
    }
}

export async function confirmInboxAttachment(id: string, briefId: string) {
    try {
        const session = await getSession();

        const item = await prisma.inboxAttachment.findUnique({ where: { id }, select: { workspaceId: true } });
        if (!item) return { success: false, error: 'Item not found' };
        if (session.user.workspaceId !== item.workspaceId) {
            return { success: false, error: 'Not a member of this workspace' };
        }

        const brief = await prisma.brief.findFirst({
            where: { id: briefId, workspaceId: item.workspaceId },
            select: { id: true, name: true },
        });
        if (!brief) return { success: false, error: 'Brief not found in this workspace' };

        await fileInboxAttachment(id, briefId);
        revalidatePath('/inbox');
        return { success: true, briefName: brief.name };
    } catch (error) {
        console.error('Error confirming inbox attachment:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to file attachment' };
    }
}
