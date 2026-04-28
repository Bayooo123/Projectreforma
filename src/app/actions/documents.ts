'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
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
    try {
        await prisma.document.delete({
            where: { id },
        });
        revalidatePath(`/briefs/${briefId}`);
        revalidatePath('/briefs');
        return { success: true };
    } catch (error) {
        console.error('Error deleting document:', error);
        return { success: false, error: 'Failed to delete document' };
    }
}
