import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import type { PulseFirmStats, PulseUserStats } from '@/app/actions/pulse';

// Pure DB query — no auth. Caller must validate workspace membership first.
async function _getFirmStats(workspaceId: string): Promise<PulseFirmStats> {
    const fallback: PulseFirmStats = {
        activeBriefs: 0, activeBriefsDelta: 'No new this month',
        unbilledMatters: 0, unbilledAmount: '₦0',
        hearingsThisWeek: 0, nextHearingLabel: 'None scheduled',
        openEscalations: 0,
    };

    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);

        const [
            activeBriefs, newBriefsThisMonth, unbilledMatters,
            hearingsThisWeek, openEscalations, outstandingInvoices, nextHearing,
        ] = await Promise.all([
            prisma.brief.count({ where: { workspaceId, status: 'active', deletedAt: null } }),
            prisma.brief.count({ where: { workspaceId, status: 'active', deletedAt: null, createdAt: { gte: startOfMonth } } }),
            prisma.matter.count({ where: { workspaceId, status: { not: 'Closed' }, invoices: { none: { status: { in: ['sent', 'paid'] } } } } }),
            prisma.calendarEntry.count({ where: { date: { gte: today, lte: weekEnd }, matter: { workspaceId } } }),
            prisma.task.count({ where: { workspaceId, status: { not: 'completed' }, priority: { in: ['high', 'urgent'] }, dueDate: { lt: today } } }),
            prisma.invoice.aggregate({ where: { client: { workspaceId }, status: { in: ['sent', 'pending', 'overdue'] } }, _sum: { totalAmount: true } }),
            prisma.calendarEntry.findFirst({ where: { date: { gte: today }, matter: { workspaceId } }, orderBy: { date: 'asc' }, select: { date: true } }),
        ]);

        return {
            activeBriefs,
            activeBriefsDelta: newBriefsThisMonth > 0 ? `+${newBriefsThisMonth} this month` : 'No new this month',
            unbilledMatters,
            unbilledAmount: `₦${Number(outstandingInvoices._sum.totalAmount || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            hearingsThisWeek,
            nextHearingLabel: nextHearing
                ? nextHearing.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                : 'None scheduled',
            openEscalations,
        };
    } catch (e) {
        console.error('[PulseService] getFirmStats error:', e);
        return fallback;
    }
}

// Pure DB query — no auth. Caller must validate workspace membership first.
async function _getUserStats(workspaceId: string, userId: string): Promise<PulseUserStats> {
    const fallback: PulseUserStats = {
        myBriefs: 0, myBriefsSubLabel: 'None active',
        tasksOverdue: 0, myHearings: 0, unreadNotifications: 0,
    };

    try {
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);

        const [myBriefs, myBriefsAsPrimary, tasksOverdue, myHearings, unreadNotifications] = await Promise.all([
            prisma.brief.count({ where: { lawyerId: userId, status: 'active', deletedAt: null } }),
            prisma.brief.count({ where: { lawyerInChargeId: userId, status: 'active', deletedAt: null } }),
            prisma.task.count({ where: { assignedToId: userId, status: { not: 'completed' }, dueDate: { lt: today } } }),
            prisma.calendarEntry.count({ where: { date: { gte: today, lte: weekEnd }, appearances: { some: { id: userId } } } }),
            prisma.notification.count({ where: { recipientId: userId, status: 'unread' } }),
        ]);

        return {
            myBriefs,
            myBriefsSubLabel: myBriefsAsPrimary > 0 ? `Primary on ${myBriefsAsPrimary}` : 'Supporting role',
            tasksOverdue,
            myHearings,
            unreadNotifications,
        };
    } catch (e) {
        console.error('[PulseService] getUserStats error:', e);
        return fallback;
    }
}

export class PulseService {
    // Cached 60s — keyed by workspaceId. Safe: workspace data only, no user secrets.
    static getFirmStats = unstable_cache(
        _getFirmStats,
        ['pulse-firm-stats'],
        { revalidate: 60 }
    );

    // Cached 60s — keyed by workspaceId + userId (Next.js uses args as cache key).
    static getUserStats = unstable_cache(
        _getUserStats,
        ['pulse-user-stats'],
        { revalidate: 60 }
    );
}
