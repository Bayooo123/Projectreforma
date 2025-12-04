'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDocuments(briefId: string) {
    try {
        const documents = await prisma.document.findMany({
            where: {
                briefId,
            },
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
}) {
    try {
        const document = await prisma.document.create({
            data: {
                name: data.name,
                url: data.url,
                type: data.type,
                size: data.size,
                briefId: data.briefId,
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
