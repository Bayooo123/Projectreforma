import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clients/:id
 * Get a single client by ID with full details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const client = await prisma.client.findFirst({
            where: {
                id,
                workspaceId: auth!.workspaceId,
            },
            include: {
                matters: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        status: true,
                        nextCourtDate: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                briefs: {
                    select: {
                        id: true,
                        briefNumber: true,
                        name: true,
                        status: true,
                        category: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                invoices: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!client) {
            return notFoundResponse('Client');
        }

        // Calculate financial summary
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

        return successResponse({
            ...client,
            financialSummary: {
                totalBilled: billed._sum.totalAmount || 0,
                totalPaid: payments._sum.amount || 0,
                outstanding: (billed._sum.totalAmount || 0) - (payments._sum.amount || 0),
            },
        });

    } catch (err) {
        console.error('Error fetching client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch client', 500);
    }
}

/**
 * PATCH /api/v1/clients/:id
 * Update a client
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const existing = await prisma.client.findFirst({
            where: {
                id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!existing) {
            return notFoundResponse('Client');
        }

        const body = await request.json();
        const { name, email, phone, company, industry, status } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (company !== undefined) updateData.company = company;
        if (industry !== undefined) updateData.industry = industry;
        if (status !== undefined) updateData.status = status;

        const client = await prisma.client.update({
            where: { id },
            data: updateData,
        });

        return successResponse(client);

    } catch (err) {
        console.error('Error updating client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update client', 500);
    }
}

/**
 * DELETE /api/v1/clients/:id
 * Delete/archive a client
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete clients', 403);
    }

    try {
        const client = await prisma.client.findFirst({
            where: {
                id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!client) {
            return notFoundResponse('Client');
        }

        // Soft delete by archiving
        await prisma.client.update({
            where: { id },
            data: { status: 'archived' },
        });

        return successResponse({ archived: true });

    } catch (err) {
        console.error('Error deleting client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete client', 500);
    }
}
