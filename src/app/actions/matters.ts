'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification, RecipientType } from '@/lib/notifications';
import { scheduleAdjournmentNotifications } from '@/lib/scheduleAdjournmentNotifications';

/**
 * Get all matters for a workspace
 */
export async function getMatters(workspaceId: string) {
    try {
        const matters = await prisma.matter.findMany({
            where: { workspaceId },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: true,
                    },
                },
                lawyers: {
                    include: {
                        lawyer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                activityLogs: {
                    take: 5,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { nextCourtDate: 'asc' },
        });
        return matters;
    } catch (error) {
        console.error('Error fetching matters:', error);
        return [];
    }
}

/**
 * Get a single matter by ID
 */
export async function getMatterById(id: string) {
    try {
        const matter = await prisma.matter.findUnique({
            where: { id },
            include: {
                client: true,
                lawyers: {
                    include: {
                        lawyer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                activityLogs: {
                    orderBy: { timestamp: 'desc' },
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                briefs: {
                    select: {
                        id: true,
                        name: true,
                        briefNumber: true,
                    },
                },
                // Fetch full court date history
                courtDates: {
                    orderBy: { date: 'desc' }, // Newest first for timeline
                    include: {
                        appearances: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            },
        });
        return matter;
    } catch (error) {
        console.error('Error fetching matter:', error);
        return null;
    }
}

/**
 * Create a new matter
 */
export async function createMatter(data: {
    caseNumber?: string | null;
    name: string;
    clientId?: string | null;
    clientNameRaw?: string | null;
    lawyerAssociations: { lawyerId: string; role: string; isAppearing?: boolean }[];
    workspaceId: string;
    court?: string;
    judge?: string;
    nextCourtDate?: Date;
    status?: string;
    proceduralStatus?: string;
    proceedings?: string;
    proceedingDate?: Date;
    createdById?: string;
}) {
    try {
        const matter = await prisma.matter.create({
            data: {
                caseNumber: data.caseNumber || null,
                name: data.name,
                clientId: data.clientId || null,
                clientNameRaw: data.clientNameRaw || null,
                workspaceId: data.workspaceId,
                court: data.court,
                judge: data.judge,
                nextCourtDate: data.nextCourtDate,
                status: data.status || 'active',
                proceduralStatus: data.proceduralStatus,
                lawyers: {
                    create: data.lawyerAssociations.map(assoc => ({
                        lawyerId: assoc.lawyerId,
                        role: assoc.role,
                        isAppearing: assoc.isAppearing || false
                    }))
                }
            },
            include: {
                client: true,
                lawyers: {
                    include: {
                        lawyer: true
                    }
                },
            },
        });

        // Log activity
        const performedBy = data.createdById || data.lawyerAssociations[0]?.lawyerId || 'system';
        // Note: 'system' might fail FK constraints if not in DB, so createdById is preferred.

        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                activityType: 'matter_created',
                description: `Matter "${matter.name}" created`,
                performedBy: performedBy,
            },
        });

        // 1. If proceedings or proceedingDate were providing, record what happened (the sitting)
        if (data.proceedings || data.proceedingDate) {
            const entryDate = data.proceedingDate || new Date();

            const appearingLawyerIds = data.lawyerAssociations
                .filter(l => l.isAppearing)
                .map(l => l.lawyerId);

            await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    date: entryDate,
                    title: 'Initial Appearance',
                    proceedings: data.proceedings,
                    appearances: appearingLawyerIds.length > 0 ? {
                        connect: appearingLawyerIds.map(id => ({ id }))
                    } : undefined
                }
            });
        }

        // 2. If nextCourtDate is provided, create a FUTURE entry for the calendar and schedule reminders
        if (data.nextCourtDate) {
            const futureCourtDate = await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    date: data.nextCourtDate,
                    title: 'Upcoming Hearing', // Default title for future entry
                }
            });

            // Schedule firm-wide notifications
            await scheduleAdjournmentNotifications(
                matter.id,
                futureCourtDate.id,
                data.nextCourtDate,
                data.workspaceId
            );
        }

        revalidatePath('/calendar');
        revalidatePath('/management/clients');
        return { success: true, matter };
    } catch (error: any) {
        console.error('Error creating matter:', error);
        // Return detailed error for debugging (in production, sanitize this)
        const errorMessage = error?.message || 'Failed to create matter';
        // Check for unique constraint violation (P2002)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('caseNumber')) {
            return { success: false, error: 'Case Number already exists. Please use a unique Number.' };
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Update a matter
 */
export async function updateMatter(
    id: string,
    data: {
        name?: string;
        clientId?: string;
        lawyerAssociations?: { lawyerId: string; role: string; isAppearing?: boolean }[];
        court?: string;
        judge?: string;
        nextCourtDate?: Date | null;
        status?: string;
        proceduralStatus?: string;
    },
    performedBy: string
) {
    try {
        const { lawyerAssociations, ...rest } = data;

        const matter = await prisma.matter.update({
            where: { id },
            data: {
                ...rest,
                lastActivityAt: new Date(),
                lawyers: lawyerAssociations ? {
                    deleteMany: {},
                    create: lawyerAssociations.map(assoc => ({
                        lawyerId: assoc.lawyerId,
                        role: assoc.role,
                        isAppearing: assoc.isAppearing || false
                    }))
                } : undefined
            },
            include: {
                client: true,
                lawyers: {
                    include: {
                        lawyer: true
                    }
                }
            },
        });

        // Log activity
        await prisma.matterActivityLog.create({
            data: {
                matterId: id,
                activityType: 'matter_updated',
                description: 'Matter details updated',
                performedBy,
            },
        });

        // AUTOMATIC CALENDAR SYNC: If nextCourtDate was updated, ensure a future CourtDate entry exists.
        if (data.nextCourtDate) {
            // Check if a future entry already exists for this exact date to avoid duplicates
            const existingEntry = await prisma.courtDate.findFirst({
                where: {
                    matterId: id,
                    date: data.nextCourtDate,
                }
            });

            if (!existingEntry) {
                const futureCourtDate = await prisma.courtDate.create({
                    data: {
                        matterId: id,
                        date: data.nextCourtDate,
                        title: 'Upcoming Hearing',
                    }
                });

                // Schedule firm-wide notifications
                await scheduleAdjournmentNotifications(
                    id,
                    futureCourtDate.id,
                    data.nextCourtDate,
                    matter.workspaceId
                );
            }
        }

        revalidatePath('/calendar');
        revalidatePath(`/calendar/${id}`);
        revalidatePath('/management/clients');
        return { success: true, matter };
    } catch (error) {
        console.error('Error updating matter:', error);
        return { success: false, error: 'Failed to update matter' };
    }
}

/**
 * Delete a matter
 */
export async function deleteMatter(id: string) {
    try {
        await prisma.matter.delete({
            where: { id },
        });

        revalidatePath('/calendar');
        revalidatePath('/management/clients');
        return { success: true };
    } catch (error) {
        console.error('Error deleting matter:', error);
        return { success: false, error: 'Failed to delete matter' };
    }
}

/**
 * Adjourn a matter to a new date
 */
/**
 * Adjourn a matter to a new date (and record the previous sitting)
 */
export async function adjournMatter(
    matterId: string,
    newDate: Date | undefined | null,
    proceedings: string,
    adjournedFor: string | undefined | null,
    performedBy: string,
    appearanceLawyerIds?: string[],
    proceedingDate?: Date
) {
    try {
        const matterCheck = await prisma.matter.findUnique({
            where: { id: matterId },
            include: { workspace: true, lawyers: true }
        });

        if (!matterCheck) return { success: false, error: 'Matter not found' };

        // RBAC: Associate Lawyer or Workspace Owner
        const isAssociated = matterCheck.lawyers.some(l => l.lawyerId === performedBy);
        if (!isAssociated && matterCheck.workspace.ownerId !== performedBy) {
            return { success: false, error: 'Permission denied' };
        }

        // 1. Identify date of the proceeding
        const dateOfEvent = proceedingDate || matterCheck.nextCourtDate || new Date();

        // 2. Record the proceeding history
        await prisma.courtDate.create({
            data: {
                matterId,
                date: dateOfEvent,
                proceedings,
                adjournedFor: adjournedFor || null,
                nextDate: newDate || null,
                appearances: appearanceLawyerIds && appearanceLawyerIds.length > 0 ? {
                    connect: appearanceLawyerIds.map(id => ({ id }))
                } : undefined
            }
        });

        // 3. Handle future adjournment if a new date is provided
        if (newDate) {
            await prisma.matter.update({
                where: { id: matterId },
                data: {
                    nextCourtDate: newDate,
                    lastActivityAt: new Date(),
                },
            });

            // If no specific reason given, generic title
            const nextTitle = adjournedFor || 'Continued Hearing';

            const futureCourtDate = await prisma.courtDate.create({
                data: {
                    matterId,
                    date: newDate,
                    title: nextTitle
                }
            });

            // Schedule notifications
            const notificationResult = await scheduleAdjournmentNotifications(
                matterId,
                futureCourtDate.id,
                newDate,
                matterCheck.workspaceId
            );

            if (!notificationResult.success) {
                console.error('Failed to schedule adjournment notifications:', notificationResult.error);
            }

            // Log activity
            await prisma.matterActivityLog.create({
                data: {
                    matterId,
                    activityType: 'court_date_changed',
                    description: `Adjourned to ${newDate.toLocaleDateString()}.`,
                    performedBy,
                },
            });

            // Notify team
            for (const assoc of matterCheck.lawyers) {
                if (assoc.lawyerId !== performedBy) {
                    await createNotification({
                        title: 'Case Adjourned',
                        message: `Matter ${matterCheck.caseNumber} adjourned to ${newDate.toLocaleDateString()}.`,
                        recipientId: assoc.lawyerId,
                        recipientType: 'lawyer',
                        type: 'info',
                        priority: 'high',
                        relatedMatterId: matterId
                    });
                }
            }
        } else {
            // No new date: Just update last activity and log proceeding
            await prisma.matter.update({
                where: { id: matterId },
                data: { lastActivityAt: new Date() }
            });

            await prisma.matterActivityLog.create({
                data: {
                    matterId,
                    activityType: 'proceedings_recorded',
                    description: `Proceedings recorded: ${proceedings.substring(0, 50)}${proceedings.length > 50 ? '...' : ''}`,
                    performedBy,
                },
            });
        }

        revalidatePath('/calendar');
        revalidatePath(`/calendar/${matterId}`);
        return { success: true };
    } catch (error) {
        console.error('Error in adjournMatter:', error);
        return { success: false, error: 'Failed to record adjournment' };
    }
}

/**
 * Add a note to a matter
 */
export async function addMatterNote(
    matterId: string,
    note: string,
    performedBy: string
) {
    try {
        const activityLog = await prisma.matterActivityLog.create({
            data: {
                matterId,
                activityType: 'note_added',
                description: note,
                performedBy,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        await prisma.matter.update({
            where: { id: matterId },
            data: { lastActivityAt: new Date() },
        });

        revalidatePath('/calendar');
        return { success: true, activityLog };
    } catch (error) {
        console.error('Error adding note:', error);
        return { success: false, error: 'Failed to add note' };
    }
}

/**
 * Update matter status
 */
export async function updateMatterStatus(
    matterId: string,
    status: string,
    performedBy: string
) {
    try {
        const matter = await prisma.matter.update({
            where: { id: matterId },
            data: {
                status,
                lastActivityAt: new Date(),
            },
        });

        // Log status change
        await prisma.matterActivityLog.create({
            data: {
                matterId,
                activityType: 'status_changed',
                description: `Status changed to ${status}`,
                performedBy,
            },
        });

        revalidatePath('/calendar');
        revalidatePath('/management/clients');
        return { success: true, matter };
    } catch (error) {
        console.error('Error updating status:', error);
        return { success: false, error: 'Failed to update status' };
    }
}

/**
 * Update specifically the "What Happened in Court" (proceedings) for a given Court Date
 * Note: This allows updating the narrative without adjourning.
 */
export async function updateCourtProceedings(
    courtDateId: string,
    proceedings: string,
    performedBy: string
) {
    try {
        const courtDate = await prisma.courtDate.findUnique({
            where: { id: courtDateId },
            include: {
                matter: {
                    include: { workspace: true, lawyers: true }
                }
            }
        });

        if (!courtDate) return { success: false, error: 'Court date record not found' };

        // RBAC Check
        const { matter } = courtDate;
        const isAssociated = matter.lawyers.some(l => l.lawyerId === performedBy);
        if (!isAssociated && matter.workspace.ownerId !== performedBy) {
            return { success: false, error: 'Permission denied: Only associated lawyers or the owner can update proceedings.' };
        }

        // Update the record
        const updatedRecord = await prisma.courtDate.update({
            where: { id: courtDateId },
            data: { proceedings }
        });

        revalidatePath('/calendar');
        revalidatePath(`/calendar/${matter.id}`);

        return { success: true, courtDate: updatedRecord };

    } catch (error) {
        console.error('Error updating proceedings:', error);
        return { success: false, error: 'Failed to update proceedings' };
    }
}
