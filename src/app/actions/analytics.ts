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

    console.log(`[Analytics] Fetching metrics for Workspace: ${workspaceId}, Filter: ${filter}`);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const { startDate, endDate } = getDateRange(filter);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // 1. Revenue Metrics (Based on Payments)
    const payments = await prisma.payment.findMany({
        where: {
            client: { workspaceId },
            date: { gte: startDate, lte: endDate }
        },
        select: { amount: true }
    });

    const lastMonthPayments = await prisma.payment.findMany({
        where: {
            client: { workspaceId },
            date: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        select: { amount: true }
    });

    const thisMonthRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
        revenueGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
        revenueGrowth = 100;
    }

    // 2. Active Matters — case-insensitive closed/completed exclusion
    const activeMattersCount = await prisma.matter.count({
        where: {
            workspaceId,
            status: { notIn: ['closed', 'completed', 'archived'] }
        }
    });

    const newMattersThisMonth = await prisma.matter.count({
        where: {
            workspaceId,
            createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
    });

    // 3. Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            workspaceId,
            date: { gte: startDate, lte: endDate }
        },
        select: { amount: true }
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expenseCount = expenses.length;

    // 4. Pending Court Dates (next 7 days) — only type=COURT entries, starting from today
    const nextWeek = new Date(startOfToday);
    nextWeek.setDate(startOfToday.getDate() + 7);

    const pendingCourtDates = await prisma.calendarEntry.count({
        where: {
            matter: { workspaceId },
            type: 'COURT',
            date: { gte: startOfToday, lte: nextWeek }
        }
    });

    console.log(`[Analytics] Results - Revenue: ${thisMonthRevenue}, Matters: ${activeMattersCount}, Expenses: ${totalExpenses}, Court dates: ${pendingCourtDates}`);

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
            total: totalExpenses || 0,
            count: expenseCount || 0
        },
        courtDates: {
            upcoming: pendingCourtDates || 0
        }
    };
}

export async function getRevenueTrend(workspaceId: string) {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const payments = await prisma.payment.findMany({
        where: {
            client: { workspaceId },
            date: { gte: sixMonthsAgo }
        },
        select: { amount: true, date: true }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = new Map<string, number>();

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
                where: { status: { notIn: ['closed', 'completed', 'archived'] } }
            },
            invoices: {
                where: { date: { gte: startDate, lte: endDate } },
                select: { totalAmount: true, status: true }
            }
        }
    });

    const clientStats = clients.map(client => {
        const totalPaid = client.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)),
            new Prisma.Decimal(0)
        ).toNumber();

        const outstanding = client.invoices
            .filter(inv => {
                const s = (inv.status || '').toLowerCase();
                return s !== 'paid' && s !== 'partially_paid';
            })
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
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, email: true } } }
    });

    const memberIds = members.map(m => m.userId);
    const now = new Date();

    // Single query — fetch all past COURT entries in this workspace that have
    // at least one of the workspace members as Appearing Counsel
    const entries = await prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            date: { lte: now },
            matter: { workspaceId },
            appearances: { some: { id: { in: memberIds } } },
        },
        select: {
            matterId: true,
            court: true,
            matter: { select: { court: true } },
            appearances: { select: { id: true }, where: { id: { in: memberIds } } },
        },
    });

    // Aggregate per member in memory
    const statsMap = new Map<string, { name: string; appearances: number; caseIds: Set<string>; courts: Set<string> }>();
    for (const m of members) {
        statsMap.set(m.userId, {
            name: m.user.name || m.user.email || 'Unknown',
            appearances: 0,
            caseIds: new Set(),
            courts: new Set(),
        });
    }

    for (const entry of entries) {
        const court = entry.court || entry.matter?.court || null;
        for (const user of entry.appearances) {
            const stat = statsMap.get(user.id);
            if (!stat) continue;
            stat.appearances += 1;
            if (entry.matterId) stat.caseIds.add(entry.matterId);
            if (court) stat.courts.add(court);
        }
    }

    return Array.from(statsMap.values())
        .map(s => ({
            name: s.name,
            appearances: s.appearances,
            cases: s.caseIds.size,
            courts: s.courts.size,
            topCourt: Array.from(s.courts)[0] || 'N/A',
        }))
        .sort((a, b) => b.appearances - a.appearances)
        .slice(0, 5);
}

export async function getMatterDistribution(workspaceId: string) {
    const matters = await prisma.matter.findMany({
        where: { workspaceId },
        select: { status: true }
    });

    const counts: Record<string, number> = {};
    matters.forEach(m => {
        const status = m.status || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export async function getCourtVisits(workspaceId: string, filter: string = 'this-month') {
    const { startDate, endDate } = getDateRange(filter);

    // Only type=COURT entries; read court from CalendarEntry.court first, fall back to matter.court
    const courtDates = await prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            matter: { workspaceId },
            date: { gte: startDate, lte: endDate }
        },
        select: {
            court: true,
            matter: { select: { court: true } }
        }
    });

    const courtCounts: Record<string, number> = {};
    courtDates.forEach(cd => {
        const court = cd.court || cd.matter?.court || 'Unknown Court';
        courtCounts[court] = (courtCounts[court] || 0) + 1;
    });

    return Object.entries(courtCounts)
        .map(([court, count]) => ({ court, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

export async function getExpenseDistribution(workspaceId: string, filter: string = 'this-month') {
    const { startDate, endDate } = getDateRange(filter);

    const expenses = await prisma.expense.findMany({
        where: {
            workspaceId,
            date: { gte: startDate, lte: endDate }
        },
        select: { amount: true, category: true }
    });

    const distribution: Record<string, { amount: number, count: number }> = {};

    expenses.forEach(e => {
        const cat = e.category || 'MISCELLANEOUS';
        if (!distribution[cat]) distribution[cat] = { amount: 0, count: 0 };
        distribution[cat].amount += Number(e.amount || 0);
        distribution[cat].count += 1;
    });

    return Object.entries(distribution).map(([category, stats]) => ({
        category: category.replace(/_/g, ' '),
        amount: stats.amount,
        count: stats.count
    })).sort((a, b) => b.amount - a.amount);
}
