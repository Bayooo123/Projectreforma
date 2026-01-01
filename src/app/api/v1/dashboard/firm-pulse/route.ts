import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/dashboard/firm-pulse
 * Get recent activity feed
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        const workspaceId = auth!.workspaceId;

        // Fetch recent activities from multiple sources
        const [matterLogs, briefLogs, payments, invitations] = await Promise.all([
            // Matter activity logs
            prisma.matterActivityLog.findMany({
                where: {
                    matter: { workspaceId },
                },
                include: {
                    matter: { select: { name: true, caseNumber: true } },
                    performedBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            // Brief activity logs
            prisma.briefActivityLog.findMany({
                where: {
                    brief: { workspaceId },
                },
                include: {
                    brief: { select: { name: true, briefNumber: true } },
                    performedBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            // Recent payments
            prisma.payment.findMany({
                where: {
                    client: { workspaceId },
                },
                include: {
                    client: { select: { name: true } },
                    invoice: { select: { invoiceNumber: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            // Recent invitations
            prisma.invitation.findMany({
                where: { workspaceId },
                include: {
                    inviter: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
        ]);

        // Combine and format activities
        const activities: any[] = [];

        matterLogs.forEach(log => {
            activities.push({
                id: log.id,
                type: 'matter_activity',
                actor: log.performedBy?.name || 'System',
                action: log.action,
                target: log.matter.caseNumber,
                caseName: log.matter.name,
                timestamp: log.createdAt,
            });
        });

        briefLogs.forEach(log => {
            activities.push({
                id: log.id,
                type: 'brief_activity',
                actor: log.performedBy?.name || 'System',
                action: log.action,
                target: log.brief.briefNumber,
                caseName: log.brief.name,
                timestamp: log.createdAt,
            });
        });

        payments.forEach(payment => {
            activities.push({
                id: payment.id,
                type: 'payment_recorded',
                actor: 'System',
                action: `recorded payment of ₦${(payment.amount / 100).toLocaleString()}`,
                target: payment.invoice?.invoiceNumber || 'N/A',
                caseName: payment.client.name,
                timestamp: payment.createdAt,
            });
        });

        invitations.forEach(inv => {
            activities.push({
                id: inv.id,
                type: 'invitation_sent',
                actor: inv.inviter.name || 'System',
                action: `invited ${inv.email} as ${inv.role}`,
                target: inv.email,
                caseName: 'Team',
                timestamp: inv.createdAt,
            });
        });

        // Sort by timestamp and take the limit
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return successResponse(activities.slice(0, limit));

    } catch (err) {
        console.error('Error fetching firm pulse:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch activity feed', 500);
    }
}
