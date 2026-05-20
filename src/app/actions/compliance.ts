"use server";

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/log-activity';
import { getNextCycleDueDate, getNextCyclePeriodLabel } from '@/lib/compliance-utils';
import { z } from 'zod';

export interface ComplianceObligation {
    id: string;
    tier: string;
    regulatoryBody: string;
    nature: string;
    actionRequired: string;
    procedure: string;
    frequency: string;
    dueDateDescription: string | null;
    jurisdiction: string;
    feeDescription: string | null;
    feeSchedule: any | null;
    scope: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ComplianceTask {
    id: string;
    obligationId: string;
    workspaceId: string;
    status: string;
    dueDate: Date | null;
    period: string | null;
    evidenceUrl: string | null;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    obligation: ComplianceObligation;
    user?: {
        name: string | null;
        email: string;
    } | null;
}

export interface ComplianceSummary {
    total: number;
    concluded: number;
    overdue: number;
    dueSoon: number;
    pending: number;
    score: number;
    byTier: Record<string, { total: number; concluded: number; overdue: number }>;
}

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export async function getComplianceTasks(workspaceId: string, tier?: string): Promise<ActionResult<ComplianceTask[]>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const tasks = await prisma.complianceTask.findMany({
            where: {
                workspaceId,
                ...(tier ? { obligation: { tier } } : {})
            },
            include: {
                obligation: true,
                user: { select: { name: true, email: true } }
            },
            orderBy: [
                { status: 'asc' },
                { dueDate: 'asc' }
            ]
        });

        return { success: true, data: tasks as unknown as ComplianceTask[] };
    } catch (error: any) {
        console.error('Failed to fetch compliance tasks:', error);
        return { success: false, error: error.message || 'Failed to fetch' };
    }
}

export async function getComplianceSummary(workspaceId: string): Promise<ActionResult<ComplianceSummary>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const tasks = await prisma.complianceTask.findMany({
            where: { workspaceId },
            select: {
                status: true,
                dueDate: true,
                obligation: { select: { tier: true } },
            },
        });

        const now = new Date();
        const byTier: Record<string, { total: number; concluded: number; overdue: number }> = {};
        let concluded = 0;
        let overdue = 0;
        let dueSoon = 0;

        for (const task of tasks) {
            const tier = task.obligation.tier;
            if (!byTier[tier]) byTier[tier] = { total: 0, concluded: 0, overdue: 0 };
            byTier[tier].total++;

            const s = task.status.toLowerCase();
            if (s === 'concluded' || s === 'complied') {
                concluded++;
                byTier[tier].concluded++;
            } else if (task.dueDate) {
                const diff = Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / 86400000);
                if (diff < 0) {
                    overdue++;
                    byTier[tier].overdue++;
                } else if (diff <= 7) {
                    dueSoon++;
                }
            }
        }

        const total = tasks.length;
        const score = total > 0 ? Math.round((concluded / total) * 100) : 0;
        const pending = Math.max(0, total - concluded - overdue - dueSoon);

        return { success: true, data: { total, concluded, overdue, dueSoon, pending, score, byTier } };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch summary' };
    }
}

export async function uploadEvidence(taskId: string, evidenceUrl: string): Promise<ActionResult<ComplianceTask>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const task = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                status: 'concluded',
                evidenceUrl,
                history: {
                    create: {
                        action: 'evidence_upload',
                        description: `Evidence uploaded and task concluded by ${session.user.name || session.user.email}`,
                        performedBy: session.user.id
                    }
                }
            },
            include: {
                obligation: true,
                user: { select: { name: true, email: true } }
            }
        });

        // Auto-create next cycle task for recurring obligations
        const freq = task.obligation.frequency.toLowerCase();
        if (['monthly', 'quarterly'].includes(freq) && task.dueDate) {
            const nextDue = getNextCycleDueDate(task.obligation.frequency, task.dueDate);
            if (nextDue) {
                const existing = await prisma.complianceTask.findFirst({
                    where: {
                        workspaceId: task.workspaceId,
                        obligationId: task.obligationId,
                        status: { notIn: ['concluded', 'complied'] },
                        dueDate: { gte: nextDue },
                    }
                });
                if (!existing) {
                    await prisma.complianceTask.create({
                        data: {
                            workspaceId: task.workspaceId,
                            obligationId: task.obligationId,
                            status: 'pending',
                            dueDate: nextDue,
                            period: getNextCyclePeriodLabel(task.obligation.frequency, task.dueDate),
                        }
                    });
                }
            }
        }

        revalidatePath('/management/compliance');
        logActivity({
            workspaceId: task.workspaceId,
            userId: session.user.id!,
            resource: 'COMPLIANCE',
            action: 'UPLOADED',
            resourceId: task.id,
            resourceName: task.obligation?.actionRequired || 'Compliance task'
        }).catch(() => {});

        return { success: true, data: task as unknown as ComplianceTask };
    } catch (error: any) {
        console.error('Failed to upload evidence:', error);
        return { success: false, error: error.message || 'Failed to upload' };
    }
}

export async function acknowledgeComplianceTask(taskId: string): Promise<ActionResult<ComplianceTask>> {
    return { success: true, data: {} as any };
}

export async function markAsComplied(taskId: string): Promise<ActionResult<ComplianceTask>> {
    return { success: false, error: 'Please upload evidence to conclude a task.' };
}

const obligationSchema = z.object({
    taskId: z.string().optional(),
    actionRequired: z.string().min(1, 'Obligation is required'),
    regulatoryBody: z.string().min(1, 'Regulator is required'),
    nature: z.string().min(1, 'Requirement is required'),
    frequency: z.string().min(1, 'Frequency is required'),
    dueDate: z.string().nullable().optional(),
    status: z.string().min(1, 'Status is required'),
    evidenceUrl: z.string().url('Invalid URL').nullable().optional().or(z.literal('')),
    procedure: z.string().optional().default('Standard procedure'),
    feeDescription: z.string().optional().nullable(),
});

export async function updateComplianceTask(formData: FormData): Promise<ActionResult<ComplianceTask>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const taskId = formData.get('taskId') as string;
        const data = obligationSchema.parse({
            actionRequired: formData.get('actionRequired'),
            regulatoryBody: formData.get('regulatoryBody'),
            nature: formData.get('nature'),
            frequency: formData.get('frequency'),
            dueDate: formData.get('dueDate') || null,
            status: formData.get('status'),
            evidenceUrl: formData.get('evidenceUrl') || null,
            feeDescription: formData.get('feeDescription') || null,
        });

        const task = await prisma.complianceTask.findUnique({ where: { id: taskId } });
        if (!task) return { success: false, error: 'Task not found' };

        await prisma.complianceObligation.update({
            where: { id: task.obligationId },
            data: {
                actionRequired: data.actionRequired,
                regulatoryBody: data.regulatoryBody,
                nature: data.nature,
                frequency: data.frequency,
                ...(data.feeDescription !== undefined ? { feeDescription: data.feeDescription } : {}),
            }
        });

        const updatedTask = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                status: data.status,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                evidenceUrl: data.evidenceUrl || null,
                history: {
                    create: {
                        action: 'task_updated',
                        description: `Task explicitly updated by ${session.user.name || session.user.email}`,
                        performedBy: session.user.id
                    }
                }
            },
            include: { obligation: true, user: { select: { name: true, email: true } } }
        });

        revalidatePath('/management/compliance');
        return { success: true, data: updatedTask as unknown as ComplianceTask };
    } catch (error: any) {
        console.error('Failed to update compliance task:', error);
        return { success: false, error: error.message || 'Validation failed' };
    }
}

export async function createComplianceObligation(workspaceId: string, tier: string, formData: FormData): Promise<ActionResult<ComplianceTask>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const data = obligationSchema.parse({
            actionRequired: formData.get('actionRequired'),
            regulatoryBody: formData.get('regulatoryBody'),
            nature: formData.get('nature'),
            frequency: formData.get('frequency'),
            dueDate: formData.get('dueDate') || null,
            status: formData.get('status'),
            evidenceUrl: formData.get('evidenceUrl') || null,
            feeDescription: formData.get('feeDescription') || null,
        });

        const obligation = await prisma.complianceObligation.create({
            data: {
                tier,
                regulatoryBody: data.regulatoryBody,
                nature: data.nature,
                actionRequired: data.actionRequired,
                procedure: data.procedure || 'Standard procedure',
                frequency: data.frequency,
                jurisdiction: tier === 'State' ? 'Lagos' : 'Federal',
                feeDescription: data.feeDescription || null,
            }
        });

        const task = await prisma.complianceTask.create({
            data: {
                workspaceId,
                obligationId: obligation.id,
                status: data.status,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                evidenceUrl: data.evidenceUrl || null,
                history: {
                    create: {
                        action: 'task_created',
                        description: `Custom obligation created by ${session.user.name || session.user.email}`,
                        performedBy: session.user.id
                    }
                }
            },
            include: { obligation: true, user: { select: { name: true, email: true } } }
        });

        revalidatePath('/management/compliance');
        return { success: true, data: task as unknown as ComplianceTask };
    } catch (error: any) {
        console.error('Failed to create compliance obligation:', error);
        return { success: false, error: error.message || 'Creation failed' };
    }
}
