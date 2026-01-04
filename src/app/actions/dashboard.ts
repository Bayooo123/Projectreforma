'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMyBriefs(limit: number = 5) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await prisma.brief.findMany({
        where: {
            lawyerId: session.user.id,
            status: 'active'
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
            id: true,
            briefNumber: true,
            name: true,
            client: { select: { name: true } },
            dueDate: true,
            status: true,
            updatedAt: true
        }
    });
}

export async function getPendingTasks(limit: number = 5) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await prisma.task.findMany({
        where: {
            assignedToId: session.user.id,
            status: { not: 'completed' }
        },
        orderBy: { dueDate: 'asc' },
        take: limit,
        select: {
            id: true,
            title: true,
            dueDate: true,
            status: true,
            priority: true
        }
    });
}

export async function getCourtDates(days: number = 7) {
    const session = await auth();
    if (!session?.user?.id) return [];

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const matters = await prisma.matter.findMany({
        where: {
            assignedLawyerId: session.user.id,
            nextCourtDate: {
                gte: today,
                lte: futureDate
            }
        },
        orderBy: { nextCourtDate: 'asc' },
        select: {
            id: true,
            caseNumber: true,
            name: true,
            court: true,
            judge: true,
            nextCourtDate: true,
        }
    });

    return matters.map(m => ({
        id: m.id,
        date: m.nextCourtDate,
        caseName: m.name,
        courtLocation: m.court,
        judge: m.judge,
        hearingType: "Mention",
        time: m.nextCourtDate ? m.nextCourtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "09:00 AM"
    }));
}

export async function getOperationalMetrics(workspaceId: string) {
    if (!workspaceId) return { activeMatters: 0, hearingWeek: 0, invoicesOutstanding: 0, invoicesIssued: 0 };

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 14); // 2 weeks lookahead

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Run parallel queries
    const [activeMatters, hearingWeek, invoicesOutstanding, invoicesIssued] = await Promise.all([
        prisma.matter.count({ where: { workspaceId, status: { not: 'Closed' } } }),
        prisma.matter.count({
            where: {
                workspaceId,
                nextCourtDate: {
                    gte: today,
                    lte: nextWeek
                }
            }
        }),
        // FIX: Invoice doesn't have workspaceId, verified via Client
        prisma.invoice.count({
            where: {
                client: { workspaceId },
                status: { notIn: ['PAID', 'VOID', 'DRAFT'] }
            }
        }),
        prisma.invoice.count({
            where: {
                client: { workspaceId },
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        })
    ]);

    return {
        activeMatters,
        hearingWeek,
        invoicesOutstanding,
        invoicesIssued
    };
}

export async function getTodaysActivity(workspaceId: string) {
    if (!workspaceId) return [];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Court Appearances Today
    const courtMatters = await prisma.matter.findMany({
        where: {
            workspaceId,
            nextCourtDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        select: {
            id: true,
            name: true,
            caseNumber: true,
            court: true,
            judge: true,
            assignedLawyer: { select: { name: true } },
            proceduralStatus: true
        }
    });

    // 2. Deadlines / Briefs Due Today
    const dueBriefs = await prisma.brief.findMany({
        where: {
            workspaceId,
            dueDate: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: 'active'
        },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            assignedLawyer: { select: { name: true } }
        }
    });

    // Combine
    const activities = [
        ...courtMatters.map(m => ({
            id: m.id,
            type: 'court_appearance',
            title: `Appearing in ${m.court || 'Court'}`,
            subtitle: `${m.name} (${m.caseNumber})`,
            status: m.proceduralStatus || 'Scheduled',
            assignee: m.assignedLawyer?.name || 'Unassigned',
            time: '09:00 AM'
        })),
        ...dueBriefs.map(b => ({
            id: b.id,
            type: 'deadline',
            title: `Deadline: ${b.name}`,
            subtitle: `Brief ${b.briefNumber}`,
            status: 'Due Today',
            assignee: b.assignedLawyer?.name || 'Unassigned',
            time: '5:00 PM'
        }))
    ];

    return activities;
}

export async function getFirmPulse(limit: number = 20, workspaceId?: string) {
    if (!workspaceId) return [];

    // Fetch activities from Matters, Briefs, and Invitations
    const matterLogs = await prisma.matterActivityLog.findMany({
        where: { matter: { workspaceId } },
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } },
            matter: { select: { name: true } }
        }
    });

    const briefLogs = await prisma.briefActivityLog.findMany({
        where: { brief: { workspaceId } },
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } },
            brief: { select: { name: true } }
        }
    });

    // Fetch recent invoices - FIX: Filter by client.workspaceId
    const invoiceLogs = await prisma.invoice.findMany({
        where: { client: { workspaceId } },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            client: { select: { name: true } }
        }
    });

    // Fetch recent payments - FIX: Filter by client.workspaceId
    const paymentLogs = await prisma.payment.findMany({
        where: { client: { workspaceId } },
        take: limit,
        orderBy: { date: 'desc' },
        include: {
            invoice: {
                include: {
                    client: { select: { name: true } }
                }
            },
            client: { select: { name: true } }
        }
    });

    const allActivities: any[] = [
        ...matterLogs.map(l => ({
            id: l.id,
            type: 'matter',
            description: l.description,
            activityType: l.activityType, // Pass raw type for icon mapping
            timestamp: l.timestamp,
            performedBy: l.user?.name || 'System',
            entityName: l.matter.name
        })),
        ...briefLogs.map(l => ({
            id: l.id,
            type: 'brief',
            description: l.description,
            activityType: l.activityType,
            timestamp: l.timestamp,
            performedBy: l.user?.name || 'System',
            entityName: l.brief.name
        })),
        ...invoiceLogs.map(i => ({
            id: i.id,
            type: 'invoice',
            description: `Generated invoice #${i.invoiceNumber}`,
            activityType: 'document_created', // Map to something generic icon
            timestamp: i.createdAt,
            performedBy: 'Billing System',
            entityName: i.client.name
        })),
        ...paymentLogs.map(p => ({
            id: p.id,
            type: 'payment',
            description: `Recorded payment of ₦${(p.amount / 100).toLocaleString()}`,
            activityType: 'document_created', // Re-use doc/payment icon
            timestamp: p.date,
            performedBy: 'Billing System',
            entityName: p.client.name // Payment has clientId
        }))
    ];

    return allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
}

// Deprecated stub to satisfy any lingering imports
export async function getDashboardStats() {
    return { pendingTasks: 0, courtDates: 0, activeBriefs: 0 };
}
