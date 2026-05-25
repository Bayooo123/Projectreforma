import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { extractCourtDate, EmailIntentType, UrgencyLevel } from '@/lib/services/email-processor';

interface ActionContext {
    workspaceId: string;
    pulseEventId: string;
    intent: EmailIntentType;
    urgency: UrgencyLevel;
    subject: string;
    body: string;
    senderName: string;
    senderEmail: string;
    summary: string;
    actionItems: string[];
    brief: { id: string; name: string; lawyerId: string; lawyerInChargeId: string | null; matterId?: string | null } | null;
    assignedToId: string | null;
}

interface ActionResult {
    tasksCreated: number;
    calendarEntriesCreated: number;
    notificationsFired: number;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function executeIntentActions(ctx: ActionContext): Promise<ActionResult> {
    const result: ActionResult = { tasksCreated: 0, calendarEntriesCreated: 0, notificationsFired: 0 };

    const actions: Promise<void>[] = [];

    switch (ctx.intent) {
        case 'COURT_NOTICE':
            actions.push(handleCourtNotice(ctx, result));
            break;
        case 'ADJOURNMENT':
            actions.push(handleAdjournment(ctx, result));
            break;
        case 'CLIENT_QUERY':
            actions.push(handleClientQuery(ctx, result));
            break;
        case 'NEW_INSTRUCTION':
            actions.push(handleNewInstruction(ctx, result));
            break;
        case 'PAYMENT':
            actions.push(handlePayment(ctx, result));
            break;
        case 'DOCUMENT_RECEIVED':
            actions.push(handleDocumentReceived(ctx, result));
            break;
        default:
            // CORRESPONDENCE — just fire notification if high/critical
            break;
    }

    // Urgency-based notification runs alongside intent-specific actions
    actions.push(fireUrgencyNotification(ctx, result));

    await Promise.allSettled(actions);

    // Mark PulseEvent as actioned if we did something
    if (result.tasksCreated > 0 || result.calendarEntriesCreated > 0) {
        await prisma.pulseEvent.update({
            where: { id: ctx.pulseEventId },
            data: { status: 'actioned', actionedAt: new Date() },
        }).catch(() => null);
    }

    return result;
}

// ── Intent handlers ───────────────────────────────────────────────────────────

async function handleCourtNotice(ctx: ActionContext, result: ActionResult) {
    const extracted = await extractCourtDate(ctx.subject, ctx.body);

    if (extracted.date && ctx.brief?.matterId) {
        await prisma.calendarEntry.create({
            data: {
                matterId:    ctx.brief.matterId,
                briefId:     ctx.brief.id,
                date:        new Date(extracted.date),
                title:       extracted.nextHearingPurpose || 'Court Appearance',
                court:       extracted.court || undefined,
                judge:       extracted.judge || undefined,
                description: `Auto-created from email: ${ctx.subject}`,
                type:        'COURT',
            },
        });
        result.calendarEntriesCreated++;

        // Update matter's nextCourtDate
        await prisma.matter.update({
            where:  { id: ctx.brief.matterId },
            data:   { nextCourtDate: new Date(extracted.date) },
        }).catch(() => null);
    }

    // Task: prepare for court
    await createTaskFromEmail(ctx, {
        title:    `Prepare for court: ${ctx.brief?.name || ctx.subject}`,
        priority: 'high',
        dueDate:  extracted.date ? daysBeforeDate(new Date(extracted.date), 2) : daysFromNow(3),
    }, result);
}

async function handleAdjournment(ctx: ActionContext, result: ActionResult) {
    const extracted = await extractCourtDate(ctx.subject, ctx.body);

    if (extracted.date && ctx.brief?.matterId) {
        await prisma.calendarEntry.create({
            data: {
                matterId:    ctx.brief.matterId,
                briefId:     ctx.brief.id,
                date:        new Date(extracted.date),
                title:       `Adjourned Hearing: ${extracted.nextHearingPurpose || 'Mention'}`,
                court:       extracted.court || undefined,
                judge:       extracted.judge || undefined,
                description: `Adjournment logged from email: ${ctx.subject}`,
                type:        'COURT',
            },
        });
        result.calendarEntriesCreated++;

        await prisma.matter.update({
            where: { id: ctx.brief.matterId },
            data:  { nextCourtDate: new Date(extracted.date) },
        }).catch(() => null);
    }

    await createTaskFromEmail(ctx, {
        title:    `Review adjournment: ${ctx.brief?.name || ctx.subject}`,
        priority: 'medium',
        dueDate:  daysFromNow(1),
    }, result);
}

async function handleClientQuery(ctx: ActionContext, result: ActionResult) {
    await createTaskFromEmail(ctx, {
        title:    `Respond to ${ctx.senderName}: ${ctx.subject}`,
        priority: 'high',
        dueDate:  daysFromNow(2),
    }, result);
}

async function handleNewInstruction(ctx: ActionContext, result: ActionResult) {
    await createTaskFromEmail(ctx, {
        title:    `Review new instructions from ${ctx.senderName}`,
        priority: 'high',
        dueDate:  daysFromNow(1),
    }, result);

    // Also alert partners and owner
    if (ctx.workspaceId) {
        const partners = await prisma.workspaceMember.findMany({
            where: { workspaceId: ctx.workspaceId, role: { in: ['owner', 'partner'] }, status: 'active' },
            select: { userId: true, role: true },
        });

        await Promise.all(partners.map(p =>
            createNotification({
                title:       '📋 New Client Instruction',
                message:     `${ctx.senderName} has sent new instructions: "${ctx.summary}"`,
                recipientId: p.userId,
                recipientType: p.role as any,
                type:        'info',
                priority:    'high',
                relatedBriefId: ctx.brief?.id,
            })
        ));
        result.notificationsFired += partners.length;
    }
}

async function handlePayment(ctx: ActionContext, result: ActionResult) {
    await createTaskFromEmail(ctx, {
        title:    `Review payment communication from ${ctx.senderName}`,
        priority: 'medium',
        dueDate:  daysFromNow(2),
    }, result);
}

async function handleDocumentReceived(ctx: ActionContext, result: ActionResult) {
    await createTaskFromEmail(ctx, {
        title:    `Review document from ${ctx.senderName}: ${ctx.subject}`,
        priority: 'normal' as any,
        dueDate:  daysFromNow(3),
    }, result);
}

// ── Urgency notification ──────────────────────────────────────────────────────

async function fireUrgencyNotification(ctx: ActionContext, result: ActionResult) {
    if (ctx.urgency !== 'critical' && ctx.urgency !== 'high') return;

    const recipientId = ctx.assignedToId;
    if (!recipientId) return;

    const urgencyLabel  = ctx.urgency === 'critical' ? '🚨 URGENT' : '⚠️ ACTION REQUIRED';
    const notifType     = ctx.urgency === 'critical' ? 'critical' : 'warning';
    const notifPriority = ctx.urgency === 'critical' ? 'critical' : 'high';

    await createNotification({
        title:         `${urgencyLabel}: ${ctx.subject}`,
        message:       `${ctx.senderName} — ${ctx.summary}`,
        recipientId,
        recipientType: 'lawyer',
        type:          notifType as any,
        priority:      notifPriority as any,
        relatedBriefId: ctx.brief?.id,
    });
    result.notificationsFired++;

    // Critical: also notify workspace owner
    if (ctx.urgency === 'critical') {
        const workspace = await prisma.workspace.findUnique({
            where:  { id: ctx.workspaceId },
            select: { ownerId: true },
        });

        if (workspace && workspace.ownerId !== recipientId) {
            await createNotification({
                title:         `🚨 CRITICAL: ${ctx.subject}`,
                message:       `Assigned to ${ctx.assignedToId} — ${ctx.summary}`,
                recipientId:   workspace.ownerId,
                recipientType: 'partner',
                type:          'critical' as any,
                priority:      'critical',
                relatedBriefId: ctx.brief?.id,
            });
            result.notificationsFired++;
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTaskFromEmail(
    ctx: ActionContext,
    opts: { title: string; priority: 'low' | 'medium' | 'high'; dueDate: Date },
    result: ActionResult
) {
    const assignedById = ctx.assignedToId || await getWorkspaceOwnerId(ctx.workspaceId);
    if (!assignedById) return;

    await prisma.task.create({
        data: {
            title:        opts.title,
            description:  ctx.summary,
            assignedToId: ctx.assignedToId || undefined,
            assignedById,
            workspaceId:  ctx.workspaceId,
            briefId:      ctx.brief?.id || undefined,
            matterId:     ctx.brief?.matterId || undefined,
            priority:     opts.priority,
            status:       'pending',
            dueDate:      opts.dueDate,
            source:       'email',
            sourceEmail:  ctx.senderEmail,
            emailSubject: ctx.subject,
        },
    });
    result.tasksCreated++;
}

async function getWorkspaceOwnerId(workspaceId: string): Promise<string | null> {
    const ws = await prisma.workspace.findUnique({
        where:  { id: workspaceId },
        select: { ownerId: true },
    });
    return ws?.ownerId ?? null;
}

function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

function daysBeforeDate(target: Date, days: number): Date {
    const d = new Date(target);
    d.setDate(d.getDate() - days);
    return d;
}
