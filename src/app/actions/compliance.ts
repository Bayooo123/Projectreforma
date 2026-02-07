"use server";

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth'; // fixed import based on page.tsx usage
import { revalidatePath } from 'next/cache';

// Re-exporting Prisma types would be better, but keeping interfaces for now to match verified structure
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

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export async function getComplianceTasks(workspaceId: string, tier?: string): Promise<ActionResult<ComplianceTask[]>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const tasks = await prisma.complianceTask.findMany({
            where: {
                workspaceId,
                ...(tier ? { obligation: { tier } } : {})
            },
            include: {
                obligation: true,
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: [
                { status: 'asc' }, // pending first
                { dueDate: 'asc' }
            ]
        });

        return { success: true, data: tasks as unknown as ComplianceTask[] };
    } catch (error: any) {
        console.error('Failed to fetch compliance tasks:', error);
        return { success: false, error: error.message || 'Failed to fetch' };
    }
}

export async function uploadEvidence(taskId: string, evidenceUrl: string): Promise<ActionResult<ComplianceTask>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const task = await prisma.complianceTask.update({
            where: { id: taskId },
            data: {
                status: 'concluded', // Standardized status
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
                user: {
                    select: { name: true, email: true }
                }
            }
        });

        revalidatePath(`/management/compliance`);
        return { success: true, data: task as unknown as ComplianceTask };
    } catch (error: any) {
        console.error('Failed to upload evidence:', error);
        return { success: false, error: error.message || 'Failed to upload' };
    }
}

// Deprecating acknowledge but keeping for compatibility if needed, though plan implies auto-monitor
export async function acknowledgeComplianceTask(taskId: string): Promise<ActionResult<ComplianceTask>> {
    return { success: true, data: {} as any }; // No-op for now based on new strict flow
}

export async function markAsComplied(taskId: string): Promise<ActionResult<ComplianceTask>> {
    // Redirect to uploadEvidence usually, but for manual override:
    return { success: false, error: "Please upload evidence to conclude a task." };
}
