'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export type WorkEntryWithRelations = {
    id: string;
    userId: string;
    workspaceId: string;
    briefId: string | null;
    description: string;
    date: Date;
    status: string;
    completedAt: Date | null;
    completedNote: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
    brief: { id: string; name: string; customTitle: string | null; briefNumber: string } | null;
};

export async function createWorkEntry(data: {
    workspaceId: string;
    briefId?: string | null;
    description: string;
}) {
    const user = await requireAuth();
    if (!user.id) return { success: false, error: 'Unauthorized' };

    const entry = await prisma.workEntry.create({
        data: {
            workspaceId: data.workspaceId,
            userId: user.id,
            briefId: data.briefId || null,
            description: data.description.trim(),
            date: new Date(),
            status: 'PLANNED',
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            brief: { select: { id: true, name: true, customTitle: true, briefNumber: true } },
        },
    });

    revalidatePath('/pulse');
    return { success: true, data: entry };
}

export async function updateWorkEntryStatus(id: string, status: 'IN_PROGRESS' | 'COMPLETED', completedNote?: string) {
    await requireAuth();

    await prisma.workEntry.update({
        where: { id },
        data: {
            status,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            completedNote: completedNote?.trim() || null,
        },
    });

    revalidatePath('/pulse');
    return { success: true };
}

export async function deleteWorkEntry(id: string) {
    await requireAuth();
    await prisma.workEntry.delete({ where: { id } });
    revalidatePath('/pulse');
    return { success: true };
}

export async function getTodayWorkEntries(workspaceId: string): Promise<WorkEntryWithRelations[]> {
    await requireAuth();

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.workEntry.findMany({
        where: {
            workspaceId,
            date: { gte: startOfDay, lte: endOfDay },
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            brief: { select: { id: true, name: true, customTitle: true, briefNumber: true } },
        },
        orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    });
}
