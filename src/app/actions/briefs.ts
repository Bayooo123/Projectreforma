'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';
import { applySentenceCaseToFields, applyTitleCaseToFields } from '@/lib/sentence-case';
import { logActivity } from '@/lib/log-activity';

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
            take: 50,
        });

        return briefs;
    } catch (error) {
        console.error('[getBriefs] Error fetching briefs:', error);
        return [];
    }
}

export async function getBriefById(id: string) {
    await requireAuth();
    try {
        const brief = await prisma.brief.findUnique({
            where: {
                id,
                deletedAt: null
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        company: true,
                        status: true,
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
                        status: true,
                        court: true,
                        judge: true,
                    },
                },
                // Explicitly exclude ocrText — it can be megabytes per document
                // and is never displayed in the brief header view
                documents: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        type: true,
                        size: true,
                        uploadedAt: true,
                        ocrStatus: true,
                        folderId: true,
                    },
                    orderBy: { uploadedAt: 'desc' },
                    take: 200,
                },
                folders: {
                    include: {
                        _count: {
                            select: { documents: true }
                        }
                    },
                    take: 100,
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

        logActivity({ workspaceId: data.workspaceId, userId: session.id!, resource: 'BRIEF', action: 'CREATED', resourceId: result.id, resourceName: result.name }).catch(() => {});

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

        // Sanitize empty-string FKs — Prisma throws on FK violation with empty string
        if (data.clientId === '') data.clientId = undefined;
        if (data.lawyerInChargeId === '') data.lawyerInChargeId = undefined;
        if (data.lawyerId === '') data.lawyerId = undefined;

        const [membership, workspace] = await Promise.all([
            prisma.workspaceMember.findFirst({
                where: { userId: session.id, workspaceId: existingBrief.workspaceId }
            }),
            prisma.workspace.findUnique({
                where: { id: existingBrief.workspaceId },
                select: { ownerId: true }
            })
        ]);

        const isWorkspaceOwner = workspace?.ownerId === session.id;

        if (!membership && !isWorkspaceOwner) {
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

        if (data.lawyerInChargeId && !isReformaSuperAdmin && !isWorkspaceOwner && !canEditLawyerInCharge(membership?.role ?? '')) {
            return {
                success: false,
                error: 'Only Principal Partners, Partners, and Head of Chambers can change Lawyer in Charge'
            };
        }

        // RBAC Check for Brief Number
        if (data.customBriefNumber && !isReformaSuperAdmin && !isWorkspaceOwner && !BriefPermissions.canEditBriefNumber(membership?.role ?? '')) {
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
        logActivity({ workspaceId: existingBrief?.workspaceId || brief.workspaceId, userId: session.id!, resource: 'BRIEF', action: 'UPDATED', resourceId: brief.id, resourceName: brief.name }).catch(() => {});

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
            select: { workspaceId: true, status: true, name: true }
        });

        if (!brief) {
            return { success: false, error: 'Brief not found' };
        }

        // 2. Security Check: Require DELETE_BRIEF permission (or be Workspace Owner)
        const { requirePermission } = await import('@/lib/auth-utils');
        await requirePermission(brief.workspaceId, 'DELETE_BRIEF');

        // 3. Soft Delete Logic
        const { requireAuth } = await import('@/lib/auth-utils');
        const session = await requireAuth();

        await prisma.brief.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'archived',
            }
        });

        logActivity({ workspaceId: brief.workspaceId, userId: session.id!, resource: 'BRIEF', action: 'DELETED', resourceId: id, resourceName: brief.name }).catch(() => {});

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

export async function logBriefViewed(briefId: string) {
    try {
        const session = await requireAuth();
        if (!session?.id) return;
        const brief = await prisma.brief.findUnique({ where: { id: briefId }, select: { workspaceId: true, name: true } });
        if (!brief) return;
        await logActivity({ workspaceId: brief.workspaceId, userId: session.id, resource: 'BRIEF', action: 'VIEWED', resourceId: briefId, resourceName: brief.name });
    } catch {}
}

// ── Timeline extraction backfill ─────────────────────────────────────────────

export async function backfillBriefTimeline(briefId: string): Promise<{ processed: number; found: number }> {
    await requireAuth();

    const docs = await prisma.document.findMany({
        where: { briefId },
        select: { id: true, name: true, url: true, type: true, ocrText: true },
    });

    if (docs.length === 0) return { processed: 0, found: 0 };

    const { extractDocumentTimeline } = await import('@/lib/services/doc-timeline-extractor');

    let totalFound = 0;
    for (const doc of docs) {
        const count = await extractDocumentTimeline(doc.id, doc.name, briefId, doc.ocrText ?? null, doc.url, doc.type);
        totalFound += count;
    }

    return { processed: docs.length, found: totalFound };
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEventType =
    | 'brief_created' | 'brief_due'
    | 'court_hearing' | 'court_adjourned' | 'meeting'
    | 'task_created' | 'task_completed' | 'task_due'
    | 'document_uploaded' | 'activity' | 'doc_event';

export interface TimelineEvent {
    id: string;
    date: Date;
    type: TimelineEventType;
    title: string;
    description?: string;
    actor?: string;
    source?: string;
    isFuture: boolean;
    isToday: boolean;
}

export async function getBriefTimeline(briefId: string): Promise<TimelineEvent[]> {
    await requireAuth();

    const brief = await prisma.brief.findUnique({
        where: { id: briefId, deletedAt: null },
        select: { createdAt: true, dueDate: true, name: true, matterId: true },
    });
    if (!brief) return [];

    const matterId = brief.matterId;

    const [calendarEntries, tasks, documents, activityLogs, docTimelineEvents] = await Promise.all([
        prisma.calendarEntry.findMany({
            where: { OR: [{ briefId }, ...(matterId ? [{ matterId }] : [])] },
            select: {
                id: true, title: true, date: true, adjournedTo: true,
                type: true, proceedings: true, court: true, judge: true,
                submittingLawyerName: true,
            },
            orderBy: { date: 'asc' },
        }),
        prisma.task.findMany({
            where: { briefId },
            select: {
                id: true, title: true, createdAt: true, completedAt: true,
                dueDate: true, status: true,
                assignedTo: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.document.findMany({
            where: { briefId },
            select: { id: true, name: true, uploadedAt: true },
            orderBy: { uploadedAt: 'asc' },
        }),
        prisma.briefActivityLog.findMany({
            where: { briefId, activityType: { not: 'viewed' } },
            select: { id: true, timestamp: true, activityType: true, description: true, performedBy: true },
            orderBy: { timestamp: 'asc' },
        }),
        prisma.documentTimelineEvent.findMany({
            where: { briefId },
            select: {
                id: true, eventDate: true, eventDateRaw: true, description: true, documentName: true,
                document: { select: { uploadedAt: true } },
            },
            orderBy: { createdAt: 'asc' },
        }),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const classify = (date: Date) => ({
        isFuture: date >= todayEnd,
        isToday: date >= todayStart && date < todayEnd,
    });

    const events: TimelineEvent[] = [];

    events.push({ id: 'brief_created', date: brief.createdAt, type: 'brief_created', title: 'Brief opened', description: brief.name, ...classify(brief.createdAt) });

    if (brief.dueDate) {
        events.push({ id: 'brief_due', date: brief.dueDate, type: 'brief_due', title: 'Brief due date', ...classify(brief.dueDate) });
    }

    for (const e of calendarEntries) {
        const desc = [e.court, e.judge ? `Judge: ${e.judge}` : null, e.proceedings].filter(Boolean).join(' · ');
        events.push({
            id: `cal_${e.id}`,
            date: e.date,
            type: e.type === 'MEETING' ? 'meeting' : 'court_hearing',
            title: e.title || (e.type === 'MEETING' ? 'Meeting' : 'Court Hearing'),
            description: desc || undefined,
            actor: e.submittingLawyerName ?? undefined,
            ...classify(e.date),
        });
        if (e.adjournedTo) {
            events.push({ id: `cal_adj_${e.id}`, date: e.adjournedTo, type: 'court_adjourned', title: `Adjournment: ${e.title || 'Court date'}`, ...classify(e.adjournedTo) });
        }
    }

    for (const t of tasks) {
        events.push({
            id: `task_c_${t.id}`, date: t.createdAt, type: 'task_created', title: t.title,
            description: t.assignedTo?.name ? `Assigned to ${t.assignedTo.name}` : undefined,
            ...classify(t.createdAt),
        });
        if (t.completedAt) {
            events.push({ id: `task_done_${t.id}`, date: t.completedAt, type: 'task_completed', title: `Completed: ${t.title}`, ...classify(t.completedAt) });
        } else if (t.dueDate) {
            events.push({ id: `task_due_${t.id}`, date: t.dueDate, type: 'task_due', title: `Deadline: ${t.title}`, ...classify(t.dueDate) });
        }
    }

    for (const d of documents) {
        events.push({ id: `doc_${d.id}`, date: d.uploadedAt, type: 'document_uploaded', title: d.name, ...classify(d.uploadedAt) });
    }

    for (const a of activityLogs) {
        events.push({ id: `act_${a.id}`, date: a.timestamp, type: 'activity', title: a.description, actor: a.performedBy ?? undefined, ...classify(a.timestamp) });
    }

    for (const e of docTimelineEvents) {
        // Use parsed date if available; fall back to document upload date so the event is never lost
        const date = e.eventDate ?? e.document.uploadedAt;
        events.push({
            id: `dte_${e.id}`,
            date,
            type: 'doc_event',
            title: e.description,
            // Show the raw date text from the document so user sees what was written
            description: e.eventDate ? undefined : `Date in document: "${e.eventDateRaw}"`,
            source: e.documentName,
            ...classify(date),
        });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
