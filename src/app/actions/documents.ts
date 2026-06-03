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

export async function getDocumentVersions(documentId: string) {
    try {
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { versionOfId: true }
        });

        // Find all documents in the same chain (up and down)
        // For simplicity in this logic, we search for docs with the same origin or linked to this
        // In a real tree we'd recurse, but here we can find all linked in the brief with similarity
        
        // Let's just find the immediate parents and children for now
        const versions = await prisma.document.findMany({
            where: {
                OR: [
                    { id: documentId },
                    { versionOfId: documentId },
                    { id: doc?.versionOfId || 'none' }
                ]
            },
            select: {
                id: true,
                name: true,
                version: true,
                uploadedAt: true,
                url: true
            },
            orderBy: { version: 'desc' }
        });

        return versions;
    } catch (error) {
        console.error('Error fetching document versions:', error);
        return [];
    }
}
