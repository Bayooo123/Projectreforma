'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getBriefs(workspaceId: string) {
    try {
        console.log('[getBriefs] Fetching briefs for workspace:', workspaceId);
        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        type: true,
                        size: true,
                        uploadedAt: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        console.log('[getBriefs] Found', briefs.length, 'briefs');
        return briefs;
    } catch (error) {
        console.error('Error fetching briefs:', error);
        return [];
    }
}

export async function getBriefById(id: string) {
    try {
        const brief = await prisma.brief.findUnique({
            where: { id },
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                matter: true,
                documents: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return brief;
    } catch (error) {
        console.error('Error fetching brief:', error);
        return null;
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
    dueDate?: Date;
    description?: string;
}) {
    try {
        console.log('[createBrief] Creating brief:', data);
        const brief = await prisma.brief.create({
            data: {
                briefNumber: data.briefNumber,
                name: data.name,
                clientId: data.clientId,
                lawyerId: data.lawyerId,
                workspaceId: data.workspaceId,
                category: data.category,
                status: data.status,
                dueDate: data.dueDate,
                description: data.description,
            },
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        console.log('[createBrief] Brief created successfully:', brief.id);
        revalidatePath('/briefs');
        return { success: true, brief };
    } catch (error) {
        console.error('Error creating brief:', error);
        return { success: false, error: 'Failed to create brief' };
    }
}

export async function updateBrief(
    id: string,
    data: {
        name?: string;
        clientId?: string;
        lawyerId?: string;
        category?: string;
        status?: string;
        dueDate?: Date | null;
        description?: string;
    }
) {
    try {
        const brief = await prisma.brief.update({
            where: { id },
            data,
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        revalidatePath('/briefs');
        revalidatePath(`/briefs/${id}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error updating brief:', error);
        return { success: false, error: 'Failed to update brief' };
    }
}

export async function deleteBrief(id: string) {
    try {
        // Delete associated documents first (cascade should handle this, but being explicit)
        await prisma.document.deleteMany({
            where: { briefId: id },
        });

        // Delete the brief
        await prisma.brief.delete({
            where: { id },
        });

        revalidatePath('/briefs');
        return { success: true };
    } catch (error) {
        console.error('Error deleting brief:', error);
        return { success: false, error: 'Failed to delete brief' };
    }
}

export async function assignLawyer(briefId: string, lawyerId: string) {
    try {
        const brief = await prisma.brief.update({
            where: { id: briefId },
            data: { lawyerId },
            include: {
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        revalidatePath('/briefs');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error assigning lawyer:', error);
        return { success: false, error: 'Failed to assign lawyer' };
    }
}
