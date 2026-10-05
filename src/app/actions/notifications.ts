"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { requireAuth } from '@/lib/auth-utils';

// Writing notifications happens in '@/lib/notifications' (notifyWorkspace /
// createNotification) — kept out of this 'use server' file so it can't be
// called from the browser.

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
