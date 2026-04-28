'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { createNotification } from '@/app/actions/notifications';
import { scheduleCourtReminders } from '@/lib/courtReminders';

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
    // First sitting
    firstSittingDate?: Date;
    proceedings?: string;
    adjournedFor?: string;
    adjournedTo?: Date;
    appearingLawyerIds?: string[];
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

        // nextCourtDate on the matter record = adjournedTo (if set) else firstSittingDate
        const matterNextDate = input.adjournedTo || input.firstSittingDate || null;

        const matter = await prisma.matter.create({
            data: {
                workspaceId: input.workspaceId,
                clientId: defaultClient.id,
                lawyerInChargeId: input.userId,
                name: input.name,
                caseNumber: input.caseNumber || null,
                court: input.court || null,
                judge: input.judge || null,
                nextCourtDate: matterNextDate,
                status: 'active',
            },
        });

        await prisma.$transaction(async tx => {
            // Entry 1: the first sitting (with proceedings + appearances)
            if (input.firstSittingDate) {
                const entry = await tx.calendarEntry.create({
                    data: {
                        matterId: matter.id,
                        date: input.firstSittingDate,
                        type: 'COURT',
                        title: 'First Sitting',
                        court: input.court || null,
                        judge: input.judge || null,
                        submittingLawyerId: input.userId,
                        proceedings: input.proceedings || null,
                        adjournedFor: input.adjournedFor || null,
                        adjournedTo: input.adjournedTo || null,
                        appearances: input.appearingLawyerIds?.length
                            ? { connect: input.appearingLawyerIds.map(id => ({ id })) }
                            : undefined,
                    },
                });

                // Entry 2: the adjourned-to date (next scheduled sitting)
                if (input.adjournedTo) {
                    const nextEntry = await tx.calendarEntry.create({
                        data: {
                            matterId: matter.id,
                            date: input.adjournedTo,
                            type: 'COURT',
                            title: input.adjournedFor || 'Next Sitting',
                            court: input.court || null,
                            judge: input.judge || null,
                            submittingLawyerId: input.userId,
                            adjournedFor: input.adjournedFor || null,
                        },
                    });
                    await scheduleCourtReminders(tx, nextEntry.id, input.adjournedTo, matter.id, [input.userId]);
                } else {
                    await scheduleCourtReminders(tx, entry.id, input.firstSittingDate, matter.id, [input.userId]);
                }
            }
        });

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

export async function getMattersForWorkspace(workspaceId: string) {
    await requireAuth();
    return prisma.matter.findMany({
        where: { workspaceId, status: 'active' },
        select: {
            id: true,
            name: true,
            caseNumber: true,
            court: true,
            judge: true,
            calendarEntries: {
                where: { type: 'COURT', proceedings: null },
                select: { id: true, date: true, adjournedFor: true, title: true },
                orderBy: { date: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function recordProceeding(input: {
    matterId: string;
    date: Date;
    proceedings: string;
    outcome?: string;
    adjournedFor?: string;
    adjournedTo?: Date;
    appearingLawyerIds: string[];
    userId: string;
}) {
    try {
        await requireAuth();

        const matter = await prisma.matter.findUnique({
            where: { id: input.matterId },
            select: { workspaceId: true, name: true, court: true, judge: true, lawyerInChargeId: true },
        });
        if (!matter) return { success: false, error: 'Matter not found' };

        await prisma.$transaction(async tx => {
            // Always create a new entry — each sitting is its own record
            await tx.calendarEntry.create({
                data: {
                    matterId: input.matterId,
                    date: input.date,
                    type: 'COURT',
                    title: input.adjournedFor || 'Court Sitting',
                    court: matter.court || null,
                    judge: matter.judge || null,
                    submittingLawyerId: input.userId,
                    proceedings: input.proceedings,
                    outcome: input.outcome || null,
                    adjournedFor: input.adjournedFor || null,
                    adjournedTo: input.adjournedTo || null,
                    appearances: input.appearingLawyerIds.length
                        ? { connect: input.appearingLawyerIds.map(id => ({ id })) }
                        : undefined,
                },
            });

            // If adjourned — update matter's next date and schedule a reminder entry
            if (input.adjournedTo) {
                await tx.matter.update({
                    where: { id: input.matterId },
                    data: { nextCourtDate: input.adjournedTo },
                });

                const nextEntry = await tx.calendarEntry.create({
                    data: {
                        matterId: input.matterId,
                        date: input.adjournedTo,
                        type: 'COURT',
                        title: input.adjournedFor || 'Next Sitting',
                        court: matter.court || null,
                        judge: matter.judge || null,
                        submittingLawyerId: input.userId,
                        adjournedFor: input.adjournedFor || null,
                    },
                });

                const recipientIds = [input.userId, matter.lawyerInChargeId].filter(Boolean) as string[];
                await scheduleCourtReminders(tx, nextEntry.id, input.adjournedTo, input.matterId, recipientIds);
            }
        });

        const dateStr = input.adjournedTo
            ? input.adjournedTo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

        await createNotification({
            workspaceId: matter.workspaceId,
            title: 'Proceeding recorded',
            message: dateStr
                ? `"${matter.name}" — proceeding recorded. Adjourned to ${dateStr}${input.adjournedFor ? ` (${input.adjournedFor})` : ''}.`
                : `"${matter.name}" — proceeding recorded.`,
            type: 'info',
            priority: 'medium',
            recipients: 'ALL',
            relatedMatterId: input.matterId,
        }).catch(() => {});

        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        console.error('recordProceeding failed:', error);
        return { success: false, error: error?.message || 'Failed to record proceeding' };
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
            select: {
                name: true,
                workspaceId: true,
                lawyerInChargeId: true,
                lawyers: { select: { lawyerId: true } },
            },
        });

        await prisma.$transaction(async tx => {
            await tx.matter.update({
                where: { id: matterId },
                data: { nextCourtDate: newDate },
            });

            const entry = await tx.calendarEntry.create({
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

            const recipientIds = [
                userId,
                matter?.lawyerInChargeId,
                ...(matter?.lawyers.map(l => l.lawyerId) ?? []),
            ].filter(Boolean) as string[];

            await scheduleCourtReminders(tx, entry.id, newDate, matterId, recipientIds);
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
    patch: {
        proceedings?: string;
        outcome?: string;
        adjournedFor?: string;
        title?: string;
        appearingLawyerIds?: string[];
    }
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
                ...(patch.appearingLawyerIds !== undefined && {
                    appearances: {
                        set: patch.appearingLawyerIds.map(id => ({ id })),
                    },
                }),
            },
            include: {
                appearances: { select: { id: true, name: true, email: true, image: true } },
            },
        });
        revalidatePath('/calendar');
        revalidatePath('/matters');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to update calendar entry' };
    }
}