import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification, notifyWorkspaceMembers } from '@/lib/notifications';

// This route should be called by a Cron Job (e.g., Vercel Cron) once a day
export async function GET(request: Request) {
    try {
        // Verify Cron Secret (Optional but recommended)
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new NextResponse('Unauthorized', { status: 401 });
        // }

        console.log('⏰ Starting Daily Cron Job...');

        // 1. Invoice Follow-up (Every 3 days)
        // Find pending invoices created more than 3 days ago
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                status: 'pending',
                createdAt: {
                    lte: threeDaysAgo
                }
            },
            include: {
                matter: {
                    include: {
                        lawyers: {
                            include: {
                                lawyer: { select: { id: true, name: true } }
                            }
                        }
                    }
                },
                client: true
            }
        });

        console.log(`Found ${pendingInvoices.length} pending invoices to check.`);

        for (const invoice of pendingInvoices) {
            // Logic to avoid spamming: Check if we sent a notification recently
            // For MVP, we'll just send it. In production, we'd check `Notification` table history.

            // If invoice is linked to a matter, notify all associated lawyers
            if (invoice.matter?.lawyers) {
                for (const assoc of invoice.matter.lawyers) {
                    await createNotification({
                        title: 'Payment Follow-up Required',
                        message: `Invoice #${invoice.invoiceNumber} for ${invoice.client.name} is still pending. Please follow up or record payment.`,
                        recipientId: assoc.lawyerId,
                        recipientType: 'lawyer',
                        type: 'warning',
                        priority: 'high',
                    });
                }
            }
        }

        // 2. Weekly Analytics Nudge (Run only on Mondays)
        const today = new Date();
        if (today.getDay() === 1) { // 1 = Monday
            console.log('📅 It is Monday! Sending Weekly Analytics Nudge...');

            const workspaces = await prisma.workspace.findMany({
                include: {
                    members: {
                        where: { role: { in: ['owner', 'partner'] } }
                    }
                }
            });

            for (const ws of workspaces) {
                for (const partner of ws.members) {
                    await createNotification({
                        title: 'Weekly Analytics Ready',
                        message: 'Your weekly firm performance report is ready. Click to view analytics.',
                        recipientId: partner.userId,
                        recipientType: 'partner',
                        type: 'info',
                        priority: 'medium',
                    });
                }
            }
        }

        // 3. Compliance Monitoring
        console.log('🛡️ Checking Compliance Obligations...');
        const complianceTasks = await prisma.complianceTask.findMany({
            where: {
                status: { not: 'complied' }
            },
            include: {
                obligation: true,
            }
        });

        for (const task of complianceTasks) {
            const daysUntilDue = task.dueDate
                ? Math.ceil((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            // Reminder Logic
            if (daysUntilDue !== null) {
                if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 0) {
                    await notifyWorkspaceMembers({
                        workspaceId: task.workspaceId,
                        title: `Compliance Reminder: ${task.obligation.actionRequired}`,
                        message: `The ${task.obligation.tier} obligation "${task.obligation.actionRequired}" is due in ${daysUntilDue} days.`,
                        type: 'warning',
                        priority: daysUntilDue === 0 ? 'critical' : 'high',
                        roles: ['owner', 'partner'],
                        designations: ['Practice Manager', 'Head of Chambers']
                    });
                } else if (daysUntilDue < 0 && task.dueDate) {
                    // Escalation for overdue
                    await notifyWorkspaceMembers({
                        workspaceId: task.workspaceId,
                        title: `CRITICAL: Compliance Overdue`,
                        message: `OVERDUE: ${task.obligation.actionRequired} was due on ${task.dueDate.toLocaleDateString()}. Immediate action required.`,
                        type: 'critical',
                        priority: 'critical',
                        roles: ['owner', 'partner'],
                        designations: ['Principal Partner', 'Head of Chambers']
                    });
                }
            } else if (!task.acknowledgedAt) {
                // Generic nudge for unacknowledged tasks (Phase 1 logic)
                await notifyWorkspaceMembers({
                    workspaceId: task.workspaceId,
                    title: `Compliance Action Required`,
                    message: `New compliance obligation identified: ${task.obligation.actionRequired}. Please acknowledge and assign monitoring.`,
                    type: 'info',
                    priority: 'medium',
                    roles: ['owner', 'partner'],
                    designations: ['Practice Manager', 'Head of Chambers']
                });
            }
        }

        return NextResponse.json({ success: true, processed: pendingInvoices.length + complianceTasks.length });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
    }
}
