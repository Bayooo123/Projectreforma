'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logActivity } from '@/lib/log-activity';
import { revalidatePath } from 'next/cache';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export interface BriefTrackerRow {
    id: string;
    name: string;
    briefNumber: string;
    client: string | null;
    lawyerInCharge: string | null;
    manualStatus: string | null;
    manualNextAction: string | null;
    manualStatusUpdatedAt: Date | null;
    manualStatusUpdatedBy: string | null;
}

// A plain, non-AI record of where every brief stands and what happens next —
// the manual equivalent of the AI board, for firms that haven't turned AI
// checks on yet (or just want a quick spreadsheet-style view any lawyer can
// edit directly, no tokens involved).
export async function getBriefTrackerBoard(workspaceId: string, scope: 'firm' | 'mine'): Promise<BriefTrackerRow[]> {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    const briefs = await prisma.brief.findMany({
        where: {
            workspaceId,
            status: 'active',
            deletedAt: null,
            ...(scope === 'mine' ? { OR: [{ lawyerId: session.user.id }, { lawyerInChargeId: session.user.id }] } : {}),
        },
        select: {
            id: true, name: true, briefNumber: true,
            client: { select: { name: true } },
            lawyerInCharge: { select: { name: true } },
            lawyer: { select: { name: true } },
            manualStatus: true,
            manualNextAction: true,
            manualStatusUpdatedAt: true,
            manualStatusUpdatedBy: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return briefs.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        client: b.client?.name ?? null,
        lawyerInCharge: b.lawyerInCharge?.name ?? b.lawyer?.name ?? null,
        manualStatus: b.manualStatus,
        manualNextAction: b.manualNextAction,
        manualStatusUpdatedAt: b.manualStatusUpdatedAt,
        manualStatusUpdatedBy: b.manualStatusUpdatedBy?.name ?? null,
    }));
}

// Any workspace member can edit — same bar as updateBrief's ordinary fields.
// This is meant to be as low-friction as editing a spreadsheet cell.
export async function updateBriefTracker(
    briefId: string,
    data: { manualStatus?: string; manualNextAction?: string }
) {
    try {
        const session = await getSession();

        const brief = await prisma.brief.findUnique({
            where: { id: briefId },
            select: { workspaceId: true, name: true },
        });
        if (!brief) return { success: false, error: 'Brief not found' };

        const [membership, workspace] = await Promise.all([
            prisma.workspaceMember.findFirst({
                where: { userId: session.user.id, workspaceId: brief.workspaceId },
            }),
            prisma.workspace.findUnique({
                where: { id: brief.workspaceId },
                select: { ownerId: true },
            }),
        ]);
        const isWorkspaceOwner = workspace?.ownerId === session.user.id;
        if (!membership && !isWorkspaceOwner) {
            return { success: false, error: 'Not a member of this workspace' };
        }

        const updated = await prisma.brief.update({
            where: { id: briefId },
            data: {
                ...data,
                manualStatusUpdatedAt: new Date(),
                manualStatusUpdatedById: session.user.id,
            },
            select: { manualStatusUpdatedAt: true, manualStatusUpdatedBy: { select: { name: true } } },
        });

        logActivity({
            workspaceId: brief.workspaceId,
            userId: session.user.id!,
            resource: 'BRIEF',
            action: 'UPDATED',
            resourceId: briefId,
            resourceName: brief.name,
            metadata: { field: 'manualTracker' },
        }).catch(() => {});

        revalidatePath('/pulse');

        return {
            success: true,
            manualStatusUpdatedAt: updated.manualStatusUpdatedAt,
            manualStatusUpdatedBy: updated.manualStatusUpdatedBy?.name ?? null,
        };
    } catch (error) {
        console.error('Error updating brief tracker:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update' };
    }
}
