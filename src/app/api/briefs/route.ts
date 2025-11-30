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
        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId: session.user.workspaceId,
            },
            include: {
                client: true,
                lawyer: true,
                matter: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(briefs);
    } catch (error) {
        console.error('Error fetching briefs:', error);
        return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, briefNumber, clientId, matterId, lawyerId, category, dueDate, description, status } = body;

        const brief = await prisma.brief.create({
            data: {
                workspaceId: session.user.workspaceId,
                name,
                briefNumber,
                clientId,
                matterId,
                lawyerId,
                category,
                dueDate: new Date(dueDate),
                description,
                status: status || 'active',
            },
        });

        return NextResponse.json(brief);
    } catch (error) {
        console.error('Error creating brief:', error);
        return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });
    }
}
