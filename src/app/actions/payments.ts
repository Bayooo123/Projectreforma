'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// PAYMENT CRUD OPERATIONS
// ============================================

interface CreatePaymentData {
    clientId: string;
    invoiceId?: string;
    amount: number; // in kobo
    method: string; // 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'other'
    reference?: string;
    date?: Date;
    markAsFullyPaid?: boolean; // New flag for "Discount / Write-off"
}

export async function createPayment(data: CreatePaymentData) {
    try {
        // Verify client exists
        const client = await prisma.client.findUnique({
            where: { id: data.clientId },
            select: { id: true, workspaceId: true },
        });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        let invoiceBalance = 0;
        let invoiceToUpdate = null;

        // If invoice is specified, verify it belongs to this client and check balance
        if (data.invoiceId) {
            const invoice = await prisma.invoice.findUnique({
                where: { id: data.invoiceId },
                select: {
                    id: true,
                    clientId: true,
                    totalAmount: true,
                    status: true,
                    payments: {
                        select: { amount: true }
                    }
                },
            });

            if (!invoice) {
                return { success: false, error: 'Invoice not found' };
            }

            if (invoice.clientId !== data.clientId) {
                return { success: false, error: 'Invoice does not belong to this client' };
            }

            // Check if invoice is already paid
            if (invoice.status === 'paid') {
                return { success: false, error: 'Invoice is already marked as paid' };
            }

            const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            invoiceBalance = Math.max(0, invoice.totalAmount - paidAmount);
            invoiceToUpdate = invoice;
        }

        // Create main payment
        const payment = await prisma.payment.create({
            data: {
                clientId: data.clientId,
                invoiceId: data.invoiceId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                date: data.date || new Date(),
            },
            include: {
                client: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                invoice: {
                    select: {
                        invoiceNumber: true,
                        totalAmount: true,
                    },
                },
            },
        });

        // Handle "Mark as Fully Paid" logic (Discount/Write-off)
        if (data.invoiceId && data.markAsFullyPaid && invoiceToUpdate) {
            // Calculate remaining balance after the payment we just created
            // We calculated invoiceBalance BEFORE this payment.
            // Remaining after = invoiceBalance - data.amount
            const remainingBalance = invoiceBalance - data.amount;

            if (remainingBalance > 0) {
                // Create a "Discount" payment to zero out the balance
                await prisma.payment.create({
                    data: {
                        clientId: data.clientId,
                        invoiceId: data.invoiceId,
                        amount: remainingBalance,
                        method: 'other', // or 'discount' if we add it to enum/types
                        reference: 'Discount / Write-off [FULL SETTLEMENT]',
                        date: data.date || new Date(),
                    },
                });
            }
        }

        // If payment is linked to an invoice, check if invoice is now fully paid
        if (data.invoiceId) {
            await updateInvoicePaymentStatus(data.invoiceId);
        }

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        return { success: true, data: payment };
    } catch (error) {
        console.error('Error creating payment:', error);
        return { success: false, error: 'Failed to create payment' };
    }
}

// Helper function to update invoice status based on payments
async function updateInvoicePaymentStatus(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                payments: true,
            },
        });

        if (!invoice) return;

        // Calculate total paid
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

        // Update invoice status
        // Allow a small margin of error for floating point issues? (using integers/kobo so exact match expected)
        let newStatus = invoice.status;
        if (totalPaid >= invoice.totalAmount) {
            newStatus = 'paid';
        } else if (totalPaid > 0) {
            newStatus = 'pending'; // Partially paid
        }

        // Check if overdue
        if (newStatus !== 'paid' && invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
            newStatus = 'overdue';
        }

        if (newStatus !== invoice.status) {
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: newStatus },
            });
        }
    } catch (error) {
        console.error('Error updating invoice payment status:', error);
    }
}

export async function getPayments(workspaceId: string) {
    try {
        const payments = await prisma.payment.findMany({
            where: {
                client: {
                    workspaceId,
                },
            },
            include: {
                client: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                invoice: {
                    select: {
                        invoiceNumber: true,
                        totalAmount: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        return { success: true, data: payments };
    } catch (error) {
        console.error('Error fetching payments:', error);
        return { success: false, error: 'Failed to fetch payments' };
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
                        totalAmount: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        return { success: true, data: payments };
    } catch (error) {
        console.error('Error fetching client payments:', error);
        return { success: false, error: 'Failed to fetch payments' };
    }
}

export async function getPaymentsByInvoice(invoiceId: string) {
    try {
        const payments = await prisma.payment.findMany({
            where: { invoiceId },
            include: {
                client: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        return { success: true, data: payments };
    } catch (error) {
        console.error('Error fetching invoice payments:', error);
        return { success: false, error: 'Failed to fetch payments' };
    }
}

export async function deletePayment(id: string) {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id },
            select: { invoiceId: true },
        });

        if (!payment) {
            return { success: false, error: 'Payment not found' };
        }

        await prisma.payment.delete({
            where: { id },
        });

        // Update invoice status if payment was linked to an invoice
        if (payment.invoiceId) {
            await updateInvoicePaymentStatus(payment.invoiceId);
        }

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        return { success: true };
    } catch (error) {
        console.error('Error deleting payment:', error);
        return { success: false, error: 'Failed to delete payment' };
    }
}

// ============================================
// PAYMENT STATS & ANALYTICS
// ============================================

export async function getPaymentStats(workspaceId: string) {
    try {
        const [
            totalPayments,
            thisMonthPayments,
        ] = await Promise.all([
            prisma.payment.count({
                where: {
                    client: { workspaceId },
                },
            }),
            prisma.payment.count({
                where: {
                    client: { workspaceId },
                    date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);

        // Calculate total revenue (all payments)
        const totalRevenueData = await prisma.payment.aggregate({
            where: {
                client: { workspaceId },
            },
            _sum: {
                amount: true,
            },
        });

        // Calculate this month's revenue
        const thisMonthRevenueData = await prisma.payment.aggregate({
            where: {
                client: { workspaceId },
                date: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
            _sum: {
                amount: true,
            },
        });

        return {
            success: true,
            data: {
                totalPayments,
                thisMonthPayments,
                totalRevenue: totalRevenueData._sum.amount || 0,
                thisMonthRevenue: thisMonthRevenueData._sum.amount || 0,
            },
        };
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function getClientInvoices(clientId: string) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                clientId,
                status: { in: ['pending', 'overdue'] }, // Only unpaid invoices
            },
            select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                status: true,
                dueDate: true,
                payments: {
                    select: { amount: true }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const data = invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            totalAmount: inv.totalAmount,
            status: inv.status,
            dueDate: inv.dueDate,
            paidAmount: inv.payments.reduce((sum, p) => sum + p.amount, 0)
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}
