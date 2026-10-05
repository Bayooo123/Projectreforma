import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// The one place Notification rows are written. Everything else — server
// actions, crons, agents — calls into here. This is a plain server module,
// not a 'use server' file, so it can't be invoked from the browser.

export type NotificationType = 'alert' | 'info' | 'success' | 'warning' | 'critical' | 'adjournment_reminder' | 'compliance_reminder';
export type RecipientType = 'lawyer' | 'client' | 'partner' | 'staff' | 'user';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

interface NotificationContent {
    title: string;
    message: string;
    type?: NotificationType;
    priority?: Priority;
    relatedMatterId?: string | null;
    relatedBriefId?: string | null;
    relatedComplianceTaskId?: string | null;
    relatedInvoiceId?: string | null;
    relatedPaymentId?: string | null;
    metadata?: Prisma.InputJsonValue;
    channels?: string[]; // ['in-app', 'email']
}

interface CreateNotificationParams extends NotificationContent {
    recipientId: string;
    recipientType: RecipientType;
}

function toRow(content: NotificationContent, recipientId: string, recipientType: string): Prisma.NotificationCreateManyInput {
    return {
        title: content.title,
        message: content.message,
        recipientId,
        recipientType,
        type: content.type || 'info',
        priority: content.priority || 'medium',
        relatedMatterId: content.relatedMatterId ?? undefined,
        relatedBriefId: content.relatedBriefId ?? undefined,
        relatedComplianceTaskId: content.relatedComplianceTaskId ?? undefined,
        relatedInvoiceId: content.relatedInvoiceId ?? undefined,
        relatedPaymentId: content.relatedPaymentId ?? undefined,
        metadata: content.metadata,
        channels: JSON.stringify(content.channels || ['in-app']),
        status: 'unread',
    };
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        const notification = await prisma.notification.create({
            data: toRow(params, params.recipientId, params.recipientType),
        });
        return { success: true, notification };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error };
    }
}

// Older call sites target 'owner' / 'partner' / 'admin', which are not values
// WorkspaceMember.role ever holds (roles are 'Managing Partner', 'Practice
// Manager', …) — so those notifications used to reach nobody. They are mapped
// onto the real roles here.
const ROLE_ALIASES: Record<string, string[]> = {
    partner: ['partner', 'principal partner', 'managing partner'],
    admin: ['practice manager', 'head of chamber', 'head of chambers'],
};

export type NotificationRecipients =
    | 'ALL'
    | { userIds: string[] }
    | { role: string[] };

async function resolveRecipients(workspaceId: string, recipients: NotificationRecipients): Promise<string[]> {
    if (recipients !== 'ALL' && 'userIds' in recipients) return [...new Set(recipients.userIds)];

    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        select: { userId: true, role: true, designation: true },
    });
    if (recipients === 'ALL') return members.map(m => m.userId);

    const wanted = new Set(recipients.role.flatMap(r => ROLE_ALIASES[r.toLowerCase()] ?? [r.toLowerCase()]));
    const ids = members
        .filter(m => wanted.has(m.role.toLowerCase()) || (m.designation && wanted.has(m.designation.toLowerCase())))
        .map(m => m.userId);

    if (recipients.role.some(r => r.toLowerCase() === 'owner') || ids.length === 0) {
        // 'owner' means the workspace owner; and a role-targeted alert with no
        // matching members still reaches someone rather than nobody.
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
        if (workspace) ids.push(workspace.ownerId);
    }
    return [...new Set(ids)];
}

/**
 * Notify a set of people in one workspace: everyone, specific users, or
 * members by role/designation.
 */
export async function notifyWorkspace(params: NotificationContent & {
    workspaceId: string;
    recipients: NotificationRecipients;
    excludeUserIds?: string[];
}) {
    try {
        const exclude = new Set(params.excludeUserIds ?? []);
        const recipientIds = (await resolveRecipients(params.workspaceId, params.recipients)).filter(id => !exclude.has(id));
        if (recipientIds.length === 0) return { success: true, count: 0 };

        await prisma.notification.createMany({ data: recipientIds.map(id => toRow(params, id, 'user')) });
        return { success: true, count: recipientIds.length };
    } catch (error) {
        console.error('Failed to create notifications:', error);
        return { success: false, error: 'Internal Notification Error' };
    }
}

export async function notifyWorkspaceMembers(params: NotificationContent & {
    workspaceId: string;
    roles?: string[];
    designations?: string[];
}) {
    const { roles = [], designations = [], ...rest } = params;
    await notifyWorkspace({ ...rest, recipients: { role: [...roles, ...designations] } });
}

export async function notifyBriefAssigned(brief: { id: string; lawyerId?: string | null; briefNumber: string; name: string }) {
    if (!brief.lawyerId) return;

    await createNotification({
        title: 'New Brief Assigned',
        message: `You have been assigned to brief: ${brief.briefNumber} - ${brief.name}. Please prepare an invoice.`,
        recipientId: brief.lawyerId,
        recipientType: 'lawyer',
        type: 'info',
        priority: 'high',
        relatedBriefId: brief.id,
    });
}

export async function notifyMatterUpdate(matter: { id: string; workspaceId: string; caseNumber?: string | null }, description: string, performedByUserId: string) {
    await notifyWorkspace({
        workspaceId: matter.workspaceId,
        recipients: 'ALL',
        excludeUserIds: [performedByUserId],
        title: 'Litigation Update',
        message: `${matter.caseNumber}: ${description}`,
        type: 'info',
        relatedMatterId: matter.id,
    });
}

export async function notifyExpenseRecorded(expense: { description?: string | null; amount: Prisma.Decimal | number | string }, workspaceId: string) {
    const amount = new Prisma.Decimal(expense.amount as Prisma.Decimal.Value).toNumber()
        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await notifyWorkspace({
        workspaceId,
        recipients: { role: ['owner', 'partner'] },
        title: 'New Expense Recorded',
        message: `Expense: ${expense.description} - ₦${amount}`,
        type: 'warning', // Money out is usually a warning/alert
    });
}
