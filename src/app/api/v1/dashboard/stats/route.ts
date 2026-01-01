import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/dashboard/stats
 * Get dashboard statistics
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const workspaceId = auth!.workspaceId;
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [
            pendingTasks,
            upcomingCourtDates,
            activeBriefs,
            totalClients,
            totalMatters,
            monthlyPayments,
            outstandingInvoices,
            courtDatesThisWeek,
        ] = await Promise.all([
            // Pending tasks
            prisma.task.count({
                where: { workspaceId, status: { not: 'completed' } },
            }),
            // Court dates in next 30 days
            prisma.matter.count({
                where: {
                    workspaceId,
                    nextCourtDate: {
                        gte: today,
                        lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            // Active briefs
            prisma.brief.count({
                where: { workspaceId, status: 'active' },
            }),
            // Total clients
            prisma.client.count({
                where: { workspaceId, status: 'active' },
            }),
            // Total active matters
            prisma.matter.count({
                where: { workspaceId, status: 'active' },
            }),
            // This month's payments (revenue)
            prisma.payment.aggregate({
                where: {
                    client: { workspaceId },
                    date: { gte: startOfMonth },
                },
                _sum: { amount: true },
            }),
            // Outstanding invoices
            prisma.invoice.aggregate({
                where: {
                    client: { workspaceId },
                    status: { in: ['pending', 'overdue'] },
                },
                _sum: { totalAmount: true },
            }),
            // Court dates this week
            prisma.matter.findMany({
                where: {
                    workspaceId,
                    nextCourtDate: {
                        gte: today,
                        lte: endOfWeek,
                    },
                },
                select: {
                    nextCourtDate: true,
                },
            }),
        ]);

        // Group court dates by day
        const courtDatesByDay: Record<string, number> = {};
        courtDatesThisWeek.forEach(m => {
            if (m.nextCourtDate) {
                const day = m.nextCourtDate.toISOString().split('T')[0];
                courtDatesByDay[day] = (courtDatesByDay[day] || 0) + 1;
            }
        });

        // Calculate outstanding (total invoiced - total paid)
        const totalPaid = await prisma.payment.aggregate({
            where: { client: { workspaceId } },
            _sum: { amount: true },
        });

        const outstandingAmount = (outstandingInvoices._sum.totalAmount || 0) - (totalPaid._sum.amount || 0);

        return successResponse({
            pendingTasks,
            upcomingCourtDates,
            activeBriefs,
            totalClients,
            totalMatters,
            thisMonthRevenue: monthlyPayments._sum.amount || 0,
            outstandingAmount: Math.max(0, outstandingAmount),
            courtDatesThisWeek: Object.entries(courtDatesByDay).map(([date, count]) => ({
                date,
                count,
            })),
        });

    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch dashboard stats', 500);
    }
}
