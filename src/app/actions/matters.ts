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
        const performedBy = data.lawyerAssociations[0]?.lawyerId || 'system';
        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                activityType: 'matter_created',
                description: `Matter "${matter.name}" created`,
                performedBy: performedBy,
            },
        });

        // If nextCourtDate was set during creation, create an initial CourtDate entry
        if (data.nextCourtDate) {
            await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    date: data.nextCourtDate,
                    title: 'Initial Hearing',
                    proceedings: data.proceedings, // Save court summary here
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
    newDate: Date | undefined | null, // Made optional/nullable
    proceedings: string,
    adjournedFor: string,
    performedBy: string,
    appearanceLawyerIds?: string[], // Optional array of lawyer IDs who appeared
    proceedingDate?: Date // Optional explicit date of the proceeding being recorded
) {
    try {
        // ... (RBAC Check omitted for brevity in diff, but preserved in file)

        constXY matterCheck = await prisma.matter.findUnique({
        where: { id: matterId },
        include: { workspace: true, lawyers: true }
    });

        // Manual RBAC re-check since we are inside the function scope here in the replacement
        // Note: The original code had the check at the top, we need to respect that context if we are replacing the whole block.
        // Assuming the "RBAC Check omitted" was my mental note, but I must implement it fully.

        if (!matterCheck) return { success: false, error: 'Matter not found' };

        // Allow Associated Lawyer OR Workspace Owner
        const isAssociated = matterCheck.lawyers.some(l => l.lawyerId === performedBy);
        if (!isAssociated && matterCheck.workspace.ownerId !== performedBy) {
            return { success: false, error: 'Permission denied: Only associated lawyers or the owner can adjourn a matter.' };
        }

        // 1. Get the current matter to see the PREVIOUS (or current) court date
        const currentMatter = await prisma.matter.findUnique({
            where: { id: matterId },
            select: { nextCourtDate: true }
        });

        // 2. Identify the date of the proceeding being recorded
        // Priority: Explicit -> Scheduled (inference) -> Today (fallback)
        const dateOfEvent = proceedingDate || currentMatter?.nextCourtDate || new Date();

        // 3. Create a CourtDate record for the COMPLETED/ONGOING sitting
        const courtDateRecord = await prisma.courtDate.create({
            data: {
                matterId,
                date: dateOfEvent,
                proceedings: proceedings,
                adjournedFor: adjournedFor,
                nextDate: newDate ? newDate : null, // Store next date if exists
                // Link Appearing Lawyers
                appearances: appearanceLawyerIds && appearanceLawyerIds.length > 0 ? {
                    connect: appearanceLawyerIds.map(id => ({ id }))
                } : undefined
            }
        });

        // 4. Update the Matter's next court date ONLY if a new date is provided
        if (newDate) {
            await prisma.matter.update({
                where: { id: matterId },
                data: {
                    nextCourtDate: newDate,
                    lastActivityAt: new Date(),
                },
            });

            // 5. Create a placeholder CourtDate record for the FUTURE date
            const futureCourtDate = await prisma.courtDate.create({
                data: {
                    matterId,
                    date: newDate,
                    title: adjournedFor // e.g. "Ruling", "Hearing" will be the title of the next event
                }
            });

            // 6. Schedule automated adjournment notifications (firm-wide)
            const notificationResult = await scheduleAdjournmentNotifications(
                matterId,
                futureCourtDate.id,
                newDate,
                matterCheck.workspaceId
            );

            if (!notificationResult.success) {
                console.error('Failed to schedule adjournment notifications:', notificationResult.error);
            } else {
                console.log(`Scheduled ${notificationResult.scheduledCount} adjournment notifications`);
            }

            // Log adjournment activity (with date)
            await prisma.matterActivityLog.create({
                data: {
                    matterId,
                    activityType: 'court_date_changed',
                    description: `Court date adjourned to ${newDate.toLocaleDateString()}. Reason: ${adjournedFor}`,
                    performedBy,
                },
            });

        } else {
            // Log simple proceeding recording (no date change)
            await prisma.matterActivityLog.create({
                data: {
                    matterId,
                    activityType: 'proceedings_recorded',
                    description: `Proceedings recorded: "${proceedings.substring(0, 50)}${proceedings.length > 50 ? '...' : ''}"`,
                    performedBy,
                },
            });

            // We should still update lastActivityAt
            await prisma.matter.update({
                where: { id: matterId },
                data: { lastActivityAt: new Date() }
            });
        }

        // NOTIFICATION LOGIC (Firm-wide / Associated Lawyers)
        // Only trigger "Adjourned" notifications if there is a new date.
        // If just recording proceedings, maybe we don't notify everyone? Or maybe we notify "Proceedings Updated"?
        // Request didn't specify, but "Adjournment date... if provided should trigger notification". Implying if NOT provided, don't trigger.

        if (newDate) {
            const matterDetails = await prisma.matter.findUnique({
                where: { id: matterId },
                include: { lawyers: { include: { lawyer: true } } }
            });

            if (matterDetails) {
                // 1. Notify associated lawyers
                for (const assoc of matterDetails.lawyers) {
                    if (assoc.lawyerId !== performedBy) {
                        await createNotification({
                            title: 'Case Adjourned',
                            message: `Matter ${matterDetails.caseNumber} adjourned to ${newDate.toLocaleDateString()}. Please update proceedings.`,
                            recipientId: assoc.lawyerId,
                            recipientType: 'lawyer',
                            type: 'info',
                            priority: 'high',
                            relatedMatterId: matterId
                        });
                    }
                }

                // 2. Appearing lawyers
                if (appearanceLawyerIds && appearanceLawyerIds.length > 0) {
                    for (const lawyerId of appearanceLawyerIds) {
                        const isMemberOfMatter = matterDetails?.lawyers.some(l => l.lawyerId === lawyerId);
                        if (lawyerId !== performedBy && !isMemberOfMatter) {
                            await createNotification({
                                title: 'Court Appearance Recorded',
                                message: `You were marked as appearing in ${matterDetails?.caseNumber || 'a matter'}. Adjourned to ${newDate.toLocaleDateString()}.`,
                                recipientId: lawyerId,
                                recipientType: 'lawyer',
                                type: 'info',
                                relatedMatterId: matterId
                            });
                        }
                    }
                }
            }
        }

        revalidatePath('/calendar');
        revalidatePath(`/calendar/${matterId}`); // Also revalidate detail page
        return { success: true, matter: newDate ? undefined : matterCheck }; // Return type might vary but usually we assume void or success
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
