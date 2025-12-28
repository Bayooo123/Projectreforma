'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface RecordPaymentData {
    invoiceId?: string;
    clientId: string;
    amount: number; // in kobo
    method: string;
    reference?: string;
    date?: Date;
}

export async function createPayment(data: RecordPaymentData) {
    try {
        // 1. Fetch Invoice to validate amount
        let invoice = null;
        if (data.invoiceId) {
            invoice = await prisma.invoice.findUnique({
                where: { id: data.invoiceId },
                include: { payments: true }
            });

            if (!invoice) {
                return { success: false, error: 'Invoice not found' };
            }

            const totalPaidSoFar = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const outstanding = invoice.totalAmount - totalPaidSoFar;

            // Allow 100 Naira buffer for small diffs or strict check? Strict for now.
            if (data.amount > outstanding + 1000) { // small buffer for weird float issues if any, but Int is safe.
                // Actually, if they want to overpay, maybe let them? But requirement says "No manual status toggling without payment logic" implying strict accounting.
                // Let's allow it but warn? No, block it prevents accounting errors.
                return { success: false, error: 'Payment amount exceeds outstanding balance' };
            }
        }

        // 2. Create Payment Record
        const payment = await prisma.payment.create({
            data: {
                invoiceId: data.invoiceId,
                clientId: data.clientId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                date: data.date || new Date(),
            },
        });

        // 3. Update Invoice Status if linked
        if (invoice && data.invoiceId) {
            const totalPaidSoFar = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const newTotalPaid = totalPaidSoFar + data.amount;
            let newStatus = 'pending';

            if (newTotalPaid >= invoice.totalAmount) {
                newStatus = 'paid';
            } else if (newTotalPaid > 0) {
                newStatus = 'partially_paid';
            }

            await prisma.invoice.update({
                where: { id: data.invoiceId },
                data: { status: newStatus },
            });
        }

        revalidatePath('/management/clients');

        // Notification: Payment Recorded
        try {
            // Calculate amount in real currency for display
            const displayAmount = (data.amount / 100).toLocaleString();

            const { createNotification } = await import('@/app/actions/notifications');
            await createNotification({
                workspaceId: (await prisma.client.findUnique({ where: { id: data.clientId }, select: { workspaceId: true } }))?.workspaceId || '',
                title: 'Payment Received',
                message: `Payment of ₦${displayAmount} received from ${invoice ? invoice.invoiceNumber : 'Client'} via ${data.method}.`,
                type: 'success',
                priority: 'high',
                recipients: { role: ['owner', 'partner'] },
                relatedPaymentId: payment.id,
                relatedInvoiceId: data.invoiceId
            });
        } catch (e) { console.error(e); }

        return { success: true, data: payment };
    } catch (error) {
        console.error('Error creating payment:', error);
        return { success: false, error: 'Failed to create payment' };
    }
}

export async function getPaymentsByClient(clientId: string) {
    try {
        const payments = await prisma.payment.findMany({
            where: { clientId },
            include: {
                invoice: {
                    select: {
                        invoiceNumber: true,
                        totalAmount: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: payments };
    } catch (error) {
        console.error('Error fetching payments:', error);
        return { success: false, error: 'Failed to fetch payments' };
    }
}

// Re-export getClientInvoices for convenience if PaymentModal uses it from here
// But better to update PaymentModal imports. 
// I will check PaymentModal imports again. It imports `getClientInvoices` from `@/app/actions/payments`.
// So I should probably add it here or re-export it.
import { getClientInvoices as getInvoicesFromAction } from './invoices';
export const getClientInvoices = getInvoicesFromAction;
