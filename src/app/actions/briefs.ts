'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';
import { applySentenceCaseToFields, applyTitleCaseToFields } from '@/lib/sentence-case';

export async function getUserBriefs() {
    const user = await requireAuth();
    if (!user.email) return [];

    try {
        const membership = await prisma.workspaceMember.findFirst({
            where: { user: { email: user.email } },
            select: { workspaceId: true }
        });

        if (!membership) return [];

        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId: membership.workspaceId,
                deletedAt: null
            },
            include: {
                client: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 20
        });
        return briefs;
    } catch (err) {
        console.error("Failed to fetch user briefs", err);
        return [];
    }
}

export async function getBriefs(workspaceId: string) {
    await requireAuth();
    try {
        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId,
                deletedAt: null
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyerInCharge: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                matter: {
                    select: {
                        id: true,
                        name: true,
                        caseNumber: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return briefs;
    } catch (error) {
        console.error('[getBriefs] Error fetching briefs:', error);
        return [];
    }
}

export async function getBriefById(id: string) {
    await requireAuth();
    noStore(); // Force dynamic fetching
    try {
        const brief = await prisma.brief.findUnique({
            where: {
                id,
                deletedAt: null
            },
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyerInCharge: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                matter: true,
                documents: true,
                folders: {
                    include: {
                        _count: {
                            select: { documents: true }
                        }
                    }
                },
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return brief;
    } catch (error) {
        console.error('Error fetching brief:', error);
        return null;
    }
}

export async function createBrief(data: {
    briefNumber: string;
    name: string;
    clientId: string;
    lawyerId?: string;
    lawyerInChargeId?: string;
    workspaceId: string;
    category: string;
    status: string;
    dueDate?: Date;
    description?: string;
    parentBriefId?: string;
}) {
    const session = await requireAuth();
    data = applyTitleCaseToFields(data, ['name']);
    data = applySentenceCaseToFields(data, ['description']);
    const creatorId = data.lawyerId || session.id;
    try {
        console.log('[createBrief] ========== START ==========');
        console.log('[createBrief] Creating brief with data:', JSON.stringify(data, null, 2));

        // Validate briefNumber is provided
        if (!data.briefNumber || data.briefNumber.trim() === '') {
            console.error('[createBrief] ERROR: Brief number is empty!');
            return { success: false, error: 'Brief number is required' };
        }

        // Use explicit transaction to ensure atomic operation
        const result = await prisma.$transaction(async (tx) => {
            console.log('[createBrief] Starting database transaction...');

            // Check if briefNumber already exists
            const existing = await tx.brief.findUnique({
                where: { briefNumber: data.briefNumber }
            });

            if (existing) {
                console.error('[createBrief] ERROR: Brief number already exists:', data.briefNumber);
                throw new Error(`Brief number "${data.briefNumber}" already exists. Please use a different number.`);
            }

            console.log('[createBrief] Brief number is unique, proceeding with creation...');

            const brief = await tx.brief.create({
                data: {
                    briefNumber: data.briefNumber,
                    name: data.name,
                    clientId: data.clientId,
                    lawyerId: creatorId,
                    lawyerInChargeId: data.lawyerInChargeId || null,
                    workspaceId: data.workspaceId,
                    category: data.category,
                    status: data.status,
                    dueDate: data.dueDate,
                    description: data.description,
                    // Standalone briefs are not litigation-derived
                    isLitigationDerived: false,
                    customTitle: null,
                    parentBriefId: data.parentBriefId || null,
                },
                include: {
                    client: true,
                    lawyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            console.log('[createBrief] ✅ Brief created in transaction!');
            console.log('[createBrief] Brief ID:', brief.id);
            console.log('[createBrief] Brief Number:', brief.briefNumber);
            console.log('[createBrief] Brief Name:', brief.name);

            return brief;
        }, {
            maxWait: 5000, // Maximum time to wait for a transaction slot (ms)
            timeout: 10000, // Maximum time the transaction can run (ms)
        });

        console.log('[createBrief] ✅ Transaction committed successfully!');

        // Verify the brief was actually saved (outside transaction)
        const verification = await prisma.brief.findUnique({
            where: { id: result.id }
        });

        if (verification) {
            console.log('[createBrief] ✅ VERIFICATION: Brief exists in database');
        } else {
            console.error('[createBrief] ❌ VERIFICATION FAILED: Brief not found in database!');
            throw new Error('Brief was not persisted to database');
        }

        console.log('[createBrief] Calling revalidatePath("/briefs")');
        revalidatePath('/briefs');

        // Notification: New Brief Created
        try {
            const { createNotification } = await import('@/app/actions/notifications');
            await createNotification({
                workspaceId: data.workspaceId,
                title: 'New Brief Created',
                message: `Brief "${data.name}" (${data.briefNumber}) has been created.`,
                type: 'info',
                priority: 'medium',
                recipients: 'ALL',
                relatedBriefId: result.id
            });
        } catch (error) {
            console.error('Notification error:', error);
        }

        console.log('[createBrief] ========== END ==========');
        return { success: true, brief: result };
    } catch (error: any) {
        console.error('[createBrief] ========== ERROR ==========');
        console.error('[createBrief] Error type:', error.constructor.name);
        console.error('[createBrief] Error message:', error.message);
        console.error('[createBrief] Error code:', error.code);
        console.error('[createBrief] Full error:', error);
        console.error('[createBrief] ========== ERROR END ==========');

        // Handle Prisma unique constraint error
        if (error.code === 'P2002') {
            return { success: false, error: 'Brief number already exists. Please use a different number.' };
        }

        return { success: false, error: 'Failed to create brief: ' + error.message };
    }
}

export async function updateBrief(
    id: string,
    data: {
        name?: string;
        customTitle?: string | null;
        customBriefNumber?: string | null;
        clientId?: string;
        lawyerId?: string;
        lawyerInChargeId?: string;
        category?: string;
        status?: string;
        dueDate?: Date | null;
        description?: string;
    }
) {
    const session = await requireAuth();
    data = applyTitleCaseToFields(data, ['name', 'customTitle']);
    data = applySentenceCaseToFields(data, ['description']);
    try {
        // Get existing brief and user's workspace role
        const existingBrief = await prisma.brief.findUnique({
            where: { id },
            select: {
                workspaceId: true,
                briefNumber: true,
                lawyerInChargeId: true,
            }
        });

        if (!existingBrief) {
            return { success: false, error: 'Brief not found' };
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.id,
                workspaceId: existingBrief.workspaceId
            }
        });

        if (!membership) {
            return { success: false, error: 'Not a member of this workspace' };
        }

        // RBAC Check for Lawyer in Charge
        const { canEditLawyerInCharge, BriefPermissions } = await import('@/lib/rbac');

        // Reforma platform admins (isPlatformAdmin = true) bypass all workspace-level role restrictions
        const dbUser = await prisma.user.findUnique({
            where: { email: session.email! },
            select: { isPlatformAdmin: true },
        });
        const isReformaSuperAdmin = dbUser?.isPlatformAdmin === true;

        if (data.lawyerInChargeId && !isReformaSuperAdmin && !session.isWorkspaceOwner && !canEditLawyerInCharge(membership.role)) {
            return {
                success: false,
                error: 'Only Principal Partners, Partners, and Head of Chambers can change Lawyer in Charge'
            };
        }

        // RBAC Check for Brief Number
        if (data.customBriefNumber && !isReformaSuperAdmin && !session.isWorkspaceOwner && !BriefPermissions.canEditBriefNumber(membership.role)) {
            return {
                success: false,
                error: 'Only senior roles can edit brief numbers'
            };
        }

        // Validate custom brief number uniqueness
        if (data.customBriefNumber) {
            const existing = await prisma.brief.findFirst({
                where: {
                    workspaceId: existingBrief.workspaceId,
                    OR: [
                        { briefNumber: data.customBriefNumber },
                        { customBriefNumber: data.customBriefNumber }
                    ],
                    id: { not: id }
                }
            });

            if (existing) {
                return {
                    success: false,
                    error: 'Brief number already exists in this workspace'
                };
            }
        }

        // Audit logging for lawyer in charge change
        if (data.lawyerInChargeId && data.lawyerInChargeId !== existingBrief.lawyerInChargeId) {
            await prisma.briefLawyerHistory.create({
                data: {
                    briefId: id,
                    previousLawyerId: existingBrief.lawyerInChargeId,
                    newLawyerId: data.lawyerInChargeId,
                    changedBy: session.id,
                    reason: 'Manual reassignment',
                },
            });
        }

        // Audit logging for brief number change
        if (data.customBriefNumber && data.customBriefNumber !== existingBrief.briefNumber) {
            await prisma.briefActivityLog.create({
                data: {
                    briefId: id,
                    activityType: 'brief_number_changed',
                    description: `Brief number changed from ${existingBrief.briefNumber} to ${data.customBriefNumber}`,
                    performedBy: session.id,
                },
            });
        }

        const brief = await prisma.brief.update({
            where: { id },
            data,
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyerInCharge: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        revalidatePath('/briefs');
        revalidatePath(`/briefs/${id}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error updating brief:', error);
        return { success: false, error: 'Failed to update brief' };
    }
}

export async function deleteBrief(id: string) {
    try {
        // 1. Fetch brief to identify workspace
        const brief = await prisma.brief.findUnique({
            where: { id },
            select: { workspaceId: true, status: true }
        });

        if (!brief) {
            return { success: false, error: 'Brief not found' };
        }

        // 2. Security Check: Require DELETE_BRIEF permission (or be Workspace Owner)
        const { requirePermission } = await import('@/lib/auth-utils');
        await requirePermission(brief.workspaceId, 'DELETE_BRIEF');

        // 3. Soft Delete Logic
        await prisma.brief.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'archived' // meaningful status update
            }
        });

        revalidatePath('/briefs');
        return { success: true, message: 'Brief moved to trash' };
    } catch (error: any) {
        console.error('Error deleting brief:', error);
        return { success: false, error: error.message || 'Failed to delete brief' };
    }
}

export async function assignLawyer(briefId: string, lawyerId: string) {
    await requireAuth();
    try {
        const brief = await prisma.brief.update({
            where: { id: briefId },
            data: { lawyerId },
            include: {
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                matter: true, // Include matter to check for linkage
            },
        });

        // Create Notification
        let message = `You have been assigned brief "${brief.name}" (${brief.briefNumber}).`;
        if (brief.matter) {
            message += ` This corresponds to matter "${brief.matter.name}" (${brief.matter.caseNumber}). Check the litigation tracker for the report on the case.`;
        } else {
            message += ` Please review the brief details.`;
        }

        await prisma.notification.create({
            data: {
                type: 'info',
                title: 'New Brief Assignment',
                message: message,
                recipientId: lawyerId,
                recipientType: 'lawyer',
                relatedBriefId: brief.id,
                relatedMatterId: brief.matterId,
                priority: 'medium',
                channels: JSON.stringify(['in-app']),
            },
        });

        revalidatePath('/briefs');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error assigning lawyer:', error);
        return { success: false, error: 'Failed to assign lawyer' };
    }
}

export async function summarizeBrief(briefId: string) {
    await requireAuth();
    try {
        const { BriefSummarizer } = await import('@/lib/services/summarizer');
        const summary = await BriefSummarizer.summarize(briefId);
        
        revalidatePath(`/briefs/${briefId}`);
        return { success: true, summary };
    } catch (error: any) {
        console.error('[summarizeBrief] Action Error:', error);
        return { success: false, error: error.message || 'Summarization failed' };
    }
}
export async function reassignBriefHierarchy(briefId: string, parentBriefId: string | null) {
    const session = await requireAuth();
    
    try {
        const brief = await prisma.brief.findUnique({
            where: { id: briefId },
            select: { workspaceId: true, parentBriefId: true }
        });

        if (!brief) return { success: false, error: 'Brief not found' };

        // RBAC Check: Ensure session user has permissions in this workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: session.id, workspaceId: brief.workspaceId }
        });

        if (!membership) return { success: false, error: 'Not a member of this workspace' };

        const { BriefPermissions } = await import('@/lib/rbac');
        
        // Reforma platform admins bypass workspace role restrictions
        const dbUser = await prisma.user.findUnique({
            where: { email: session.email! },
            select: { isPlatformAdmin: true },
        });
        const isReformaSuperAdmin = dbUser?.isPlatformAdmin === true;

        if (!isReformaSuperAdmin && !session.isWorkspaceOwner && !BriefPermissions.canReassignHierarchy(membership.role)) {
            return { 
                success: false, 
                error: 'Permission denied: Only Principal Partners, Partners, and Head of Chambers can reassign brief hierarchy' 
            };
        }

        // Circularity and self-assignment checks
        if (parentBriefId) {
            if (parentBriefId === briefId) {
                return { success: false, error: 'A brief cannot be its own parent' };
            }

            const parent = await prisma.brief.findUnique({
                where: { id: parentBriefId },
                select: { workspaceId: true }
            });

            if (!parent || parent.workspaceId !== brief.workspaceId) {
                return { success: false, error: 'Parent brief not found in this workspace' };
            }

            // Simple circularity check: is the intended parent currently a child of this brief?
            const isChild = await prisma.brief.findFirst({
                where: { id: parentBriefId, parentBriefId: briefId }
            });
            if (isChild) {
                return { success: false, error: 'Circular hierarchy detected: cannot move a parent under its own child' };
            }
        }

        await prisma.brief.update({
            where: { id: briefId },
            data: { parentBriefId }
        });

        // Log hierarchy activity
        await prisma.briefActivityLog.create({
            data: {
                briefId,
                activityType: 'hierarchy_updated',
                description: parentBriefId 
                    ? `Brief reassigned to parent brief.` 
                    : `Brief moved to top-level organization.`,
                performedBy: session.id
            }
        });

        revalidatePath('/briefs');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true };
    } catch (error) {
        console.error('[reassignBriefHierarchy] Error:', error);
        return { success: false, error: 'Internal server error during hierarchy reassignment' };
    }
}
