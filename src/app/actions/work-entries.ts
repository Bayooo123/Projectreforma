'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export type WorkEntry = {
    id: string;
    userId: string;
    workspaceId: string;
    briefId: string | null;
    title: string;
    description: string | null;
    priority: string;
    dueDate: Date | null;
    date: Date;
    status: string;
    completedAt: Date | null;
    completedNote: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
    brief: { id: string; name: string; customTitle: string | null; briefNumber: string; customBriefNumber: string | null } | null;
};

const INCLUDE = {
    user: { select: { id: true, name: true, email: true } },
    brief: { select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true } },
} as const;

export async function createWorkEntry(data: {
    workspaceId: string;
    briefId?: string | null;
    title: string;
    description?: string | null;
    priority?: string;
    dueDate?: Date | string | null;
}) {
    const user = await requireAuth();
    if (!user.id) return { success: false as const, error: 'Unauthorized' };

    const entry = await prisma.workEntry.create({
        data: {
            workspaceId: data.workspaceId,
            userId: user.id,
            briefId: data.briefId || null,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            priority: data.priority || 'medium',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            date: new Date(),
            status: 'PLANNED',
        },
        include: INCLUDE,
    });

    revalidatePath('/pulse');
    return { success: true as const, data: entry as WorkEntry };
}

export async function updateWorkEntryStatus(
    id: string,
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE',
    completedNote?: string,
) {
    await requireAuth();

    const isTerminal = status === 'COMPLETED' || status === 'SUBMITTED';
    await prisma.workEntry.update({
        where: { id },
        data: {
            status,
            completedAt: isTerminal ? new Date() : null,
            completedNote: isTerminal && completedNote ? completedNote.trim() : null,
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

export async function getTodayWorkEntries(workspaceId: string): Promise<WorkEntry[]> {
    const user = await requireAuth();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.workEntry.findMany({
        where: {
            workspaceId,
            userId: user.id,
            date: { gte: startOfDay, lte: endOfDay },
        },
        include: INCLUDE,
        orderBy: [{ createdAt: 'asc' }],
    }) as Promise<WorkEntry[]>;
}

export async function getTeamWorkLogs(workspaceId: string, date?: string): Promise<WorkEntry[]> {
    await requireAuth();

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.workEntry.findMany({
        where: {
            workspaceId,
            date: { gte: startOfDay, lte: endOfDay },
        },
        include: INCLUDE,
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }],
    }) as Promise<WorkEntry[]>;
}

export async function getWorkLogStats(workspaceId: string): Promise<{
    todayTotal: number;
    todayCompleted: number;
    todayOverdue: number;
    membersSubmitted: number;
    membersTotal: number;
}> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [todayTotal, todayCompleted, todayOverdue, submitted, members] = await Promise.all([
        prisma.workEntry.count({ where: { workspaceId, date: { gte: startOfDay, lte: endOfDay } } }),
        prisma.workEntry.count({ where: { workspaceId, date: { gte: startOfDay, lte: endOfDay }, status: { in: ['COMPLETED', 'SUBMITTED'] } } }),
        prisma.workEntry.count({ where: { workspaceId, date: { gte: startOfDay, lte: endOfDay }, status: 'OVERDUE' } }),
        prisma.workEntry.groupBy({ by: ['userId'], where: { workspaceId, date: { gte: startOfDay, lte: endOfDay } } }),
        prisma.workspaceMember.count({ where: { workspaceId, status: 'active' } }),
    ]);

    return {
        todayTotal,
        todayCompleted,
        todayOverdue,
        membersSubmitted: submitted.length,
        membersTotal: members,
    };
}
