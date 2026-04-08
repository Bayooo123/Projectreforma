'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getDateRange(filter: string) {
    const today = new Date();
    let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    if (filter === 'this-quarter' || filter === 'last-quarter') {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), (quarter * 3), 1);
        endDate = new Date(today.getFullYear(), (quarter * 3) + 3, 0, 23, 59, 59, 999);
    } else if (filter === 'this-year') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filter === 'all-time') {
        startDate = new Date(2000, 0, 1);
        endDate = new Date(2100, 11, 31);
    }
    
    return { startDate, endDate };
}

export async function getAnalyticsMetrics(workspaceId: string, filter: string = 'this-month') {
    if (!workspaceId) return null;

    const today = new Date();
    const { startDate, endDate } = getDateRange(filter);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // 1. Revenue Metrics (Based on Payments)
    const thisMonthPayments = await prisma.payment.aggregate({
        where: {
            client: { workspaceId },
            date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
    });

    const lastMonthPayments = await prisma.payment.aggregate({
        where: {
            client: { workspaceId },
            date: {
                gte: startOfLastMonth,
                lte: endOfLastMonth
            }
        },
        _sum: { amount: true }
    });

    const thisMonthRevenueDecimal = (thisMonthPayments._sum.amount as any) || new Prisma.Decimal(0);
    const lastMonthRevenueDecimal = (lastMonthPayments._sum.amount as any) || new Prisma.Decimal(0);
    
    const thisMonthRevenue = typeof (thisMonthRevenueDecimal as any).toNumber === 'function' 
        ? (thisMonthRevenueDecimal as any).toNumber() 
        : Number(thisMonthRevenueDecimal);
        
    const lastMonthRevenue = typeof (lastMonthRevenueDecimal as any).toNumber === 'function' 
        ? (lastMonthRevenueDecimal as any).toNumber() 
        : Number(lastMonthRevenueDecimal);

    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
        revenueGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
        revenueGrowth = 100;
    }

    // 2. Active Matters
    const activeMattersCount = await prisma.matter.count({
        where: {
            workspaceId,
            status: { notIn: ['Closed', 'closed', 'Completed', 'completed'] }
        }
    });

    // New matters this month
    const newMattersThisMonth = await prisma.matter.count({
        where: {
            workspaceId,
            createdAt: { gte: startOfMonth }
        }
    });

    // 3. Expenses
    const thisMonthExpensesAgg = await prisma.expense.aggregate({
        where: {
            workspaceId,
            date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true },
        _count: { id: true }
    });

    const thisMonthExpensesRaw = (thisMonthExpensesAgg._sum.amount as any) || new Prisma.Decimal(0);
    const thisMonthExpenses = typeof (thisMonthExpensesRaw as any).toNumber === 'function' 
        ? (thisMonthExpensesRaw as any).toNumber() 
        : Number(thisMonthExpensesRaw);
    const expenseCount = thisMonthExpensesAgg._count.id || 0;

    // 4. Pending Court Dates (Next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const pendingCourtDates = await prisma.calendarEntry.count({
        where: {
            matter: { workspaceId },
            date: {
                gte: today,
                lte: nextWeek
            }
        }
    });

    return {
        revenue: {
            total: thisMonthRevenue || 0,
            lastMonth: lastMonthRevenue || 0,
            growth: revenueGrowth || 0
        },
        matters: {
            active: activeMattersCount || 0,
            newThisMonth: newMattersThisMonth || 0
        },
        expenses: {
            total: thisMonthExpenses || 0,
            count: expenseCount || 0
        },
        courtDates: {
            upcoming: pendingCourtDates || 0
        }
    };
}

export async function getRevenueTrend(workspaceId: string) {
    // Get last 6 months of revenue
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const payments = await prisma.payment.findMany({
        where: {
            client: { workspaceId },
            date: { gte: sixMonthsAgo }
        },
        select: {
            amount: true,
            date: true
        }
    });

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = new Map<string, number>();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = months[d.getMonth()];
        trendData.set(monthKey, 0);
    }

    payments.forEach(p => {
        const monthKey = months[p.date.getMonth()];
        if (trendData.has(monthKey)) {
            const currentAmount = trendData.get(monthKey) || 0;
            trendData.set(monthKey, currentAmount + (new Prisma.Decimal(p.amount).toNumber()));
        }
    });

    return Array.from(trendData.entries()).map(([month, amount]) => ({ 
        month, 
        amount: Math.max(0, amount) 
    }));
}

export async function getTopClients(workspaceId: string, filter: string = 'this-month', limit: number = 5) {
    const { startDate, endDate } = getDateRange(filter);

    // Top clients by total revenue (payments)
    const clients = await prisma.client.findMany({
        where: { workspaceId },
        select: {
            id: true,
            name: true,
            payments: {
                where: { date: { gte: startDate, lte: endDate } },
                select: { amount: true }
            },
            matters: {
                select: { id: true },
                where: { status: { not: 'Closed' } } // Active matters
            },
            invoices: {
                where: { date: { gte: startDate, lte: endDate } },
                select: { totalAmount: true, status: true } // For simplified outstanding calc
            }
        }
    });

    // Calculate totals in memory (efficient enough for < 1000 clients, otherwise use raw SQL)
    const clientStats = clients.map(client => {
        const totalPaid = client.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)), 
            new Prisma.Decimal(0)
        ).toNumber();

        // Simple outstanding logic: invoice total if not paid (Status based)
        const outstanding = client.invoices
            .filter(inv => inv.status !== 'PAID' && inv.status !== 'paid')
            .reduce(
                (sum, inv) => sum.plus(new Prisma.Decimal(inv.totalAmount as any)), 
                new Prisma.Decimal(0)
            ).toNumber();

        return {
            name: client.name || 'Unknown Client',
            totalRevenue: totalPaid || 0,
            activeMatters: client.matters?.length || 0,
            outstanding: outstanding || 0,
            status: outstanding > 0 ? (totalPaid > 0 ? 'PARTLY PAID' : 'UNPAID') : 'PAID'
        };
    });

    return clientStats
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
}

export async function getLawyerStats(workspaceId: string) {
    // Lawyer performance: Court appearances
    // 1. Get all users in workspace
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true }
    });

    // 2. Get appearances for each user
    const stats = await Promise.all(members.map(async (m) => {
        const appearances = await prisma.calendarEntry.count({
            where: {
                appearances: { some: { id: m.userId } }
            }
        });

        // Get distinct courts visited (heuristic)
        const visitedCourts = await prisma.calendarEntry.findMany({
            where: { appearances: { some: { id: m.userId } } },
            select: { matter: { select: { court: true } } },
            distinct: ['matterId'] // Approximation since distinct on relation field is tricky
        });

        // Count unique court names manually
        const courts = new Set(visitedCourts.map(vc => vc.matter?.court).filter(Boolean));

        return {
            name: m.user.name || m.user.email,
            appearances,
            courts: courts.size,
            topCourt: Array.from(courts)[0] || 'N/A'
        };
    }));

    return stats.sort((a, b) => b.appearances - a.appearances).slice(0, 5);
}

export async function getMatterDistribution(workspaceId: string) {
    // Status distribution
    const statusGroups = await prisma.matter.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { id: true }
    });

    // Formatting for Chart
    return statusGroups.map(g => ({
        status: g.status,
        count: g._count.id
    }));
}

export async function getCourtVisits(workspaceId: string, filter: string = 'this-month') {
    const { startDate, endDate } = getDateRange(filter);

    const visits = await prisma.calendarEntry.groupBy({
        by: ['matterId'], // Group by matter first to get to the court
        where: {
            matter: { workspaceId },
            date: { gte: startDate, lte: endDate }
        },
        _count: { id: true } // Just counting dates per matter
    });

    // We need the court name, which isn't in CourtDate but in Matter
    // groupBy doesn't support relation fields.
    // Fallback: findMany 
    const courtDates = await prisma.calendarEntry.findMany({
        where: {
            matter: { workspaceId },
            date: { gte: startDate, lte: endDate }
        },
        include: {
            matter: { select: { court: true } }
        }
    });

    const courtCounts: Record<string, number> = {};
    courtDates.forEach(cd => {
        const court = cd.matter?.court || 'Unknown Court';
        courtCounts[court] = (courtCounts[court] || 0) + 1;
    });

    return Object.entries(courtCounts)
        .map(([court, count]) => ({ court, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}
