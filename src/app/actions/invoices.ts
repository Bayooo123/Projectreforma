'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// INVOICE CRUD OPERATIONS
// ============================================

export async function generateInvoiceNumber(workspaceId: string): Promise<string> {
    const year = new Date().getFullYear();

    // Get the count of invoices for this workspace this year
    const count = await prisma.invoice.count({
        where: {
            client: {
                workspaceId,
            },
            invoiceNumber: {
                startsWith: `INV-${year}-`,
            },
        },
    });

    // Generate invoice number: INV-YYYY-NNNN
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    return invoiceNumber;
}

interface InvoiceLineItem {
    description: string;
    amount: number;
    quantity: number;
    order: number;
}

interface CreateInvoiceData {
    clientId: string;
    matterId?: string;
    billToName: string;
    billToAddress?: string;
    billToCity?: string;
    billToState?: string;
    attentionTo?: string;
    notes?: string;
    dueDate?: Date;
    items: InvoiceLineItem[];
    vatRate: number;
    securityChargeRate: number;
}

export async function createInvoice(data: CreateInvoiceData) {
    try {
        // Get client to verify workspace
        const client = await prisma.client.findUnique({
            where: { id: data.clientId },
            select: { workspaceId: true, name: true },
        });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(client.workspaceId);

        // Calculate amounts
        const subtotal = data.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
        const vatAmount = Math.round(subtotal * (data.vatRate / 100));
        const securityChargeAmount = Math.round(subtotal * (data.securityChargeRate / 100));
        const totalAmount = subtotal + vatAmount + securityChargeAmount;

        // Create invoice with line items
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                clientId: data.clientId,
                matterId: data.matterId,
                billToName: data.billToName,
                billToAddress: data.billToAddress,
                billToCity: data.billToCity,
                billToState: data.billToState,
                attentionTo: data.attentionTo,
                notes: data.notes,
                dueDate: data.dueDate,
                vatRate: data.vatRate,
                vatAmount,
                securityChargeRate: data.securityChargeRate,
                securityChargeAmount,
                subtotal,
                totalAmount,
                status: 'pending',
                items: {
                    create: data.items.map(item => ({
                        description: item.description,
                        amount: item.amount,
                        quantity: item.quantity,
                        order: item.order,
                    })),
                },
            },
            include: {
                items: true,
                client: true,
            },
        });

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        // Notification: New Invoice Created
        try {
            const { createNotification } = await import('@/app/actions/notifications');
            await createNotification({
                workspaceId: client.workspaceId,
                title: 'New Invoice Issued',
                message: `Invoice #${invoiceNumber} for ${client.name} has been created. Total: ₦${(totalAmount / 100).toLocaleString()}`,
                type: 'info',
                priority: 'medium',
                recipients: { role: ['owner', 'partner'] },
                relatedInvoiceId: invoice.id
            });
        } catch (e) {
            console.error('Notification error:', e);
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error creating invoice:', error);
        return { success: false, error: 'Failed to create invoice' };
    }
}

export async function getInvoices(workspaceId: string) {
    try {
        const invoices = await prisma.invoice.findMany({
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
                matter: {
                    select: {
                        name: true,
                        caseNumber: true,
                    },
                },
                items: {
                    orderBy: {
                        order: 'asc',
                    },
                },
                payments: true,
                _count: {
                    select: {
                        payments: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: invoices };
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}

export async function getInvoiceById(id: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                client: true,
                matter: {
                    include: {
                        assignedLawyer: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                items: {
                    orderBy: {
                        order: 'asc',
                    },
                },
                payments: {
                    orderBy: {
                        date: 'desc',
                    },
                },
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return { success: false, error: 'Failed to fetch invoice' };
    }
}

export async function updateInvoiceStatus(id: string, status: 'pending' | 'paid' | 'overdue') {
    try {
        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status },
        });

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error updating invoice status:', error);
        return { success: false, error: 'Failed to update invoice status' };
    }
}

export async function deleteInvoice(id: string) {
    try {
        // Check if invoice has payments
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        payments: true,
                    },
                },
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        if (invoice._count.payments > 0) {
            return {
                success: false,
                error: 'Cannot delete invoice with associated payments',
            };
        }

        await prisma.invoice.delete({
            where: { id },
        });

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        return { success: true };
    } catch (error) {
        console.error('Error deleting invoice:', error);
        return { success: false, error: 'Failed to delete invoice' };
    }
}

// ============================================
// INVOICE STATS & ANALYTICS
// ============================================

export async function getInvoiceStats(workspaceId: string) {
    try {
        const [
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            overdueInvoices,
        ] = await Promise.all([
            prisma.invoice.count({
                where: {
                    client: { workspaceId },
                },
            }),
            prisma.invoice.count({
                where: {
                    client: { workspaceId },
                    status: 'paid',
                },
            }),
            prisma.invoice.count({
                where: {
                    client: { workspaceId },
                    status: 'pending',
                },
            }),
            prisma.invoice.count({
                where: {
                    client: { workspaceId },
                    status: 'overdue',
                },
            }),
        ]);

        // Calculate total billed (Invoices)
        const billedData = await prisma.invoice.aggregate({
            where: {
                client: { workspaceId },
            },
            _sum: {
                totalAmount: true,
            },
        });

        // Calculate total paid (Actual Payments)
        const paymentData = await prisma.payment.aggregate({
            where: {
                client: { workspaceId },
            },
            _sum: {
                amount: true, // Summing actual payments
            },
        });

        const totalBilled = billedData._sum.totalAmount || 0;
        const totalPaid = paymentData._sum.amount || 0;
        const totalOutstanding = totalBilled - totalPaid;

        return {
            success: true,
            data: {
                totalInvoices,
                paidInvoices,
                pendingInvoices,
                overdueInvoices,
                totalBilled,
                totalPaid, // REVENUE
                totalOutstanding,
            },
        };
    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function getClientMatters(clientId: string) {
    try {
        const matters = await prisma.matter.findMany({
            where: {
                clientId,
                status: 'active',
            },
            select: {
                id: true,
                name: true,
                caseNumber: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: matters };
    } catch (error) {
        console.error('Error fetching client matters:', error);
        return { success: false, error: 'Failed to fetch matters' };
    }
}

export async function getClientInvoices(clientId: string) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                clientId,
            },
            include: {
                items: {
                    orderBy: {
                        order: 'asc',
                    },
                },
                payments: true,
                client: {
                    select: {
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Calculate paidAmount for each invoice
        const invoicesWithPaidAmount = invoices.map(invoice => {
            const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
                ...invoice,
                paidAmount,
            };
        });

        return { success: true, data: invoicesWithPaidAmount };
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}
