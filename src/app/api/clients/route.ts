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
        const clients = await prisma.client.findMany({
            where: {
                workspaceId: session.user.workspaceId,
            },
            include: {
                matters: {
                    select: {
                        id: true,
                        status: true,
                    }
                },
                invoices: {
                    select: {
                        totalAmount: true,
                        status: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Transform data to include computed fields
        const transformedClients = clients.map(client => ({
            ...client,
            matterCount: client.matters.length,
            activeMatterCount: client.matters.filter(m => m.status === 'active').length,
            totalBilled: client.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        }));

        return NextResponse.json(transformedClients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email, phone, company, industry } = body;

        const client = await prisma.client.create({
            data: {
                workspaceId: session.user.workspaceId,
                name,
                email,
                phone,
                company,
                industry,
                status: 'active',
            },
        });

        return NextResponse.json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
}
