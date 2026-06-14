'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export type WorkEntry = {
    id: string;
    userId: string;
    createdById: string | null;
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
    createdBy: { id: string; name: string | null; email: string } | null;
    brief: { id: string; name: string; customTitle: string | null; briefNumber: string; customBriefNumber: string | null } | null;
};

const INCLUDE = {
    user: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    brief: { select: { id: true, name: true, customTitle: true, briefNumber: true, customBriefNumber: true } },
} as const;

async function isAdminOrOwner(workspaceId: string, userId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, status: 'active' },
        select: { role: true },
    });
    return !!(member && ['admin', 'owner', 'managing partner'].includes(member.role?.toLowerCase() ?? ''));
}

/**
 * Create a work entry.
 * Admins/owners may specify targetUserId to log on behalf of another team member.
 * Regular members can only log for themselves.
 */
export async function createWorkEntry(data: {
    workspaceId: string;
    targetUserId?: string | null;
    briefId?: string | null;
    title: string;
    description?: string | null;
    priority?: string;
    dueDate?: Date | string | null;
}) {
    const caller = await requireAuth();
    if (!caller.id) return { success: false as const, error: 'Unauthorized' };

    // Determine who the entry is assigned to
    let assignedToId = caller.id;
    if (data.targetUserId && data.targetUserId !== caller.id) {
        const admin = await isAdminOrOwner(data.workspaceId, caller.id);
        if (!admin) return { success: false as const, error: 'Only admins can log work on behalf of others' };
        assignedToId = data.targetUserId;
    }

    const entry = await prisma.workEntry.create({
        data: {
            workspaceId: data.workspaceId,
            userId: assignedToId,
            createdById: caller.id,
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

/**
 * Update status. Admins can update anyone's entry; regular members only their own.
 */
export async function updateWorkEntryStatus(
    id: string,
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE',
    completedNote?: string,
) {
    const caller = await requireAuth();

    const entry = await prisma.workEntry.findUnique({ where: { id }, select: { userId: true, workspaceId: true } });
    if (!entry) return { success: false, error: 'Entry not found' };

    // Non-admins can only update their own entries
    if (entry.userId !== caller.id) {
        const admin = await isAdminOrOwner(entry.workspaceId, caller.id);
        if (!admin) return { success: false, error: 'Cannot update another member\'s entry' };
    }

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
    const caller = await requireAuth();

    const entry = await prisma.workEntry.findUnique({ where: { id }, select: { userId: true, workspaceId: true } });
    if (!entry) return { success: false };

    if (entry.userId !== caller.id) {
        const admin = await isAdminOrOwner(entry.workspaceId, caller.id);
        if (!admin) return { success: false, error: 'Cannot delete another member\'s entry' };
    }

    await prisma.workEntry.delete({ where: { id } });
    revalidatePath('/pulse');
    return { success: true };
}

/** Today's entries assigned TO the current user (for My Pulse). */
export async function getTodayWorkEntries(workspaceId: string): Promise<WorkEntry[]> {
    const user = await requireAuth();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.workEntry.findMany({
        where: {
            workspaceId,
            userId: user.id,          // entries ASSIGNED TO me
            date: { gte: startOfDay, lte: endOfDay },
        },
        include: INCLUDE,
        orderBy: [{ createdAt: 'asc' }],
    }) as Promise<WorkEntry[]>;
}

/** Today's full firm-wide log — all members, all entries (for Firmwide board). */
export async function getFirmWorkLog(workspaceId: string, date?: string): Promise<WorkEntry[]> {
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

/** All team members for the morning briefing form. */
export async function getWorkspaceTeamMembers(workspaceId: string) {
    await requireAuth();
    return prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        select: {
            userId: true,
            role: true,
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { user: { name: 'asc' } },
    });
}

/** For IT Management Work Logs tab date browsing. */
export async function getTeamWorkLogs(workspaceId: string, date?: string): Promise<WorkEntry[]> {
    return getFirmWorkLog(workspaceId, date);
}

export async function getWorkLogStats(workspaceId: string) {
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

    return { todayTotal, todayCompleted, todayOverdue, membersSubmitted: submitted.length, membersTotal: members };
}
