'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMyBriefs(limit: number = 5) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const briefs = await prisma.brief.findMany({
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
            updatedAt: true // Added for "Last updated" calculation
        }
    });

    return briefs;
}

export async function getPendingTasks(limit: number = 5) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const tasks = await prisma.task.findMany({
        where: {
            assignedToId: session.user.id,
            status: { not: 'completed' }
        },
        orderBy: { dueDate: 'asc' }, // Urgent first
        take: limit,
        select: {
            id: true,
            title: true,
            dueDate: true,
            status: true,
            priority: true
        }
    });

    return tasks;
}

export async function getCourtDates(days: number = 7) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

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
        // Mocking 'time' and 'hearingType' as they aren't in schema yet, referencing "Mention" or "Hearing" could be added if schema allowed
        hearingType: "Mention",
        time: m.nextCourtDate ? m.nextCourtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "09:00 AM"
    }));
}

export async function getFirmPulse(limit: number = 10) {
    const session = await auth();
    if (!session?.user?.id) return [];

    // Fetch activities from Matters, Briefs, and Invitations
    // Note: In a real high-scale app, we'd have a unified Activity/Audit table. 
    // Here we query multiple sources and merge.

    const matterLogs = await prisma.matterActivityLog.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } },
            matter: { select: { name: true } }
        }
    });

    const briefLogs = await prisma.briefActivityLog.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } },
            brief: { select: { name: true } }
        }
    });

    // Fetch recent invitations sent
    const invitations = await prisma.invitation.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            inviter: { select: { name: true } },
            workspace: { select: { name: true } }
        }
    });

    // Fetch recent tasks (especially from email)
    const taskLogs = await prisma.task.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            assignedBy: { select: { name: true } }, // The "creator" (sender for emails)
            assignedTo: { select: { name: true } }
        }
    });

    // Merge and sort all activities
    const allActivities = [
        ...matterLogs.map(log => ({
            id: log.id,
            caseName: log.matter.name,
            person: log.user.name || 'Unknown',
            action: log.description,
            type: log.activityType,
            timestamp: log.timestamp,
            source: 'Matter'
        })),
        ...briefLogs.map(log => ({
            id: log.id,
            caseName: log.brief.name,
            person: log.user?.name || 'System',
            action: log.description,
            type: log.activityType,
            timestamp: log.timestamp,
            source: 'Brief'
        })),
        ...invitations.map(inv => ({
            id: inv.id,
            caseName: inv.workspace.name,
            person: inv.inviter.name || 'Unknown',
            action: `invited ${inv.email} as ${inv.role}`,
            type: 'invitation_sent',
            timestamp: inv.createdAt,
            source: 'Workspace'
        })),
        ...taskLogs.map(task => ({
            id: task.id,
            caseName: 'Task Manager',
            person: task.source === 'email' ? (task.sourceEmail || 'Email') : (task.assignedTo?.name || 'System'),
            action: task.title, // "📧 Email: Subject"
            type: task.source === 'email' ? 'email_received' : 'task_created',
            timestamp: task.createdAt,
            source: 'Task'
        }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);

    return allActivities;
}

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            pendingTasks: 0,
            courtDates: 0,
            activeBriefs: 0
        };
    }

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const [pendingTasks, courtDates, activeBriefs] = await Promise.all([
        prisma.task.count({
            where: {
                assignedToId: session.user.id,
                status: { not: 'completed' }
            }
        }),
        prisma.matter.count({
            where: {
                assignedLawyerId: session.user.id,
                nextCourtDate: {
                    gte: today,
                    lte: futureDate
                }
            }
        }),
        prisma.brief.count({
            where: {
                lawyerId: session.user.id,
                status: 'active'
            }
        })
    ]);

    return {
        pendingTasks,
        courtDates,
        activeBriefs
    };
}
