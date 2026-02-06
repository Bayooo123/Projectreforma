"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export async function getComplianceTasks(workspaceId: string) {
    try {
        const user = await requireAuth();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const tasks = await prisma.complianceTask.findMany({
            where: { workspaceId },
            include: {
                obligation: true,
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: [
                { status: 'asc' },
                { dueDate: 'asc' }
            ]
        });

        return { success: true, data: tasks };
    } catch (error: any) {
        console.error('Failed to fetch compliance tasks:', error);
        return { success: false, error: error.message || 'Failed to fetch' };
    }
}

export async function acknowledgeComplianceTask(taskId: string) {
    try {
        const user = await requireAuth();
        if (!user.id) return { success: false, error: 'User ID missing' };

        const task = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                acknowledgedAt: new Date(),
                acknowledgedBy: user.id,
                history: {
                    create: {
                        action: 'acknowledgement',
                        description: `Task acknowledged by ${user.name || user.email}`,
                        performedBy: user.id
                    }
                }
            }
        });

        revalidatePath(`/management/compliance`);
        return { success: true, data: task };
    } catch (error: any) {
        console.error('Failed to acknowledge compliance task:', error);
        return { success: false, error: error.message || 'Failed to acknowledge' };
    }
}

export async function markAsComplied(taskId: string, evidenceUrl?: string) {
    try {
        const user = await requireAuth();
        if (!user.id) return { success: false, error: 'User ID missing' };

        const task = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                status: 'complied',
                evidenceUrl: evidenceUrl || undefined,
                history: {
                    create: {
                        action: 'status_change',
                        description: `Task marked as Complied by ${user.name || user.email}`,
                        performedBy: user.id
                    }
                }
            }
        });

        revalidatePath(`/management/compliance`);
        return { success: true, data: task };
    } catch (error: any) {
        console.error('Failed to mark compliance task as complied:', error);
        return { success: false, error: error.message || 'Failed to update' };
    }
}

export async function uploadComplianceEvidence(taskId: string, evidenceUrl: string) {
    try {
        const user = await requireAuth();
        if (!user.id) return { success: false, error: 'User ID missing' };

        const task = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                evidenceUrl,
                history: {
                    create: {
                        action: 'evidence_upload',
                        description: `Evidence uploaded by ${user.name || user.email}`,
                        performedBy: user.id
                    }
                }
            }
        });

        revalidatePath(`/management/compliance`);
        return { success: true, data: task };
    } catch (error: any) {
        console.error('Failed to upload compliance evidence:', error);
        return { success: false, error: error.message || 'Failed to upload' };
    }
}
