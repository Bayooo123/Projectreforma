'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification, RecipientType } from '@/lib/notifications';
import { scheduleAdjournmentNotifications } from '@/lib/scheduleAdjournmentNotifications';
import { auth } from '@/auth';

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
    opponentName?: string;
    opponentCounsel?: string;
    lawyerInChargeId?: string;
    clientId?: string | null;
    clientName?: string | null; // New field for auto-creation
    lawyerAssociations: { lawyerId: string; role: string; isAppearing?: boolean }[];
    workspaceId: string;
    court?: string;
    judge?: string;
    nextCourtDate?: Date;
    status?: string;
    proceedings?: string;
    proceedingDate?: Date;
    createdById?: string;
    externalCounselName?: string;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    try {
        let finalClientId = data.clientId;
        let isNewClient = false;

        // 1. DATA UNIFICATION: Find or Create Client
        if (!finalClientId && data.clientName) {
            // Check if client exists (case insensitive)
            const existingClient = await prisma.client.findFirst({
                where: {
                    workspaceId: data.workspaceId,
                    name: { equals: data.clientName, mode: 'insensitive' }
                }
            });

            if (existingClient) {
                finalClientId = existingClient.id;
            } else {
                // Create a placeholder client
                const newClient = await prisma.client.create({
                    data: {
                        name: data.clientName,
                        email: `${data.clientName.toLowerCase().replace(/\s+/g, '.')}@placeholder.reforma.legal`,
                        workspaceId: data.workspaceId,
                        status: 'active'
                    }
                });
                finalClientId = newClient.id;
                isNewClient = true;
            }
        }

        if (!finalClientId) {
            return { success: false, error: 'Client identification is mandatory.' };
        }


        // 2. Create Matter and Brief
        // Determine the default lawyer in charge (first appearing counsel, or current user as fallback)
        const appearingLawyerIds = data.lawyerAssociations
            .filter(l => l.isAppearing)
            .map(l => l.lawyerId);

        // Use explicit lawyer in charge if provided, otherwise fallback to first appearing or creator
        const finalLawyerInChargeId = data.lawyerInChargeId || appearingLawyerIds[0] || session.user.id;

        const matter = await prisma.matter.create({
            data: {
                caseNumber: data.caseNumber || null,
                name: data.name,
                clientId: finalClientId,
                clientNameRaw: null, // Fully deprecated in favor of strict linkage
                workspaceId: data.workspaceId,
                court: data.court,
                judge: data.judge,
                nextCourtDate: data.nextCourtDate,
                opponentName: data.opponentName || null,
                opponentCounsel: data.opponentCounsel || null,
                lawyerInChargeId: finalLawyerInChargeId,
                status: data.status || 'active',
                submittingLawyerId: session.user.id,
                submittingLawyerToken: session.user.lawyerToken,
                submittingLawyerName: session.user.name,
                lawyers: {
                    create: data.lawyerAssociations.map(assoc => ({
                        lawyerId: assoc.lawyerId,
                        role: assoc.role,
                        isAppearing: assoc.isAppearing || false
                    }))
                },
                // Auto-create a linked Brief with deterministic naming
                briefs: {
                    create: {
                        // CRITICAL: Use matter name as brief title (source of truth)
                        name: data.name,
                        briefNumber: `LIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        clientId: finalClientId,
                        workspaceId: data.workspaceId,
                        lawyerId: session.user.id, // Creator
                        lawyerInChargeId: finalLawyerInChargeId, // Responsible lawyer
                        category: 'Litigation',
                        status: 'active',
                        description: `Automatically created for litigation matter: ${data.name}`,
                        // NEW: Mark as litigation-derived
                        isLitigationDerived: true,
                        customTitle: null, // No override initially
                    }
                }
            },
            include: {
                client: true,
                briefs: true,
                lawyers: {
                    include: {
                        lawyer: true
                    }
                },
            },
        });



        // Log activity
        const performedBy = data.createdById || session.user.id;

        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                activityType: 'matter_created',
                description: `Matter "${matter.name}" created. Auto-linked to client and brief.`,
                performedBy: performedBy,
            },
        });

        // Create audit entry for initial lawyer in charge assignment
        if (matter.briefs[0]) {
            await prisma.briefLawyerHistory.create({
                data: {
                    briefId: matter.briefs[0].id,
                    previousLawyerId: null,
                    newLawyerId: finalLawyerInChargeId,
                    changedBy: session.user.id,
                    reason: 'Initial assignment from court appearance',
                },
            });
        }


        // 3. Proceedings / CourtDates (Rest of logic remains same but uses finalClientId)
        if (data.proceedings || data.proceedingDate) {
            const entryDate = data.proceedingDate || new Date();
            const appearingLawyerIds = data.lawyerAssociations
                .filter(l => l.isAppearing)
                .map(l => l.lawyerId);

            await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    briefId: matter.briefs[0].id,
                    clientId: finalClientId,
                    date: entryDate,
                    title: 'Initial Appearance',
                    proceedings: data.proceedings,
                    submittingLawyerId: session.user.id,
                    submittingLawyerToken: session.user.lawyerToken,
                    submittingLawyerName: session.user.name,
                    externalCounsel: data.externalCounselName || null,
                    appearances: appearingLawyerIds.length > 0 ? {
                        connect: appearingLawyerIds.map(id => ({ id }))
                    } : undefined
                }
            });
        }

        if (data.nextCourtDate) {
            const futureCourtDate = await prisma.courtDate.create({
                data: {
                    matterId: matter.id,
                    briefId: matter.briefs[0].id,
                    clientId: finalClientId,
                    date: data.nextCourtDate,
                    title: 'Upcoming Hearing',
                }
            });

            await scheduleAdjournmentNotifications(
                matter.id,
                futureCourtDate.id,
                data.nextCourtDate,
                data.workspaceId
            );
        }

        revalidatePath('/calendar');
        revalidatePath('/management/clients');
        return { success: true, matter, isNewClient };
    } catch (error: any) {
        console.error('Error creating matter:', error);
        return { success: false, error: error?.message || 'Failed to create matter' };
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
    },
    performedBy: string
) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    try {
        // Ownership check: Only the submitting lawyer or owner can edit matter details
        const existingMatter = await prisma.matter.findUnique({
            where: { id },
            include: {
                workspace: true,
                briefs: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!existingMatter) return { success: false, error: 'Matter not found' };

        if (existingMatter.submittingLawyerId && existingMatter.submittingLawyerId !== session.user.id && existingMatter.workspace.ownerId !== session.user.id) {
            return { success: false, error: 'Permission denied: Only the original creator can edit this matter.' };
        }

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
                        briefId: existingMatter.briefs[0].id,
                        clientId: existingMatter.clientId as string,
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
    proceedingDate?: Date,
    pin?: string,
    externalCounselName?: string,
    judge?: string
) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    try {
        const matterCheck = await prisma.matter.findUnique({
            where: { id: matterId },
            include: {
                workspace: true,
                lawyers: true,
                briefs: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!matterCheck) return { success: false, error: 'Matter not found' };

        // Litigation PIN Check
        if (matterCheck.workspace.litigationPin) {
            if (!pin) {
                return { success: false, error: 'Litigation PIN is required to record proceedings.' };
            }
            if (pin !== matterCheck.workspace.litigationPin) {
                return { success: false, error: 'Invalid Litigation PIN.' };
            }
        }

        const briefId = matterCheck.briefs[0]?.id;
        const clientId = matterCheck.clientId;

        if (!briefId || !clientId) {
            return { success: false, error: 'Integrity Error: Matter has no linked Brief or Client' };
        }

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
                briefId,
                clientId,
                date: dateOfEvent,
                proceedings,
                adjournedFor: adjournedFor || null,
                externalCounsel: externalCounselName || null,
                judge: judge || null,
                submittingLawyerId: session.user.id,
                submittingLawyerToken: session.user.lawyerToken,
                submittingLawyerName: session.user.name,
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
                    briefId,
                    clientId,
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
 * Update specifically the court date record fields (proceedings, judge, etc.)
 */
export async function updateCourtDate(
    courtDateId: string,
    data: {
        proceedings?: string;
        judge?: string;
        title?: string;
        adjournedFor?: string;
        externalCounsel?: string;
        appearanceLawyerIds?: string[];
    },
    performedBy: string
) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

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

        // RBAC Check: Only the original submitting lawyer or owner can update
        const { matter } = courtDate;
        if (courtDate.submittingLawyerId && courtDate.submittingLawyerId !== session.user.id && matter.workspace.ownerId !== session.user.id) {
            return { success: false, error: 'Permission denied: Only the lawyer who recorded this proceeding can edit it.' };
        }

        const { appearanceLawyerIds, ...rest } = data;

        // Update the record
        const updatedRecord = await prisma.courtDate.update({
            where: { id: courtDateId },
            data: {
                ...rest,
                appearances: appearanceLawyerIds ? {
                    set: [], // Clear first
                    connect: appearanceLawyerIds.map(id => ({ id }))
                } : undefined
            }
        });

        revalidatePath('/calendar');
        revalidatePath(`/calendar/${matter.id}`);

        return { success: true, courtDate: updatedRecord };

    } catch (error) {
        console.error('Error updating court date:', error);
        return { success: false, error: 'Failed to update court date' };
    }
}
