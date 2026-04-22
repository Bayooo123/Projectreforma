'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { createNotification } from '@/app/actions/notifications';

async function assertWorkspaceMembership(workspaceId: string) {
    const user = await requireAuth();
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            user: { email: user.email! },
        },
        select: { id: true },
    });

    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this workspace');
    }

    return user;
}

export async function createMatter(input: {
    workspaceId: string;
    userId: string;
    name: string;
    caseNumber?: string;
    court?: string;
    judge?: string;
    nextCourtDate?: Date;
}) {
    try {
        await assertWorkspaceMembership(input.workspaceId);

        const defaultClient = await prisma.client.findFirst({
            where: { workspaceId: input.workspaceId },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        });

        if (!defaultClient) {
            return { success: false, error: 'Create at least one client before adding a matter.' };
        }

        const matter = await prisma.matter.create({
            data: {
                workspaceId: input.workspaceId,
                clientId: defaultClient.id,
                lawyerInChargeId: input.userId,
                name: input.name,
                caseNumber: input.caseNumber || null,
                court: input.court || null,
                judge: input.judge || null,
                nextCourtDate: input.nextCourtDate || null,
                status: 'active',
            },
        });

        if (input.nextCourtDate) {
            await prisma.calendarEntry.create({
                data: {
                    matterId: matter.id,
                    date: input.nextCourtDate,
                    type: 'COURT',
                    title: 'Initial Court Date',
                    court: input.court || null,
                    judge: input.judge || null,
                    submittingLawyerId: input.userId,
                },
            });
        }

        await createNotification({
            workspaceId: input.workspaceId,
            title: 'New matter recorded',
            message: `"${input.name}" has been added to the calendar${input.court ? ` at ${input.court}` : ''}.`,
            type: 'info',
            priority: 'low',
            recipients: 'ALL',
            relatedMatterId: matter.id,
        }).catch(() => {});

        revalidatePath('/calendar');
        return { success: true, data: matter };
    } catch (error: any) {
        console.error('createMatter failed:', error);
        return { success: false, error: error?.message || 'Failed to create matter' };
    }
}

export async function scheduleMeeting(input: {
    title: string;
    date: Date;
    type?: 'MEETING';
    matterId?: string;
    location?: string;
    agenda?: string;
    participantIds?: string[];
    workspaceId: string;
}) {
    try {
        await assertWorkspaceMembership(input.workspaceId);

        const entry = await prisma.calendarEntry.create({
            data: {
                title: input.title,
                date: input.date,
                type: 'MEETING',
                matterId: input.matterId || null,
                location: input.location || null,
                agenda: input.agenda || null,
                appearances: input.participantIds?.length
                    ? { connect: input.participantIds.map(id => ({ id })) }
                    : undefined,
            },
        });

        const dateStr = input.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const recipients = input.participantIds?.length
            ? { userIds: input.participantIds }
            : 'ALL' as const;

        await createNotification({
            workspaceId: input.workspaceId,
            title: 'Meeting scheduled',
            message: `"${input.title}" is scheduled for ${dateStr}${input.location ? ` at ${input.location}` : ''}.`,
            type: 'info',
            priority: 'medium',
            recipients,
            relatedMatterId: input.matterId || undefined,
        }).catch(() => {});

        revalidatePath('/calendar');
        return { success: true, data: entry };
    } catch (error: any) {
        console.error('scheduleMeeting failed:', error);
        return { success: false, error: error?.message || 'Failed to schedule meeting' };
    }
}

export async function adjournMatter(
    matterId: string,
    newDate: Date,
    proceedings: string,
    adjournedFor: string,
    userId: string,
    participantIds: string[] = []
) {
    try {
        await requireAuth();

        const matter = await prisma.matter.findUnique({
            where: { id: matterId },
            select: { name: true, workspaceId: true },
        });

        await prisma.$transaction(async tx => {
            await tx.matter.update({
                where: { id: matterId },
                data: { nextCourtDate: newDate },
            });

            await tx.calendarEntry.create({
                data: {
                    matterId,
                    date: newDate,
                    type: 'COURT',
                    proceedings: proceedings || null,
                    adjournedFor: adjournedFor || null,
                    submittingLawyerId: userId,
                    appearances: participantIds.length
                        ? { connect: participantIds.map(id => ({ id })) }
                        : undefined,
                },
            });
        });

        if (matter) {
            const dateStr = newDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            await createNotification({
                workspaceId: matter.workspaceId,
                title: 'Matter adjourned',
                message: `"${matter.name}" adjourned to ${dateStr}${adjournedFor ? ` — ${adjournedFor}` : ''}.`,
                type: 'warning',
                priority: 'medium',
                recipients: 'ALL',
                relatedMatterId: matterId,
            }).catch(() => {});
        }

        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        console.error('adjournMatter failed:', error);
        return { success: false, error: error?.message || 'Failed to adjourn matter' };
    }
}

export async function addMatterNote(matterId: string, note: string, userId: string) {
    try {
        await requireAuth();
        await prisma.matterActivityLog.create({
            data: {
                matterId,
                description: note,
                activityType: 'NOTE',
                performedBy: userId,
            },
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to add note' };
    }
}

export async function updateMatter(
    matterId: string,
    patch: { name?: string; court?: string; judge?: string },
    _userId: string
) {
    try {
        await requireAuth();
        const updated = await prisma.matter.update({
            where: { id: matterId },
            data: {
                name: patch.name,
                court: patch.court ?? null,
                judge: patch.judge ?? null,
            },
        });
        revalidatePath('/calendar');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to update matter' };
    }
}

export async function deleteMatter(matterId: string) {
    try {
        await requireAuth();
        await prisma.matter.delete({ where: { id: matterId } });
        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to delete matter' };
    }
}

export async function updateCalendarEntry(
    entryId: string,
    patch: { proceedings?: string; outcome?: string; adjournedFor?: string; title?: string }
) {
    try {
        await requireAuth();
        const updated = await prisma.calendarEntry.update({
            where: { id: entryId },
            data: {
                proceedings: patch.proceedings ?? undefined,
                outcome: patch.outcome ?? undefined,
                adjournedFor: patch.adjournedFor ?? undefined,
                title: patch.title ?? undefined,
            },
        });
        revalidatePath('/calendar');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to update calendar entry' };
    }
}