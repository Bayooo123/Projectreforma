import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';
import { Prisma } from '@prisma/client';

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

    // Only owners/partners/associates can record payments
    if (!['owner', 'partner', 'associate'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only attorneys can record payments', 403);
    }

    try {
        // Find the invoice
        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
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
        const { amount, method, reference, date } = body;

        if (!amount || amount <= 0) {
            return errorResponse('VALIDATION_ERROR', 'Payment amount is required and must be positive', 400, 'amount');
        }

        // Create the payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                amount,
                method: method || 'bank_transfer',
                reference,
                date: date ? new Date(date) : new Date(),
            },
        });

        // Calculate new totals using Decimal for precision
        const totalPaidPrevious = invoice.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)), 
            new Prisma.Decimal(0)
        );
        const currentAmount = new Prisma.Decimal(amount || 0);
        const totalPaid = totalPaidPrevious.plus(currentAmount);
        const outstanding = new Prisma.Decimal(invoice.totalAmount as any).minus(totalPaid);

        // Update invoice status if fully paid
        let newStatus = invoice.status;
        if (outstanding.lte(0)) {
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
                method: payment.method,
                reference: payment.reference,
                date: payment.date,
                createdAt: payment.createdAt,
            },
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                paidAmount: totalPaid.toNumber(),
                outstandingAmount: outstanding.toNumber(),
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
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                id,
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

        const totalPaid = invoice.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)), 
            new Prisma.Decimal(0)
        );

        return successResponse({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            totalPaid: totalPaid.toNumber(),
            outstanding: new Prisma.Decimal(invoice.totalAmount as any).minus(totalPaid).toNumber(),
            payments: invoice.payments,
        });

    } catch (err) {
        console.error('Error fetching payments:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch payments', 500);
    }
}
