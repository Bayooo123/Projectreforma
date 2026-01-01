import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/invoices/:id/payments
 * Record a payment for an invoice
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    // Only owners/partners/associates can record payments
    if (!['owner', 'partner', 'associate'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only attorneys can record payments', 403);
    }

    try {
        // Find the invoice
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: params.id,
                client: { workspaceId: auth!.workspaceId },
            },
            include: {
                client: true,
                payments: true,
            },
        });

        if (!invoice) {
            return notFoundResponse('Invoice');
        }

        const body = await request.json();
        const { amount, paymentMethod, reference, date, notes } = body;

        if (!amount || amount <= 0) {
            return errorResponse('VALIDATION_ERROR', 'Payment amount is required and must be positive', 400, 'amount');
        }

        // Create the payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                amount,
                paymentMethod,
                reference,
                date: date ? new Date(date) : new Date(),
                notes,
            },
        });

        // Calculate new totals
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
        const outstanding = invoice.totalAmount - totalPaid;

        // Update invoice status if fully paid
        let newStatus = invoice.status;
        if (outstanding <= 0) {
            newStatus = 'paid';
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'paid' },
            });
        }

        return successResponse({
            payment: {
                id: payment.id,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                reference: payment.reference,
                date: payment.date,
                notes: payment.notes,
                createdAt: payment.createdAt,
            },
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                paidAmount: totalPaid,
                outstandingAmount: outstanding,
                status: newStatus,
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
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: params.id,
                client: { workspaceId: auth!.workspaceId },
            },
            include: {
                payments: {
                    orderBy: { date: 'desc' },
                },
            },
        });

        if (!invoice) {
            return notFoundResponse('Invoice');
        }

        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

        return successResponse({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            totalPaid,
            outstanding: invoice.totalAmount - totalPaid,
            payments: invoice.payments,
        });

    } catch (err) {
        console.error('Error fetching payments:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch payments', 500);
    }
}
