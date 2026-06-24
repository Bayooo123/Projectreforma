'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requireAuth, requirePermission } from '@/lib/auth-utils';
import { logActivity } from '@/lib/log-activity';

export async function logDocumentDownload(documentId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return;
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { name: true, brief: { select: { workspaceId: true } } },
        });
        if (!doc?.brief?.workspaceId) return;
        await logActivity({ workspaceId: doc.brief.workspaceId, userId: session.user.id, resource: 'DOCUMENT', action: 'DOWNLOADED', resourceId: documentId, resourceName: doc.name });
    } catch {}
}

export async function getDocuments(briefId: string, folderId?: string | null) {
    try {
        const whereClause: any = { briefId };
        if (folderId !== undefined) {
            whereClause.folderId = folderId; // Can be null for root documents
        }
        
        const documents = await prisma.document.findMany({
            where: whereClause,
            orderBy: {
                uploadedAt: 'desc',
            },
        });
        return documents;
    } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
    }
}

export async function createDocument(data: {
    name: string;
    url: string;
    type: string;
    size: number;
    briefId: string;
    folderId?: string | null;
}) {
    try {
        const document = await prisma.document.create({
            data: {
                name: data.name,
                url: data.url,
                type: data.type,
                size: data.size,
                briefId: data.briefId,
                folderId: data.folderId || null,
            },
        });
        revalidatePath(`/briefs/${data.briefId}`);
        revalidatePath('/briefs');
        return { success: true, document };
    } catch (error) {
        console.error('Error creating document:', error);
        return { success: false, error: 'Failed to create document' };
    }
}

export async function deleteDocument(id: string, briefId: string) {
    const session = await requireAuth();
    try {
        const doc = await prisma.document.findUnique({
            where: { id },
            select: { name: true, brief: { select: { workspaceId: true } } },
        });

        if (!doc?.brief?.workspaceId) return { success: false, error: 'Document not found' };

        await requirePermission(doc.brief.workspaceId, 'DELETE_BRIEF');

        await prisma.document.delete({ where: { id } });

        logActivity({ workspaceId: doc.brief.workspaceId, userId: session.id!, resource: 'DOCUMENT', action: 'DELETED', resourceId: id, resourceName: doc.name }).catch(() => {});

        revalidatePath(`/briefs/${briefId}`);
        revalidatePath('/briefs');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting document:', error);
        return { success: false, error: error?.message || 'Failed to delete document' };
    }
}

export async function getEmailDocumentsForBrief(briefId: string) {
    try {
        // Find all email attachments linked to this brief via PulseEvent
        const pulseEvents = await prisma.pulseEvent.findMany({
            where: { briefId, inboundEmailId: { not: null } },
            select: {
                inboundEmail: {
                    select: {
                        subject: true,
                        fromName: true,
                        receivedAt: true,
                        attachments: {
                            select: { id: true, name: true, url: true, contentType: true, size: true, uploadedAt: true },
                        },
                    },
                },
            },
        });

        // Collect existing document URLs so we don't double-list already-ingested attachments
        const existingUrls = new Set(
            (await prisma.document.findMany({ where: { briefId }, select: { url: true } })).map(d => d.url)
        );

        const seen = new Set<string>();
        const attachments: Array<{
            id: string; name: string; url: string; type: string; size: number;
            uploadedAt: Date; subject: string | null; senderName: string | null;
        }> = [];

        for (const pe of pulseEvents) {
            if (!pe.inboundEmail) continue;
            for (const att of pe.inboundEmail.attachments) {
                if (seen.has(att.id) || existingUrls.has(att.url)) continue;
                seen.add(att.id);
                attachments.push({
                    id: att.id,
                    name: att.name,
                    url: att.url,
                    type: att.contentType,
                    size: att.size,
                    uploadedAt: att.uploadedAt,
                    subject: pe.inboundEmail.subject,
                    senderName: pe.inboundEmail.fromName,
                });
            }
        }

        return attachments;
    } catch (error) {
        console.error('Error fetching email documents for brief:', error);
        return [];
    }
}

export async function getLinkedEmailsForBrief(briefId: string) {
    try {
        const pulseEvents = await prisma.pulseEvent.findMany({
            where: { briefId, inboundEmailId: { not: null } },
            select: {
                id: true,
                title: true,
                inboundEmail: {
                    select: {
                        id: true,
                        subject: true,
                        fromEmail: true,
                        fromName: true,
                        bodyPreview: true,
                        body: true,
                        receivedAt: true,
                        attachmentCount: true,
                        attachments: { select: { id: true, name: true, url: true, contentType: true, size: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return pulseEvents
            .filter(pe => pe.inboundEmail)
            .map(pe => ({
                pulseId: pe.id,
                pulseTitle: pe.title,
                ...pe.inboundEmail!,
            }));
    } catch (error) {
        console.error('Error fetching linked emails for brief:', error);
        return [];
    }
}

export async function getDocumentVersions(documentId: string) {
    try {
        // Fetch without explicit select so all scalar fields (including versionOfId) are returned
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        const orClauses: any[] = [
            { id: documentId },
        ];
        // Children: documents that are versions of this one
        // Cast to any because versionOfId may not appear in the generated select type
        // but IS a valid filter field on DocumentWhereInput
        orClauses.push({ versionOfId: documentId } as any);
        // Parent: document this is a version of
        if ((doc as any)?.versionOfId) {
            orClauses.push({ id: (doc as any).versionOfId });
        }

        const versions = await prisma.document.findMany({
            where: { OR: orClauses },
            orderBy: { uploadedAt: 'asc' },
        });

        return versions;
    } catch {
        return [];
    }
}
