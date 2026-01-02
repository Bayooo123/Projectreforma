'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
    caseNumber: string;
    name: string;
    clientId: string;
    assignedLawyerId: string;
    workspaceId: string;
    court?: string;
    judge?: string;
    nextCourtDate?: Date;
    status?: string;
    proceduralStatus?: string;
}) {
    try {
        const matter = await prisma.matter.create({
            data: {
                caseNumber: data.caseNumber,
                name: data.name,
                clientId: data.clientId,
                assignedLawyerId: data.assignedLawyerId,
                workspaceId: data.workspaceId,
                court: data.court,
                judge: data.judge,
                nextCourtDate: data.nextCourtDate,
                status: data.status || 'active',
                proceduralStatus: data.proceduralStatus,
            },
            include: {
                client: true,
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                activityType: 'matter_created',
                description: `Matter "${matter.name}" created`,
                performedBy: data.assignedLawyerId,
            },
        });

        // If nextCourtDate was set during creation, create an initial CourtDate entry
        if (data.nextCourtDate) {
            await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    date: data.nextCourtDate,
                    title: 'Initial Hearing',
                    // By default, the assigned lawyer is the appearance? 
                    // Probably better to leave appearances empty or explicitly set if the UI supported it.
                    // For now, we'll just create the date record.
                }
            });
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
        assignedLawyerId?: string;
        court?: string;
        judge?: string;
        nextCourtDate?: Date | null;
        status?: string;
        proceduralStatus?: string;
    },
    performedBy: string
) {
    try {
        const matter = await prisma.matter.update({
            where: { id },
            data: {
                ...data,
                lastActivityAt: new Date(),
            },
            include: {
                client: true,
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
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
    newDate: Date,
    proceedings: string,
    adjournedFor: string,
    performedBy: string,
    appearanceLawyerIds?: string[] // Optional array of lawyer IDs who appeared
) {
    try {
        // 1. Get the current matter to see the PREVIOUS (or current) court date
        const currentMatter = await prisma.matter.findUnique({
            where: { id: matterId },
            select: { nextCourtDate: true }
        });

        // 2. Identify the date of the proceeding being recorded
        // If the matter had a 'nextCourtDate', that is likely the date that just happened/is happening.
        // If not, we fall back to "today".
        const proceedingDate = currentMatter?.nextCourtDate || new Date();

        // 3. Create a CourtDate record for the COMPLETED/ONGOING sitting
        const courtDateRecord = await prisma.courtDate.create({
            data: {
                matterId,
                date: proceedingDate,
                proceedings: proceedings,
                adjournedFor: adjournedFor,
                nextDate: newDate,
                // Link Appearing Lawyers
                appearances: appearanceLawyerIds && appearanceLawyerIds.length > 0 ? {
                    connect: appearanceLawyerIds.map(id => ({ id }))
                } : undefined
            }
        });

        // 4. Update the Matter's next court date
        const matter = await prisma.matter.update({
            where: { id: matterId },
            data: {
                nextCourtDate: newDate,
                lastActivityAt: new Date(),
            },
        });

        // 5. Create a placeholder CourtDate record for the FUTURE date
        // This ensures it appears on calendars/lists that query CourtDates table specifically
        await prisma.courtDate.create({
            data: {
                matterId,
                date: newDate,
                title: adjournedFor // e.g. "Ruling", "Hearing" will be the title of the next event
            }
        });

        // Log adjournment activity
        await prisma.matterActivityLog.create({
            data: {
                matterId,
                activityType: 'court_date_changed',
                description: `Court date adjourned to ${newDate.toLocaleDateString()}. Reason: ${adjournedFor}`,
                performedBy,
            },
        });

        revalidatePath('/calendar');
        return { success: true, matter };
    } catch (error) {
        console.error('Error adjourning matter:', error);
        return { success: false, error: 'Failed to adjourn matter' };
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
