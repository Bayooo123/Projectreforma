'use server';

import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { mailService } from '@/lib/services/mail/mail';
import { config } from '@/lib/config';

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
        const dueNotifications = await prisma.scheduledNotification.findMany({
            where: {
                status: 'pending',
                scheduledFor: { lte: new Date() },
            },
            include: {
                calendarEntry: {
                    include: {
                        matter: {
                            select: { id: true, name: true, caseNumber: true, court: true },
                        },
                    },
                },
                complianceTask: {
                    include: { obligation: true },
                },
            } as any,
            take: 100,
        }) as any[];

        // Batch-fetch recipient emails
        const recipientIds = [...new Set(dueNotifications.map((n: any) => n.recipientId))];
        const users = await prisma.user.findMany({
            where: { id: { in: recipientIds as string[] } },
            select: { id: true, name: true, email: true },
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        console.log(`[Notification Processor] Found ${dueNotifications.length} due notifications`);

        for (const scheduledNotif of dueNotifications) {
            try {
                let title = '';
                let message = '';
                let priority: 'low' | 'medium' | 'high' = 'medium';
                let relatedMatterId = scheduledNotif.matterId || undefined;
                let relatedComplianceTaskId = scheduledNotif.complianceTaskId || undefined;
                let type: any = 'adjournment_reminder';
                let emailHtml: string | null = null;
                let emailSubject: string | null = null;

                const recipient = userMap[scheduledNotif.recipientId];

                if (scheduledNotif.complianceTask) {
                    const { obligation } = scheduledNotif.complianceTask;
                    title = `Compliance Deadline: ${obligation.actionRequired}`;
                    message = `The deadline for ${obligation.actionRequired} (${obligation.regulatoryBody}) is on ${scheduledNotif.complianceTask.dueDate?.toLocaleDateString()}. Please ensure evidence is uploaded.`;
                    priority = 'high';
                    type = 'compliance_reminder';
                } else if (scheduledNotif.calendarEntry) {
                    const { matter } = scheduledNotif.calendarEntry;
                    if (!matter) {
                        console.warn(`[Notification Processor] Calendar entry ${scheduledNotif.calendarEntry.id} has no associated matter`);
                        continue;
                    }
                    const courtDate: Date = scheduledNotif.calendarEntry.date;

                    const daysMap: Record<string, number> = { three_day: 3, two_day: 2, day_of: 0 };
                    const daysAway = daysMap[scheduledNotif.notificationType] ?? 0;

                    switch (scheduledNotif.notificationType) {
                        case 'three_day':
                            title = 'Matter Coming Up in 3 Days';
                            message = `${matter.name}${matter.caseNumber ? ` (${matter.caseNumber})` : ''} is scheduled for ${courtDate.toLocaleDateString()}${matter.court ? ` at ${matter.court}` : ''}.`;
                            priority = 'medium';
                            break;
                        case 'two_day':
                            title = 'Matter Coming Up in 2 Days';
                            message = `${matter.name}${matter.caseNumber ? ` (${matter.caseNumber})` : ''} is scheduled for ${courtDate.toLocaleDateString()}${matter.court ? ` at ${matter.court}` : ''}. Please prepare accordingly.`;
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

                    if (recipient?.email) {
                        emailSubject = daysAway === 0
                            ? `Court today — ${matter.name}`
                            : `Court in ${daysAway} day${daysAway > 1 ? 's' : ''} — ${matter.name}`;
                        emailHtml = courtReminderEmail({
                            lawyerName: recipient.name || recipient.email,
                            matterName: matter.name,
                            caseNumber: matter.caseNumber ?? undefined,
                            court: matter.court ?? undefined,
                            adjournedFor: scheduledNotif.calendarEntry.adjournedFor ?? undefined,
                            courtDate,
                            daysAway,
                            appUrl: config.NEXT_PUBLIC_APP_URL,
                        });
                    }
                }

                await createNotification({
                    title,
                    message,
                    recipientId: scheduledNotif.recipientId,
                    recipientType: 'lawyer',
                    type,
                    priority,
                    relatedMatterId,
                    relatedComplianceTaskId,
                });

                if (emailHtml && emailSubject && recipient?.email) {
                    await mailService.send({
                        to: recipient.email,
                        subject: emailSubject,
                        html: emailHtml,
                    });
                }

                await prisma.scheduledNotification.update({
                    where: { id: scheduledNotif.id },
                    data: { status: 'sent', sentAt: new Date() },
                });

                processed++;
            } catch (error) {
                failed++;
                const errorMsg = `Failed to process notification ${scheduledNotif.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        console.log(`[Notification Processor] Completed: ${processed} processed, ${failed} failed`);
        return { success: true, processed, failed, errors };

    } catch (error) {
        console.error('[Notification Processor] Fatal error:', error);
        return {
            success: false,
            processed,
            failed,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown fatal error'],
        };
    }
}

function courtReminderEmail(p: {
    lawyerName: string;
    matterName: string;
    caseNumber?: string;
    court?: string;
    adjournedFor?: string;
    courtDate: Date;
    daysAway: number;
    appUrl: string;
}): string {
    const formattedDate = p.courtDate.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const headline = p.daysAway === 0 ? 'Court is today' : `Court date in ${p.daysAway} day${p.daysAway > 1 ? 's' : ''}`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:#1a3050;padding:18px 32px">
        <p style="margin:0;color:#ffffff;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif">Reforma — Court Reminder</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 6px;color:#6b7280;font-size:14px;font-family:Arial,sans-serif">Dear ${escHtml(p.lawyerName)},</p>
        <h1 style="margin:0 0 24px;font-size:20px;color:#111827;font-family:Georgia,serif">${headline}</h1>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px">
          <tr><td style="padding:20px 24px">
            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;font-family:Georgia,serif">${escHtml(p.matterName)}</p>
            ${p.caseNumber ? `<p style="margin:0 0 12px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">${escHtml(p.caseNumber)}</p>` : '<div style="margin-bottom:12px"></div>'}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 12px">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px">
              <tr>
                <td width="40%" style="padding:3px 0;color:#6b7280">Date</td>
                <td width="60%" style="padding:3px 0;color:#111827;font-weight:600">${formattedDate}</td>
              </tr>
              ${p.court ? `<tr><td style="padding:3px 0;color:#6b7280">Court</td><td style="padding:3px 0;color:#111827">${escHtml(p.court)}</td></tr>` : ''}
              ${p.adjournedFor ? `<tr><td style="padding:3px 0;color:#6b7280">Purpose</td><td style="padding:3px 0;color:#111827;text-transform:capitalize">${escHtml(p.adjournedFor)}</td></tr>` : ''}
            </table>
          </td></tr>
        </table>

        <a href="${p.appUrl}/calendar" style="display:inline-block;background:#1a3050;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px">Open Calendar →</a>
      </td></tr>
      <tr><td style="padding:14px 32px;border-top:1px solid #f3f4f6">
        <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif">Reforma OS · Abiola Sanni &amp; Co. · You are receiving this because you are assigned to this matter.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
