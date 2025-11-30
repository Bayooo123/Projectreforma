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
        const matters = await prisma.matter.findMany({
            where: {
                workspaceId: session.user.workspaceId,
            },
            include: {
                client: {
                    select: {
                        name: true,
                    }
                },
                assignedLawyer: {
                    select: {
                        name: true,
                    }
                },
                briefs: {
                    select: {
                        id: true,
                        name: true,
                        dueDate: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Transform data for calendar if needed
        const events = matters.map(matter => ({
            id: matter.id,
            title: matter.name, // Using name as title
            start: matter.nextCourtDate || matter.createdAt, // Use nextCourtDate if available
            end: matter.nextCourtDate || matter.createdAt,
            clientName: matter.client.name,
            lawyerName: matter.assignedLawyer?.name || 'Unassigned',
            status: matter.status,
            caseNumber: matter.caseNumber,
            court: matter.court,
            judge: matter.judge,
        }));

        return NextResponse.json(events);
    } catch (error) {
        console.error('Error fetching matters:', error);
        return NextResponse.json({ error: 'Failed to fetch matters' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, caseNumber, clientId, assignedLawyerId, court, judge, nextCourtDate, status } = body;

        const matter = await prisma.matter.create({
            data: {
                workspaceId: session.user.workspaceId,
                name,
                caseNumber,
                clientId,
                assignedLawyerId,
                court,
                judge,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : null,
                status: status || 'active',
            },
        });

        return NextResponse.json(matter);
    } catch (error) {
        console.error('Error creating matter:', error);
        return NextResponse.json({ error: 'Failed to create matter' }, { status: 500 });
    }
}
