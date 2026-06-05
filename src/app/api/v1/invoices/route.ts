import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';
import { InvoiceService } from '@/lib/services/invoices/invoice-service';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/invoices
 * List invoices in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const clientId = searchParams.get('clientId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const { invoices, total } = await InvoiceService.list(auth!.workspaceId, {
            status,
            clientId,
            limit,
            offset,
        });

        const data = invoices.map(invoice => {
            const paidAmount = (invoice.payments ?? []).reduce(
                (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)),
                new Prisma.Decimal(0)
            );
            const totalAmount = new Prisma.Decimal(invoice.totalAmount as any);

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
                paidAmount: paidAmount.toNumber(),
                outstandingAmount: totalAmount.minus(paidAmount).toNumber(),
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

        if (!clientId)
            return errorResponse('VALIDATION_ERROR', 'Client ID is required', 400, 'clientId');
        if (!billToName)
            return errorResponse('VALIDATION_ERROR', 'Bill to name is required', 400, 'billToName');
        if (!items || !Array.isArray(items) || items.length === 0)
            return errorResponse('VALIDATION_ERROR', 'At least one line item is required', 400, 'items');

        // Verify client belongs to this workspace before delegating to service
        const client = await prisma.client.findFirst({
            where: { id: clientId, workspaceId: auth!.workspaceId },
            select: { id: true },
        });
        if (!client)
            return errorResponse('NOT_FOUND', 'Client not found in this workspace', 404, 'clientId');

        const result = await InvoiceService.create({
            clientId,
            matterId,
            billToName,
            billToAddress,
            billToCity,
            billToState,
            attentionTo,
            notes,
            dueDate,
            items,
            vatRate,
            securityChargeRate,
        });

        if (!result.success)
            return errorResponse('SERVER_ERROR', result.error, 500);

        return successResponse(result.data);
    } catch (err) {
        console.error('Error creating invoice:', err);
        return errorResponse('SERVER_ERROR', 'Failed to create invoice', 500);
    }
}
