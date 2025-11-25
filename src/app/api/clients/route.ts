import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        const clients = await prisma.client.findMany({
            where: { workspaceId },
            include: {
                _count: {
                    select: {
                        matters: true,
                        payments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, company, industry, workspaceId } = body;

        if (!name || !email || !workspaceId) {
            return NextResponse.json(
                { error: 'name, email, and workspaceId are required' },
                { status: 400 }
            );
        }

        const client = await prisma.client.create({
            data: {
                name,
                email,
                phone,
                company,
                industry,
                workspaceId,
            },
        });

        return NextResponse.json(client, { status: 201 });
    } catch (error) {
        console.error('Error creating client:', error);
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
}
