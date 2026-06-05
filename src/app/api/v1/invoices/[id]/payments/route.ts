import { NextRequest } from 'next/server';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';
import { InvoiceService } from '@/lib/services/invoices/invoice-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/invoices/:id/payments
 * Record a payment for an invoice
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner', 'associate'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only attorneys can record payments', 403);
    }

    try {
        const body = await request.json();
        const { amount, method, reference, date } = body;

        if (!amount || amount <= 0) {
            return errorResponse(
                'VALIDATION_ERROR',
                'Payment amount is required and must be positive',
                400,
                'amount'
            );
        }

        const result = await InvoiceService.recordPayment(id, auth!.workspaceId, {
            amount,
            method,
            reference,
            date,
        });

        if (!result.success) {
            if (result.error === 'Invoice not found') return notFoundResponse('Invoice');
            return errorResponse('SERVER_ERROR', result.error, 500);
        }

        const { payment, totalPaid, outstandingAmount, status } = result.data;

        return successResponse({
            payment: {
                id: payment.id,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                method: payment.method,
                reference: payment.reference,
                date: payment.date,
                createdAt: payment.createdAt,
            },
            invoice: {
                id,
                totalPaid,
                outstandingAmount,
                status,
            },
        });
    } catch (err) {
        console.error('Error recording payment:', err);
        return errorResponse('SERVER_ERROR', 'Failed to record payment', 500);
    }
}

/**
 * GET /api/v1/invoices/:id/payments
 * Get payment history for an invoice
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const result = await InvoiceService.getPayments(id, auth!.workspaceId);
        if (!result) return notFoundResponse('Invoice');
        return successResponse(result);
    } catch (err) {
        console.error('Error fetching payments:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch payments', 500);
    }
}
