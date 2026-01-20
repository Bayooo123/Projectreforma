import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getMyBriefs } from "@/app/actions/dashboard";

export const dynamic = 'force-dynamic'; // Ensure real-time data

async function getDashboardData(userId: string, workspaceId: string) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // 1. Metrics
    const pendingTasksCount = await prisma.task.count({
        where: {
            assignedToId: userId,
            status: { not: 'completed' }
        }
    });

    const activeBriefsCount = await prisma.brief.count({
        where: {
            workspaceId: workspaceId,
            status: 'active'
        }
    });

    const upcomingHearingsCount = await prisma.matter.count({
        where: {
            lawyers: { some: { lawyerId: userId } },
            nextCourtDate: {
                gte: today,
                lte: nextWeek
            }
        }
    });

    // 2. Upcoming Hearings (List)
    const upcomingHearings = await prisma.matter.findMany({
        where: {
            lawyers: { some: { lawyerId: userId } },
            nextCourtDate: {
                gte: today
            }
        },
        orderBy: { nextCourtDate: 'asc' },
        take: 5,
        select: {
            id: true,
            caseNumber: true,
            name: true,
            court: true,
            judge: true,
            nextCourtDate: true
        }
    });

    // 3. Firm Pulse (Activity Logs)
    // Combine Matter and Brief logs
    const matterLogs = await prisma.matterActivityLog.findMany({
        where: {
            matter: { workspaceId: workspaceId }
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } },
            matter: { select: { name: true } }
        }
    });

    const briefLogs = await prisma.briefActivityLog.findMany({
        where: {
            brief: { workspaceId: workspaceId }
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true } }, // Note: BriefActivityLog.performedBy is nullable string or relation? 
            // Checking schema: performedBy String? // Null if system/email. 
            // Wait, schema says: user User? @relation(fields: [performedBy], references: [id])
            // So we can include user. 
            brief: { select: { name: true } }
        }
    });

    // Merge and Sort Logs
    const combinedLogs = [
        ...matterLogs.map(log => ({
            id: log.id,
            type: 'matter',
            activityType: log.activityType,
            description: log.description,
            performedBy: log.user?.name || 'System',
            timestamp: log.timestamp,
            entityName: log.matter.name
        })),
        ...briefLogs.map(log => ({
            id: log.id,
            type: 'brief',
            activityType: log.activityType,
            description: log.description,
            performedBy: log.user?.name || 'System', // Need to handle if performedBy is raw string or ID. 
            // Schema: performedBy String? (it holds the ID). 
            // If briefLogs.user is null, performedBy might be system.
            timestamp: log.timestamp,
            entityName: log.brief.name
        }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

    // 4. Tasks (For the widget)
    const tasks = await prisma.task.findMany({
        where: {
            workspaceId: workspaceId,
            // For the widget, we might want all workspace tasks or just assigned. 
            // The widget usually filters internally or shows appropriate view.
            // Let's fetch open tasks for the workspace for context.
            status: { not: 'completed' }
        },
        take: 50,
        orderBy: { dueDate: 'asc' },
        include: {
            assignedTo: { select: { id: true, name: true, image: true } },
            assignedBy: { select: { id: true, name: true, image: true } }
        }
    });

    const users = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true }
    }).then(members => members.map(m => m.user));


    return {
        metrics: {
            pendingTasks: pendingTasksCount,
            upcomingHearings: upcomingHearingsCount,
            activeBriefs: activeBriefsCount,
            monthlyRevenue: 0 // Placeholder
        },
        upcomingHearings,
        firmPulseLogs: combinedLogs,
        tasks,
        users,
        myBriefs: await getMyBriefs(5)
    };
}

export default async function ManagementPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    // We need workspace ID. 
    // Ideally user object has it or we fetch it.
    // Let's find the user's active workspace.
    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true }
    });

    if (!member) {
        // Handle no workspace case (maybe redirect to onboarding or join)
        return <div>No Workspace Found</div>;
    }

    const data = await getDashboardData(session.user.id, member.workspaceId);

    return <DashboardClient initialData={data} />;
}
