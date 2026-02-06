import { prisma } from '@/lib/prisma';

export type NotificationType = 'alert' | 'info' | 'success' | 'warning' | 'critical' | 'adjournment_reminder';
export type RecipientType = 'lawyer' | 'client' | 'partner' | 'staff';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

interface CreateNotificationParams {
    title: string;
    message: string;
    recipientId: string;
    recipientType: RecipientType;
    type?: NotificationType;
    priority?: Priority;
    relatedMatterId?: string;
    relatedBriefId?: string;
    channels?: string[]; // ['in-app', 'email']
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        const notification = await prisma.notification.create({
            data: {
                title: params.title,
                message: params.message,
                recipientId: params.recipientId,
                recipientType: params.recipientType,
                type: params.type || 'info',
                priority: params.priority || 'medium',
                relatedMatterId: params.relatedMatterId,
                relatedBriefId: params.relatedBriefId,
                channels: JSON.stringify(params.channels || ['in-app']),
                status: 'unread',
            },
        });
        return { success: true, notification };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error };
    }
}

export async function notifyBriefAssigned(brief: any) {
    // Notify the assigned lawyer
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

export async function notifyMatterUpdate(matter: any, description: string, performedByUserId: string) {
    // Notify all workspace members (simplified "everyone" logic)
    // In a real app, we might filter by those assigned to the matter
    // For now, we'll notify the assigned lawyer (if not the performer) and the workspace owner

    const workspace = await prisma.workspace.findUnique({
        where: { id: matter.workspaceId },
        include: { members: true }
    });

    if (!workspace) return;

    const notifications = workspace.members
        .filter(member => member.userId !== performedByUserId) // Don't notify self
        .map(member => createNotification({
            title: 'Litigation Update',
            message: `${matter.caseNumber}: ${description}`,
            recipientId: member.userId,
            recipientType: member.role as RecipientType,
            type: 'info',
            relatedMatterId: matter.id,
        }));

    await Promise.all(notifications);
}

export async function notifyExpenseRecorded(expense: any, workspaceId: string) {
    // Notify Managing Partners
    const partners = await prisma.workspaceMember.findMany({
        where: {
            workspaceId,
            role: { in: ['owner', 'partner'] }
        }
    });

    const notifications = partners.map(partner => createNotification({
        title: 'New Expense Recorded',
        message: `Expense: ${expense.description} - ₦${(expense.amount / 100).toLocaleString()}`,
        recipientId: partner.userId,
        recipientType: 'partner',
        type: 'warning', // Money out is usually a warning/alert
    }));

    await Promise.all(notifications);
}

export async function notifyWorkspaceMembers(params: {
    workspaceId: string,
    title: string,
    message: string,
    type?: NotificationType,
    priority?: Priority,
    roles?: string[],
    designations?: string[],
    relatedMatterId?: string,
    relatedBriefId?: string
}) {
    const members = await prisma.workspaceMember.findMany({
        where: {
            workspaceId: params.workspaceId,
            status: 'active',
            OR: [
                params.roles ? { role: { in: params.roles } } : undefined,
                params.designations ? { designation: { in: params.designations } } : undefined
            ].filter((cond): cond is any => cond !== undefined)
        }
    });

    // Fallback to workspace owner if no specific targets found
    if (members.length === 0) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: params.workspaceId },
            select: { ownerId: true }
        });
        if (workspace) {
            await createNotification({
                ...params,
                recipientId: workspace.ownerId,
                recipientType: 'staff' // Default
            });
        }
        return;
    }

    const notifications = members.map(member => createNotification({
        ...params,
        recipientId: member.userId,
        recipientType: member.role as RecipientType,
    }));

    await Promise.all(notifications);
}
