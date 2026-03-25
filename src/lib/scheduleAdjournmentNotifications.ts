'use server';

import { prisma } from '@/lib/prisma';

/**
 * Schedule notifications for a calendar entry
 * Creates 3 notifications per lawyer: 3-day, 2-day, and day-of reminders
 */
export async function scheduleCalendarEntryNotifications(
    matterId: string,
    calendarEntryId: string,
    eventDate: Date,
    workspaceId: string
): Promise<{ success: boolean; error?: string; scheduledCount?: number }> {
    try {
        // 1. Cancel any existing pending notifications for this entry
        await (prisma.scheduledNotification as any).updateMany({
            where: {
                calendarEntryId,
                status: 'pending'
            },
            data: {
                status: 'cancelled',
                updatedAt: new Date()
            }
        });

        // 2. Fetch all lawyers in the workspace
        const workspaceMembers = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            }
        });

        if (workspaceMembers.length === 0) {
            return { success: false, error: 'No workspace members found' };
        }

        // 3. Calculate notification dates
        const eventDateTime = new Date(eventDate);
        const threeDaysBefore = new Date(eventDateTime);
        threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
        threeDaysBefore.setHours(9, 0, 0, 0); // 9 AM

        const twoDaysBefore = new Date(eventDateTime);
        twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
        twoDaysBefore.setHours(9, 0, 0, 0); // 9 AM

        const dayOf = new Date(eventDateTime);
        dayOf.setHours(7, 0, 0, 0); // 7 AM on the day

        const now = new Date();

        // 4. Create notification records for each lawyer
        const notificationsToCreate = [];

        for (const member of workspaceMembers) {
            // Only schedule future notifications
            if (threeDaysBefore > now) {
                notificationsToCreate.push({
                    matterId,
                    calendarEntryId,
                    recipientId: member.userId,
                    notificationType: 'three_day',
                    scheduledFor: threeDaysBefore,
                    status: 'pending'
                });
            }

            if (twoDaysBefore > now) {
                notificationsToCreate.push({
                    matterId,
                    calendarEntryId,
                    recipientId: member.userId,
                    notificationType: 'two_day',
                    scheduledFor: twoDaysBefore,
                    status: 'pending'
                });
            }

            if (dayOf > now) {
                notificationsToCreate.push({
                    matterId,
                    calendarEntryId,
                    recipientId: member.userId,
                    notificationType: 'day_of',
                    scheduledFor: dayOf,
                    status: 'pending'
                });
            }
        }

        // 5. Bulk create all notifications
        if (notificationsToCreate.length > 0) {
            await (prisma.scheduledNotification as any).createMany({
                data: notificationsToCreate
            });
        }

        return {
            success: true,
            scheduledCount: notificationsToCreate.length
        };

    } catch (error) {
        console.error('Error scheduling calendar notifications:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to schedule notifications'
        };
    }
}
