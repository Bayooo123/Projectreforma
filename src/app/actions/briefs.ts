'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getBriefs(workspaceId: string) {
    try {
        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId,
            },
            include: {
                client: true,
                lawyer: true,
                documents: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        return briefs;
    } catch (error) {
        console.error('Error fetching briefs:', error);
        return [];
    }
}

export async function createBrief(data: {
    briefNumber: string;
    name: string;
    clientId: string;
    lawyerId: string;
    workspaceId: string;
    category: string;
    status: string;
}) {
    try {
        const brief = await prisma.brief.create({
            data: {
                briefNumber: data.briefNumber,
                name: data.name,
                clientId: data.clientId,
                lawyerId: data.lawyerId,
                workspaceId: data.workspaceId,
                category: data.category,
                status: data.status,
            },
        });
        revalidatePath('/briefs');
        return { success: true, brief };
    } catch (error) {
        console.error('Error creating brief:', error);
        return { success: false, error: 'Failed to create brief' };
    }
}
