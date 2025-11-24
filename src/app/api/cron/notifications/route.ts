import { NextResponse } from 'next/server';
import { runNotificationEngine, type Matter } from '@/lib/notificationEngine';

// This endpoint will be called by Vercel Cron or a scheduler
// For now, it uses mock data. In production, it will fetch from the database.

export async function GET(request: Request) {
    try {
        // TODO: Replace with actual database query
        // const matters = await prisma.matter.findMany({ where: { status: 'active' } });

        // Mock data for demonstration
        const mockMatters: Matter[] = [
            {
                id: '1',
                caseNumber: 'ID/1234/2025',
                name: 'State v. Johnson',
                clientId: 'client-1',
                assignedLawyerId: 'lawyer-1',
                court: 'High Court Lagos',
                status: 'active',
                nextCourtDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                lastActivityAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
                lastClientContact: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            },
            {
                id: '2',
                caseNumber: 'ID/5678/2025',
                name: 'TechCorp v. FirstBank',
                clientId: 'client-2',
                assignedLawyerId: 'lawyer-2',
                status: 'active',
                lastActivityAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago - CRITICAL
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
        ];

        // Run the notification engine
        const notifications = runNotificationEngine(mockMatters);

        // TODO: Save notifications to database
        // await prisma.notification.createMany({ data: notifications });

        // TODO: Send emails/SMS for high-priority notifications
        // for (const notif of notifications.filter(n => n.priority === 'critical' || n.priority === 'high')) {
        //   await sendEmail(notif);
        // }

        return NextResponse.json({
            success: true,
            notificationsGenerated: notifications.length,
            notifications: notifications.map(n => ({
                id: n.id,
                title: n.title,
                priority: n.priority,
                recipientId: n.recipientId,
            })),
        });
    } catch (error) {
        console.error('Notification engine error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to run notification engine' },
            { status: 500 }
        );
    }
}
