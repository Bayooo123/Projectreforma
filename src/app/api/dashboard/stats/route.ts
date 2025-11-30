import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const workspaceId = session.user.workspaceId;

        // Fetch recent briefs
        const recentBriefs = await prisma.brief.findMany({
            where: { workspaceId },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                status: true,
                updatedAt: true,
            }
        });

        // Fetch upcoming court dates
        const upcomingCourtDates = await prisma.matter.findMany({
            where: {
                workspaceId,
                nextCourtDate: {
                    gte: new Date(),
                }
            },
            take: 5,
            orderBy: { nextCourtDate: 'asc' },
            select: {
                id: true,
                name: true,
                caseNumber: true,
                nextCourtDate: true,
                court: true,
            }
        });

        // Fetch pending tasks (using Active Briefs as proxy for now since Task model doesn't exist)
        const pendingTasks = await prisma.brief.findMany({
            where: {
                workspaceId,
                status: 'active',
                dueDate: {
                    gte: new Date(),
                }
            },
            take: 5,
            orderBy: { dueDate: 'asc' },
            select: {
                id: true,
                name: true,
                dueDate: true,
                lawyer: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json({
            recentBriefs,
            upcomingCourtDates,
            pendingTasks
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
