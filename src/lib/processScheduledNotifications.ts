'use server';

import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

/**
 * Process scheduled notifications that are due
 * This should be called by a cron job
 */
export async function processScheduledNotifications(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    try {
        // 1. Find all pending notifications that are due
        const dueNotifications = await prisma.scheduledNotification.findMany({
            where: {
                status: 'pending',
                scheduledFor: {
                    lte: new Date()
                }
            },
            include: {
                courtDate: {
                    include: {
                        matter: {
                            select: {
                                id: true,
                                name: true,
                                caseNumber: true,
                                court: true
                            }
                        }
                    }
                }
            },
            take: 100 // Process in batches to avoid overwhelming the system
        });

        console.log(`[Notification Processor] Found ${dueNotifications.length} due notifications`);

        // 2. Process each notification
        for (const scheduledNotif of dueNotifications) {
            try {
                const { matter } = scheduledNotif.courtDate;
                const adjournmentDate = scheduledNotif.courtDate.nextDate || scheduledNotif.courtDate.date;

                // Generate notification content based on type
                let title = '';
                let message = '';
                let priority: 'low' | 'medium' | 'high' = 'medium';

                switch (scheduledNotif.notificationType) {
                    case 'three_day':
                        title = 'Matter Coming Up in 3 Days';
                        message = `${matter.name}${matter.caseNumber ? ` (${matter.caseNumber})` : ''} is scheduled for ${adjournmentDate.toLocaleDateString()}${matter.court ? ` at ${matter.court}` : ''}.`;
                        priority = 'medium';
                        break;

                    case 'two_day':
                        title = 'Matter Coming Up in 2 Days';
                        message = `${matter.name}${matter.caseNumber ? ` (${matter.caseNumber})` : ''} is scheduled for ${adjournmentDate.toLocaleDateString()}${matter.court ? ` at ${matter.court}` : ''}. Please prepare accordingly.`;
                        priority = 'high';
                        break;

                    case 'day_of':
                        title = 'Court is Today';
                        message = `${matter.name}${matter.caseNumber ? ` (${matter.caseNumber})` : ''} is scheduled for today${matter.court ? ` at ${matter.court}` : ''}. Please record what happened in court after the hearing.`;
                        priority = 'high';
                        break;

                    default:
                        title = 'Court Date Reminder';
                        message = `${matter.name} has a court date scheduled.`;
                }

                // Create the actual notification
                await createNotification({
                    title,
                    message,
                    recipientId: scheduledNotif.recipientId,
                    recipientType: 'lawyer',
                    type: 'adjournment_reminder',
                    priority,
                    relatedMatterId: scheduledNotif.matterId
                });

                // Mark as sent
                await prisma.scheduledNotification.update({
                    where: { id: scheduledNotif.id },
                    data: {
                        status: 'sent',
                        sentAt: new Date()
                    }
                });

                processed++;

            } catch (error) {
                failed++;
                const errorMsg = `Failed to process notification ${scheduledNotif.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(errorMsg);
                errors.push(errorMsg);

                // Don't throw - continue processing other notifications
            }
        }

        console.log(`[Notification Processor] Completed: ${processed} processed, ${failed} failed`);

        return {
            success: true,
            processed,
            failed,
            errors
        };

    } catch (error) {
        console.error('[Notification Processor] Fatal error:', error);
        return {
            success: false,
            processed,
            failed,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown fatal error']
        };
    }
}
