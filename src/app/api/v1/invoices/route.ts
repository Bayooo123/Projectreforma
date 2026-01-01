import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/invoices
 * List invoices in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const where: any = {
            client: { workspaceId: auth!.workspaceId },
        };

        if (status) where.status = status;
        if (clientId) where.clientId = clientId;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true } },
                    payments: { select: { amount: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.invoice.count({ where }),
        ]);

        const data = invoices.map(invoice => {
            const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                clientId: invoice.clientId,
                clientName: invoice.client.name,
                billToName: invoice.billToName,
                subtotal: invoice.subtotal,
                vatAmount: invoice.vatAmount,
                securityChargeAmount: invoice.securityChargeAmount,
                totalAmount: invoice.totalAmount,
                paidAmount,
                outstandingAmount: invoice.totalAmount - paidAmount,
                status: invoice.status,
                dueDate: invoice.dueDate,
                createdAt: invoice.createdAt,
            };
        });

        return successResponse(data, { total, limit, offset });

    } catch (err) {
        console.error('Error fetching invoices:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch invoices', 500);
    }
}

/**
 * POST /api/v1/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    // Only owners/partners/associates can create invoices
    if (!['owner', 'partner', 'associate'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only attorneys can create invoices', 403);
    }

    try {
        const body = await request.json();
        const {
            clientId,
            matterId,
            billToName,
            billToAddress,
            billToCity,
            billToState,
            attentionTo,
            dueDate,
            notes,
            items,
            vatRate = 7.5,
            securityChargeRate = 1.0,
        } = body;

        if (!clientId) {
            return errorResponse('VALIDATION_ERROR', 'Client ID is required', 400, 'clientId');
        }
        if (!billToName) {
            return errorResponse('VALIDATION_ERROR', 'Bill to name is required', 400, 'billToName');
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return errorResponse('VALIDATION_ERROR', 'At least one line item is required', 400, 'items');
        }

        // Verify client belongs to workspace
        const client = await prisma.client.findFirst({
            where: { id: clientId, workspaceId: auth!.workspaceId },
        });

        if (!client) {
            return errorResponse('NOT_FOUND', 'Client not found in this workspace', 404, 'clientId');
        }

        // Generate invoice number
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: {
                client: { workspaceId: auth!.workspaceId },
                invoiceNumber: { startsWith: `INV-${year}-` },
            },
        });
        const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

        // Calculate amounts
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount * item.quantity), 0);
        const vatAmount = Math.round(subtotal * (vatRate / 100));
        const securityChargeAmount = Math.round(subtotal * (securityChargeRate / 100));
        const totalAmount = subtotal + vatAmount + securityChargeAmount;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                clientId,
                matterId,
                billToName,
                billToAddress,
                billToCity,
                billToState,
                attentionTo,
                notes,
                dueDate: dueDate ? new Date(dueDate) : null,
                vatRate,
                vatAmount,
                securityChargeRate,
                securityChargeAmount,
                subtotal,
                totalAmount,
                status: 'pending',
                items: {
                    create: items.map((item: any, index: number) => ({
                        description: item.description,
                        amount: item.amount,
                        quantity: item.quantity || 1,
                        order: index,
                    })),
                },
            },
            include: {
                client: { select: { id: true, name: true } },
                items: true,
            },
        });

        return successResponse(invoice);

    } catch (err) {
        console.error('Error creating invoice:', err);
        return errorResponse('SERVER_ERROR', 'Failed to create invoice', 500);
    }
}
