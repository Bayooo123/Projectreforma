'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { logActivity } from '@/lib/log-activity';
import { InvoiceService } from '@/lib/services/invoices/invoice-service';

export type { InvoiceLineItem, CreateInvoiceInput } from '@/lib/services/invoices/invoice-service';

export async function generateInvoiceNumber(workspaceId: string): Promise<string> {
    return InvoiceService.generateNumber(workspaceId);
}

export async function createInvoice(data: Parameters<typeof InvoiceService.create>[0]) {
    try {
        const session = await auth();
        const result = await InvoiceService.create(data);
        if (!result.success) return result;

        const { data: invoice, workspaceId } = result;
        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');

        if (session?.user?.id) {
            logActivity({
                workspaceId,
                userId: session.user.id,
                resource: 'INVOICE',
                action: 'CREATED',
                resourceId: invoice.id,
                resourceName: invoice.invoiceNumber,
            }).catch(() => {});
        }

        try {
            const { createNotification } = await import('@/app/actions/notifications');
            const total = (invoice as any).totalAmount;
            const totalNum = typeof total?.toNumber === 'function' ? total.toNumber() : Number(total);
            await createNotification({
                workspaceId,
                title: 'New Invoice Issued',
                message: `Invoice #${invoice.invoiceNumber} for ${invoice.client.name} has been created. Total: ₦${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                type: 'info',
                priority: 'medium',
                recipients: { role: ['owner', 'partner'] },
                relatedInvoiceId: invoice.id,
            });
        } catch (e) {
            console.error('Notification error:', e);
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error creating invoice:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
    }
}

export async function getInvoices(workspaceId: string) {
    try {
        const { invoices } = await InvoiceService.list(workspaceId);
        return { success: true, data: invoices };
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}

export async function getInvoiceById(id: string) {
    try {
        const invoice = await InvoiceService.getById(id);
        if (!invoice) return { success: false, error: 'Invoice not found' };
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return { success: false, error: 'Failed to fetch invoice' };
    }
}

export async function updateInvoiceStatus(id: string, status: 'pending' | 'paid' | 'overdue') {
    try {
        const session = await auth();
        if (!session?.user?.workspaceId) return { success: false, error: 'Unauthorized' };

        const result = await InvoiceService.updateStatus(id, status, session.user.workspaceId);
        if (!result.success) return result;

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');
        return result;
    } catch (error) {
        console.error('Error updating invoice status:', error);
        return { success: false, error: 'Failed to update invoice status' };
    }
}

export async function deleteInvoice(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.workspaceId) return { success: false, error: 'Unauthorized' };

        const result = await InvoiceService.delete(id, session.user.workspaceId);
        if (!result.success) return result;

        revalidatePath('/management/clients');
        revalidatePath('/management/invoices');
        return { success: true };
    } catch (error) {
        console.error('Error deleting invoice:', error);
        return { success: false, error: 'Failed to delete invoice' };
    }
}

export async function getInvoiceStats(workspaceId: string) {
    try {
        const stats = await InvoiceService.getStats(workspaceId);
        return { success: true, data: stats };
    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

export async function getClientMatters(clientId: string) {
    try {
        const matters = await InvoiceService.getClientMatters(clientId);
        return { success: true, data: matters };
    } catch (error) {
        console.error('Error fetching client matters:', error);
        return { success: false, error: 'Failed to fetch matters' };
    }
}

export async function getClientInvoices(clientId: string) {
    try {
        const invoices = await InvoiceService.getByClient(clientId);
        return { success: true, data: invoices };
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}
