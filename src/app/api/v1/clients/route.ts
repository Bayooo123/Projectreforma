import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clients
 * List clients in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const where: any = {
            workspaceId: auth!.workspaceId,
        };

        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                include: {
                    _count: {
                        select: { matters: true, briefs: true, invoices: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.client.count({ where }),
        ]);

        // Calculate totals for each client
        const data = await Promise.all(clients.map(async (client) => {
            const [billed, payments] = await Promise.all([
                prisma.invoice.aggregate({
                    where: { clientId: client.id },
                    _sum: { totalAmount: true },
                }),
                prisma.payment.aggregate({
                    where: { clientId: client.id },
                    _sum: { amount: true },
                }),
            ]);

            return {
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                company: client.company,
                industry: client.industry,
                status: client.status,
                mattersCount: client._count.matters,
                briefsCount: client._count.briefs,
                totalBilled: billed._sum.totalAmount || 0,
                totalPaid: payments._sum.amount || 0,
                createdAt: client.createdAt,
            };
        }));

        return successResponse(data, { total, limit, offset });

    } catch (err) {
        console.error('Error fetching clients:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch clients', 500);
    }
}

/**
 * POST /api/v1/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const body = await request.json();
        const { name, email, phone, company, industry } = body;

        if (!name) {
            return errorResponse('VALIDATION_ERROR', 'Client name is required', 400, 'name');
        }

        const client = await prisma.client.create({
            data: {
                name,
                email,
                phone,
                company,
                industry,
                status: 'active',
                workspaceId: auth!.workspaceId,
            },
        });

        return successResponse(client);

    } catch (err: any) {
        console.error('Error creating client:', err);
        if (err.code === 'P2002') {
            return errorResponse('VALIDATION_ERROR', 'Client with this email already exists', 400, 'email');
        }
        return errorResponse('SERVER_ERROR', 'Failed to create client', 500);
    }
}
