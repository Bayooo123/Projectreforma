'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';

export async function getFolders(briefId: string, parentId: string | null = null) {
    try {
        const folders = await prisma.folder.findMany({
            where: {
                briefId,
                parentId,
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                _count: {
                    select: { documents: true }
                }
            }
        });
        return folders;
    } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
    }
}

export async function createFolder(data: { name: string, description?: string, briefId: string, parentId?: string }) {
    await requireAuth();
    try {
        const existing = await prisma.folder.findFirst({
            where: {
                name: data.name,
                briefId: data.briefId,
                parentId: data.parentId || null,
            }
        });

        if (existing) {
            return { success: false, error: 'A folder with this name already exists.' };
        }

        const folder = await prisma.folder.create({
            data: {
                name: data.name,
                description: data.description,
                briefId: data.briefId,
                parentId: data.parentId || null,
            },
        });
        
        revalidatePath(`/briefs/${data.briefId}`);
        return { success: true, folder };
    } catch (error) {
        console.error('Error creating folder:', error);
        return { success: false, error: 'Failed to create folder' };
    }
}

export async function moveDocument(documentId: string, folderId: string | null, briefId: string) {
    await requireAuth();
    try {
        const document = await prisma.document.update({
            where: { id: documentId },
            data: { folderId },
        });

        revalidatePath(`/briefs/${briefId}`);
        return { success: true, document };
    } catch (error) {
        console.error('Error moving document:', error);
        return { success: false, error: 'Failed to move document' };
    }
}

export async function deleteFolder(folderId: string, briefId: string, moveContentsToRoot: boolean = true) {
    await requireAuth();
    try {
        if (moveContentsToRoot) {
            // Prevent documents from being cascade-deleted
            await prisma.document.updateMany({
                where: { folderId },
                data: { folderId: null }
            });
            // Update child folders to point to null if multiple levels exist
            await prisma.folder.updateMany({
                where: { parentId: folderId },
                data: { parentId: null }
            });
        }
        
        await prisma.folder.delete({
            where: { id: folderId }
        });

        revalidatePath(`/briefs/${briefId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting folder:', error);
        return { success: false, error: 'Failed to delete folder' };
    }
}
