'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';
import { applySentenceCaseToFields, applyTitleCaseToFields } from '@/lib/sentence-case';
import { logActivity } from '@/lib/log-activity';
import { BriefService } from '@/lib/services/briefs/brief-service';

export async function getUserBriefs() {
    const user = await requireAuth();
    if (!user.email) return [];

    try {
        const membership = await prisma.workspaceMember.findFirst({
            where: { user: { email: user.email } },
            select: { workspaceId: true },
        });
        if (!membership) return [];

        const { briefs } = await BriefService.list(membership.workspaceId, { limit: 20 });
        return briefs;
    } catch (err) {
        console.error('Failed to fetch user briefs', err);
        return [];
    }
}

export async function getBriefs(workspaceId: string) {
    await requireAuth();
    try {
        const { briefs } = await BriefService.list(workspaceId);
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
                // documents and folders excluded — fetched lazily client-side
                // when the Documents tab is opened, avoiding a 200-row join on
                // every brief page load.
                briefLawyers: {
                    include: {
                        lawyer: {
                            select: { id: true, name: true, email: true }
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
    assignments?: { lawyerId: string; role: string }[];
}) {
    const session = await requireAuth();
    data = applyTitleCaseToFields(data, ['name']);
    data = applySentenceCaseToFields(data, ['description']);

    const creatorId = data.lawyerId || session.id;
    try {
        if (!data.briefNumber || data.briefNumber.trim() === '') {
            return { success: false, error: 'Brief number is required' };
        }

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.brief.findUnique({
                where: { briefNumber: data.briefNumber }
            });
            if (existing) {
                throw new Error(`Brief number "${data.briefNumber}" already exists. Please use a different number.`);
            }

            return tx.brief.create({
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
                    isLitigationDerived: false,
                    customTitle: null,
                    parentBriefId: data.parentBriefId || null,
                    briefLawyers: data.assignments?.length ? {
                        create: data.assignments.map(a => ({ lawyerId: a.lawyerId, role: a.role }))
                    } : undefined,
                },
                include: {
                    client: true,
                    lawyer: { select: { id: true, name: true, email: true } },
                },
            });
        }, { maxWait: 5000, timeout: 10000 });

        revalidatePath('/briefs');

        try {
            const { createNotification } = await import('@/app/actions/notifications');
            await createNotification({
                workspaceId: data.workspaceId,
                title: 'New Brief Created',
                message: `Brief "${data.name}" (${data.briefNumber}) has been created.`,
                type: 'info',
                priority: 'medium',
                recipients: 'ALL',
                relatedBriefId: result.id,
            });
        } catch {
            // Non-critical
        }

        logActivity({ workspaceId: data.workspaceId, userId: session.id!, resource: 'BRIEF', action: 'CREATED', resourceId: result.id, resourceName: result.name }).catch(() => {});

        return { success: true, brief: result };
    } catch (error: any) {
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
        assignments?: { lawyerId: string; role: string }[];
    }
) {
    const session = await requireAuth();
    data = applyTitleCaseToFields(data, ['name', 'customTitle']);
    data = applySentenceCaseToFields(data, ['description']);

    try {
        const existingBrief = await prisma.brief.findUnique({
            where: { id },
            select: { workspaceId: true, briefNumber: true, lawyerInChargeId: true },
        });
        if (!existingBrief) return { success: false, error: 'Brief not found' };

        const [membership, workspace] = await Promise.all([
            prisma.workspaceMember.findFirst({
                where: { userId: session.id, workspaceId: existingBrief.workspaceId },
            }),
            prisma.workspace.findUnique({
                where: { id: existingBrief.workspaceId },
                select: { ownerId: true },
            }),
        ]);

        const isWorkspaceOwner = workspace?.ownerId === session.id;
        if (!membership && !isWorkspaceOwner) {
            return { success: false, error: 'Not a member of this workspace' };
        }

        const { canEditLawyerInCharge, BriefPermissions } = await import('@/lib/rbac');
        const dbUser = await prisma.user.findUnique({
            where: { email: session.email! },
            select: { isPlatformAdmin: true },
        });
        const isReformaSuperAdmin = dbUser?.isPlatformAdmin === true;

        if (data.lawyerInChargeId && !isReformaSuperAdmin && !isWorkspaceOwner && !canEditLawyerInCharge(membership?.role ?? '')) {
            return { success: false, error: 'Only Principal Partners, Partners, and Head of Chambers can change Lawyer in Charge' };
        }

        if (data.customBriefNumber && !isReformaSuperAdmin && !isWorkspaceOwner && !BriefPermissions.canEditBriefNumber(membership?.role ?? '')) {
            return { success: false, error: 'Only senior roles can edit brief numbers' };
        }

        if (data.customBriefNumber) {
            const existing = await prisma.brief.findFirst({
                where: {
                    workspaceId: existingBrief.workspaceId,
                    OR: [{ briefNumber: data.customBriefNumber }, { customBriefNumber: data.customBriefNumber }],
                    id: { not: id },
                },
            });
            if (existing) return { success: false, error: 'Brief number already exists in this workspace' };
        }

        // Audit logs for sensitive field changes
        if (data.lawyerInChargeId && data.lawyerInChargeId !== existingBrief.lawyerInChargeId) {
            await prisma.briefLawyerHistory.create({
                data: { briefId: id, previousLawyerId: existingBrief.lawyerInChargeId, newLawyerId: data.lawyerInChargeId, changedBy: session.id, reason: 'Manual reassignment' },
            });
        }
        if (data.customBriefNumber && data.customBriefNumber !== existingBrief.briefNumber) {
            await prisma.briefActivityLog.create({
                data: { briefId: id, activityType: 'brief_number_changed', description: `Brief number changed from ${existingBrief.briefNumber} to ${data.customBriefNumber}`, performedBy: session.id },
            });
        }

        const { assignments, ...rest } = data;

        const brief = await prisma.brief.update({
            where: { id },
            data: {
                ...rest,
                briefLawyers: assignments ? {
                    deleteMany: {},
                    create: assignments.map(a => ({
                        lawyerId: a.lawyerId,
                        role: a.role
                    }))
                } : undefined
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
            },
        });
        logActivity({ workspaceId: existingBrief.workspaceId, userId: session.id!, resource: 'BRIEF', action: 'UPDATED', resourceId: brief.id, resourceName: brief.name }).catch(() => {});
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
        const brief = await prisma.brief.findUnique({
            where: { id },
            select: { workspaceId: true, name: true },
        });
        if (!brief) return { success: false, error: 'Brief not found' };

        const { requirePermission } = await import('@/lib/auth-utils');
        await requirePermission(brief.workspaceId, 'DELETE_BRIEF');

        const session = await requireAuth();
        const result = await BriefService.softDelete(id, brief.workspaceId);
        if (!result.success) return result;

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
        const result = await BriefService.assignLawyer(briefId, lawyerId);
        if (!result.success) return result;

        revalidatePath('/briefs');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true, brief: result.data };
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

    // ocrText intentionally excluded here — it can be megabytes per document.
    // The extractor fetches it lazily only for non-visual formats (docx, txt, etc.)
    // where direct PDF/image vision is unavailable.
    const docs = await prisma.document.findMany({
        where: { briefId },
        select: { id: true, name: true, url: true, type: true },
    });

    if (docs.length === 0) return { processed: 0, found: 0 };

    const { extractDocumentTimeline } = await import('@/lib/services/doc-timeline-extractor');

    const counts = await Promise.all(
        docs.map(doc => extractDocumentTimeline(doc.id, doc.name, briefId, null, doc.url, doc.type))
    );
    const totalFound = counts.reduce((sum, n) => sum + n, 0);

    return { processed: docs.length, found: totalFound };
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEventType =
    | 'brief_created' | 'brief_due'
    | 'court_hearing' | 'court_adjourned' | 'meeting'
    | 'task_created' | 'task_completed' | 'task_due'
    | 'document_uploaded' | 'activity' | 'doc_event'
    | 'email';

export interface TimelineEmailData {
    fromName: string | null;
    fromEmail: string;
    body: string | null;
    bodyPreview: string | null;
    attachments: Array<{ id: string; name: string; url: string; contentType: string; size: number }>;
}

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
    email?: TimelineEmailData;
}

export async function getBriefTimeline(briefId: string): Promise<TimelineEvent[]> {
    await requireAuth();

    const brief = await prisma.brief.findUnique({
        where: { id: briefId, deletedAt: null },
        select: { createdAt: true, dueDate: true, name: true, matterId: true },
    });
    if (!brief) return [];

    const matterId = brief.matterId;

    const [calendarEntries, tasks, documents, activityLogs, docTimelineEvents, emailLinks] = await Promise.all([
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
            where: { briefId, activityType: { notIn: ['viewed', 'email_linked'] } },
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
        prisma.pulseEvent.findMany({
            where: { briefId, inboundEmailId: { not: null } },
            select: {
                id: true,
                inboundEmail: {
                    select: {
                        id: true, fromEmail: true, fromName: true,
                        subject: true, bodyPreview: true, body: true, receivedAt: true,
                        attachments: { select: { id: true, name: true, url: true, contentType: true, size: true } },
                    },
                },
            },
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

    const seenEmailIds = new Set<string>();
    for (const p of emailLinks) {
        const em = p.inboundEmail;
        if (!em || seenEmailIds.has(em.id)) continue;
        seenEmailIds.add(em.id);
        events.push({
            id: `email_${em.id}`,
            date: em.receivedAt,
            type: 'email',
            title: em.subject || '(no subject)',
            email: {
                fromName: em.fromName,
                fromEmail: em.fromEmail,
                body: em.body,
                bodyPreview: em.bodyPreview,
                attachments: em.attachments,
            },
            ...classify(em.receivedAt),
        });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ── AI Brief Summary ─────────────────────────────────────────────────────────

export interface BriefSummaryData {
    briefType: 'litigation' | 'transactional';
    prose: string;
    chronology: Array<{ date: string; dateDisplay: string; narrative?: string; title?: string; summary?: string }>;
    generatedAt: Date;
}

export async function getBriefSummary(briefId: string): Promise<BriefSummaryData | null> {
    await requireAuth();
    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        select: {
            aiSummaryProse: true,
            aiSummaryChronology: true,
            aiSummaryGeneratedAt: true,
            isLitigationDerived: true,
            category: true,
        },
    });
    if (!brief?.aiSummaryProse || !brief.aiSummaryGeneratedAt) return null;

    const { detectBriefType } = await import('@/lib/services/brief-summary-generator');
    return {
        briefType: detectBriefType(brief.isLitigationDerived, brief.category),
        prose: brief.aiSummaryProse,
        chronology: (brief.aiSummaryChronology as BriefSummaryData['chronology']) ?? [],
        generatedAt: brief.aiSummaryGeneratedAt,
    };
}

export async function generateBriefSummary(briefId: string): Promise<{ success: boolean; data?: BriefSummaryData; error?: string }> {
    await requireAuth();

    const [brief, documents, emailLinks] = await Promise.all([
        prisma.brief.findUnique({
            where: { id: briefId, deletedAt: null },
            select: {
                name: true,
                category: true,
                status: true,
                dueDate: true,
                description: true,
                isLitigationDerived: true,
                client:         { select: { name: true } },
                lawyer:         { select: { name: true } },
                lawyerInCharge: { select: { name: true } },
                matter:         { select: { name: true, caseNumber: true } },
            },
        }),
        // Fetch url + type so the generator can read files that have no ocrText yet
        prisma.document.findMany({
            where: { briefId },
            select: { name: true, url: true, type: true, ocrText: true },
            orderBy: { uploadedAt: 'asc' },
        }),
        // Fetch linked emails via PulseEvent → InboundEmail
        prisma.pulseEvent.findMany({
            where: { briefId, inboundEmailId: { not: null } },
            select: {
                inboundEmail: {
                    select: {
                        subject: true,
                        fromName: true,
                        fromEmail: true,
                        receivedAt: true,
                        body: true,
                        bodyPreview: true,
                    },
                },
            },
        }),
    ]);

    if (!brief) return { success: false, error: 'Brief not found' };

    // Deduplicate emails by subject+date and extract the InboundEmail records
    const seenEmailKeys = new Set<string>();
    const emails = emailLinks
        .map(p => p.inboundEmail)
        .filter((e): e is NonNullable<typeof e> => {
            if (!e) return false;
            const key = `${e.fromEmail}::${e.subject}::${e.receivedAt.toISOString().slice(0, 10)}`;
            if (seenEmailKeys.has(key)) return false;
            seenEmailKeys.add(key);
            return true;
        });

    const { generateBriefSummaryFromDocuments } = await import('@/lib/services/brief-summary-generator');

    let result;
    try {
        result = await generateBriefSummaryFromDocuments(
            {
                name:                brief.name,
                client:              brief.client?.name ?? null,
                lawyer:              brief.lawyerInCharge?.name ?? brief.lawyer?.name ?? null,
                category:            brief.category,
                status:              brief.status,
                dueDate:             brief.dueDate?.toISOString().slice(0, 10) ?? null,
                description:         brief.description ?? null,
                isLitigationDerived: brief.isLitigationDerived,
                matter:              brief.matter
                    ? `${brief.matter.name}${brief.matter.caseNumber ? ` (${brief.matter.caseNumber})` : ''}`
                    : null,
            },
            documents,
            emails,
        );
    } catch (err: any) {
        return { success: false, error: err?.message ?? 'Summary generation failed.' };
    }

    if (!result) return { success: false, error: 'Summary generation failed — no result returned.' };

    const now = new Date();
    await prisma.brief.update({
        where: { id: briefId },
        data: {
            aiSummaryProse:       result.prose,
            aiSummaryChronology:  result.chronology as object[],
            aiSummaryGeneratedAt: now,
        },
    });

    return {
        success: true,
        data: { briefType: result.briefType, prose: result.prose, chronology: result.chronology, generatedAt: now },
    };
}

// ── Brief lawyer assignments ──────────────────────────────────────────────────

export async function getBriefLawyerAssignments(briefId: string) {
    await requireAuth();
    return prisma.briefLawyer.findMany({
        where: { briefId },
        include: { lawyer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
    });
}

export async function setBriefLawyerAssignments(
    briefId: string,
    assignments: { lawyerId: string; role: string }[],
): Promise<{ success: boolean; error?: string }> {
    await requireAuth();
    try {
        await prisma.$transaction([
            prisma.briefLawyer.deleteMany({ where: { briefId } }),
            ...(assignments.length > 0
                ? [prisma.briefLawyer.createMany({
                    data: assignments.map(a => ({ briefId, lawyerId: a.lawyerId, role: a.role })),
                    skipDuplicates: true,
                })]
                : []),
        ]);
        revalidatePath(`/briefs/${briefId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message ?? 'Failed to update assignments' };
    }
}
