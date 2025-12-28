"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { requireAuth } from '@/lib/auth-utils';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'alert' | 'info' | 'success' | 'warning';

interface CreateNotificationData {
    workspaceId: string;
    title: string;
    message: string;
    type: NotificationType;
    priority?: NotificationPriority;
    recipients: 'ALL' | { role: string[] } | { userIds: string[] };
    relatedMatterId?: string;
    relatedBriefId?: string;
    relatedInvoiceId?: string;
    relatedPaymentId?: string;
    metadata?: any;
    channels?: string[]; // ['in-app'] default
}

export async function createNotification(data: CreateNotificationData) {
    // This action might be called by other server actions where we don't necessarily have a user session contexts (e.g. webhooks),
    // but usually in this app triggers are user actions.
    // We won't strictly enforce auth HERE if it's an internal utility, 
    // but we need to know WHO to send it to.

    try {
        let recipientIds: string[] = [];

        // 1. Resolve Recipients
        if (data.recipients === 'ALL') {
            const members = await prisma.workspaceMember.findMany({
                where: { workspaceId: data.workspaceId, status: 'active' },
                select: { userId: true }
            });
            recipientIds = members.map(m => m.userId);
        } else if ('role' in data.recipients) {
            // Map 'partner', 'associate' to DB roles.
            // DB has roles like 'owner', 'partner', 'lawyer', 'staff'.
            // "Senior Associate" is in `designation` (string), so it's harder to target strictly by that unless we query.
            // For now let's support: 'owner', 'partner', 'lawyer'.
            const roles = data.recipients.role;
            const members = await prisma.workspaceMember.findMany({
                where: {
                    workspaceId: data.workspaceId,
                    status: 'active',
                    role: { in: roles }
                },
                select: { userId: true }
            });
            recipientIds = members.map(m => m.userId);
        } else if ('userIds' in data.recipients) {
            recipientIds = data.recipients.userIds;
        }

        if (recipientIds.length === 0) return { success: true, count: 0 };

        // 2. Batch Create
        // Prisma createMany is efficient
        const notificationsData = recipientIds.map(userId => ({
            recipientId: userId,
            recipientType: 'user', // Default
            type: data.type,
            title: data.title,
            message: data.message,
            priority: data.priority || 'medium',
            channels: JSON.stringify(data.channels || ['in-app']),
            relatedMatterId: data.relatedMatterId,
            relatedBriefId: data.relatedBriefId,
            relatedInvoiceId: data.relatedInvoiceId,
            relatedPaymentId: data.relatedPaymentId,
            metadata: data.metadata ?? undefined,
            status: 'unread'
        }));

        await prisma.notification.createMany({
            data: notificationsData
        });

        // Loop to revalidate? Or just revalidate path?
        // Notifications appear on all pages (header).
        // Since we can't easily revalidate ALL user paths, we might rely on client polling or specific path revalidation.
        // For now, no heavy revalidation needed since client updates on nav.

        return { success: true, count: recipientIds.length };

    } catch (error) {
        console.error('Failed to create notifications:', error);
        return { success: false, error: 'Internal Notification Error' };
    }
}

export async function getUserNotifications(limit = 20) {
    const user = await requireAuth();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const notifications = await prisma.notification.findMany({
            where: { recipientId: user.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const unreadCount = await prisma.notification.count({
            where: { recipientId: user.id, status: 'unread' }
        });

        return { success: true, data: notifications, unreadCount };
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return { success: false, error: 'Failed to fetch' };
    }
}

export async function markAsRead(notificationId: string) {
    const user = await requireAuth();
    try {
        await prisma.notification.update({
            where: { id: notificationId, recipientId: user.id }, // Security constraint
            data: { status: 'read', readAt: new Date() }
        });
        revalidatePath('/dashboard'); // revalidate logical places
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function markAllAsRead() {
    const user = await requireAuth();
    try {
        await prisma.notification.updateMany({
            where: { recipientId: user.id, status: 'unread' },
            data: { status: 'read', readAt: new Date() }
        });
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
