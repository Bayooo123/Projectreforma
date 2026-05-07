'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { createNotification } from '@/app/actions/notifications';
import {
    MILESTONE_CONFIG,
    MILESTONE_ORDER,
    type LitigationMilestoneType,
} from '@/lib/litigation/milestones';
import type { LitigationMilestone } from '@prisma/client';

export type { LitigationMilestone };

export async function initializeMilestonesForMatter(
    matterId: string,
    workspaceId: string,
): Promise<void> {
    // Create all 13 milestones with PENDING status — idempotent via skipDuplicates
    const data = MILESTONE_ORDER.map(type => ({
        matterId,
        workspaceId,
        type,
        status: 'PENDING' as const,
    }));

    await prisma.litigationMilestone.createMany({ data, skipDuplicates: true });
}

export async function getMilestonesForMatter(matterId: string): Promise<LitigationMilestone[]> {
    await requireAuth();
    return prisma.litigationMilestone.findMany({
        where: { matterId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function completeMilestone(
    milestoneId: string,
    notes?: string,
    completedAtOverride?: Date,
): Promise<{ success: boolean; error?: string }> {
    await requireAuth();

    try {
        const milestone = await prisma.litigationMilestone.findUnique({
            where: { id: milestoneId },
            select: { id: true, matterId: true, workspaceId: true, type: true },
        });
        if (!milestone) return { success: false, error: 'Milestone not found' };

        const completedAt = completedAtOverride ?? new Date();

        await prisma.litigationMilestone.update({
            where: { id: milestoneId },
            data: { status: 'COMPLETED', completedAt, notes: notes ?? null },
        });

        // Cascade: set dueDate on any milestone that is triggered by this one
        await propagateDueDates(milestone.matterId, milestone.type as LitigationMilestoneType, completedAt);

        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to complete milestone' };
    }
}

export async function updateMilestoneDueDate(
    milestoneId: string,
    dueDate: Date,
): Promise<{ success: boolean; error?: string }> {
    await requireAuth();

    try {
        await prisma.litigationMilestone.update({
            where: { id: milestoneId },
            data: { dueDate },
        });
        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to update due date' };
    }
}

export async function waiveMilestone(
    milestoneId: string,
    notes?: string,
): Promise<{ success: boolean; error?: string }> {
    await requireAuth();

    try {
        await prisma.litigationMilestone.update({
            where: { id: milestoneId },
            data: { status: 'WAIVED', notes: notes ?? null },
        });
        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to waive milestone' };
    }
}

export async function checkOverdueMilestones(workspaceId: string): Promise<{ updated: number }> {
    const now = new Date();

    const result = await prisma.litigationMilestone.updateMany({
        where: {
            workspaceId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { lt: now },
        },
        data: { status: 'OVERDUE' },
    });

    return { updated: result.count };
}

export async function getMilestonesDashboard(workspaceId: string) {
    await requireAuth();

    const [overdue, upcoming, recentlyCompleted] = await Promise.all([
        prisma.litigationMilestone.findMany({
            where: { workspaceId, status: 'OVERDUE' },
            include: { matter: { select: { id: true, name: true, caseNumber: true } } },
            orderBy: { dueDate: 'asc' },
            take: 20,
        }),
        prisma.litigationMilestone.findMany({
            where: {
                workspaceId,
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                dueDate: { not: null, gte: new Date() },
            },
            include: { matter: { select: { id: true, name: true, caseNumber: true } } },
            orderBy: { dueDate: 'asc' },
            take: 20,
        }),
        prisma.litigationMilestone.findMany({
            where: {
                workspaceId,
                status: 'COMPLETED',
                completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
            },
            include: { matter: { select: { id: true, name: true, caseNumber: true } } },
            orderBy: { completedAt: 'desc' },
            take: 10,
        }),
    ]);

    return { overdue, upcoming, recentlyCompleted };
}

// ── Internal: cascade due dates when a milestone is completed ──────────────

async function propagateDueDates(
    matterId: string,
    completedType: LitigationMilestoneType,
    completedAt: Date,
) {
    // Find all milestones triggered by completedType
    const dependents = (Object.entries(MILESTONE_CONFIG) as [LitigationMilestoneType, typeof MILESTONE_CONFIG[LitigationMilestoneType]][])
        .filter(([, cfg]) => cfg.triggerMilestone === completedType && cfg.deadlineDays !== null);

    for (const [type, cfg] of dependents) {
        const dueDate = new Date(completedAt.getTime() + cfg.deadlineDays! * 86_400_000);
        await prisma.litigationMilestone.updateMany({
            where: { matterId, type, status: { in: ['PENDING', 'IN_PROGRESS'] } },
            data: { dueDate },
        });

        // Schedule a warning notification if warnDays > 0
        if (cfg.warnDays > 0) {
            const warnDate = new Date(dueDate.getTime() - cfg.warnDays * 86_400_000);
            if (warnDate > new Date()) {
                const matter = await prisma.matter.findUnique({
                    where: { id: matterId },
                    select: { workspaceId: true, name: true, lawyerInChargeId: true },
                });
                if (matter?.lawyerInChargeId) {
                    await prisma.scheduledNotification.create({
                        data: {
                            matterId,
                            recipientId: matter.lawyerInChargeId,
                            notificationType: `MILESTONE_WARNING_${type}`,
                            scheduledFor: warnDate,
                        },
                    });
                }
            }
        }
    }
}
