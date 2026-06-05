import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface InvoiceLineItem {
    description: string;
    amount: number;
    quantity: number;
    order: number;
}

export interface CreateInvoiceInput {
    clientId: string;
    matterId?: string | null;
    billToName: string;
    billToAddress?: string | null;
    billToCity?: string | null;
    billToState?: string | null;
    attentionTo?: string | null;
    notes?: string | null;
    dueDate?: Date | string | null;
    items: InvoiceLineItem[];
    vatRate: number;
    securityChargeRate: number;
}

export interface InvoiceTotals {
    subtotal: Prisma.Decimal;
    vatAmount: Prisma.Decimal;
    securityChargeAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
}

export class InvoiceService {
    static async generateNumber(workspaceId: string): Promise<string> {
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: {
                client: { workspaceId },
                invoiceNumber: { startsWith: `INV-${year}-` },
            },
        });
        return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    static calculateTotals(
        items: Pick<InvoiceLineItem, 'amount' | 'quantity'>[],
        vatRate: number,
        securityChargeRate: number
    ): InvoiceTotals {
        const subtotal = items.reduce(
            (sum, item) =>
                sum.plus(
                    new Prisma.Decimal(item.amount || 0).times(item.quantity || 1)
                ),
            new Prisma.Decimal(0)
        );
        const vatAmount = subtotal.times(new Prisma.Decimal(vatRate).dividedBy(100));
        const securityChargeAmount = subtotal.times(
            new Prisma.Decimal(securityChargeRate).dividedBy(100)
        );
        const totalAmount = subtotal.plus(vatAmount).plus(securityChargeAmount);
        return { subtotal, vatAmount, securityChargeAmount, totalAmount };
    }

    static async list(
        workspaceId: string,
        params?: { status?: string; clientId?: string; limit?: number; offset?: number }
    ) {
        const where: Prisma.InvoiceWhereInput = {
            client: { workspaceId },
        };
        if (params?.status) where.status = params.status;
        if (params?.clientId) where.clientId = params.clientId;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, email: true } },
                    matter: { select: { name: true, caseNumber: true } },
                    items: { orderBy: { order: 'asc' } },
                    payments: { select: { amount: true } },
                    _count: { select: { payments: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: params?.limit ?? 200,
                skip: params?.offset ?? 0,
            }),
            prisma.invoice.count({ where }),
        ]);

        return { invoices, total };
    }

    static async getById(id: string, workspaceId?: string) {
        const where: Prisma.InvoiceWhereInput = workspaceId
            ? { id, client: { workspaceId } }
            : { id };

        return prisma.invoice.findFirst({
            where,
            include: {
                client: true,
                matter: {
                    include: {
                        lawyers: {
                            include: {
                                lawyer: { select: { name: true, email: true } },
                            },
                        },
                    },
                },
                items: { orderBy: { order: 'asc' } },
                payments: { orderBy: { date: 'desc' } },
            },
        });
    }

    static async create(input: CreateInvoiceInput) {
        const client = await prisma.client.findUnique({
            where: { id: input.clientId },
            select: { workspaceId: true, name: true },
        });
        if (!client) return { success: false as const, error: 'Client not found' };

        const invoiceNumber = await InvoiceService.generateNumber(client.workspaceId);
        const { subtotal, vatAmount, securityChargeAmount, totalAmount } =
            InvoiceService.calculateTotals(input.items, input.vatRate, input.securityChargeRate);

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                clientId: input.clientId,
                matterId: input.matterId ?? undefined,
                billToName: input.billToName,
                billToAddress: input.billToAddress ?? undefined,
                billToCity: input.billToCity ?? undefined,
                billToState: input.billToState ?? undefined,
                attentionTo: input.attentionTo ?? undefined,
                notes: input.notes ?? undefined,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                vatRate: input.vatRate,
                vatAmount,
                securityChargeRate: input.securityChargeRate,
                securityChargeAmount,
                subtotal,
                totalAmount,
                status: 'pending',
                items: {
                    create: input.items.map(item => ({
                        description: item.description,
                        amount: item.amount,
                        quantity: item.quantity,
                        order: item.order,
                    })),
                },
            },
            include: {
                items: true,
                client: { select: { id: true, name: true, workspaceId: true } },
            },
        });

        return {
            success: true as const,
            data: invoice,
            workspaceId: client.workspaceId,
        };
    }

    static async updateStatus(
        id: string,
        status: 'pending' | 'paid' | 'overdue',
        workspaceId: string
    ) {
        const exists = await prisma.invoice.findFirst({
            where: { id, client: { workspaceId } },
            select: { id: true },
        });
        if (!exists) return { success: false as const, error: 'Invoice not found' };

        const updated = await prisma.invoice.update({ where: { id }, data: { status } });
        return { success: true as const, data: updated };
    }

    static async delete(id: string, workspaceId: string) {
        const invoice = await prisma.invoice.findFirst({
            where: { id, client: { workspaceId } },
            include: { _count: { select: { payments: true } } },
        });
        if (!invoice) return { success: false as const, error: 'Invoice not found' };
        if (invoice._count.payments > 0) {
            return {
                success: false as const,
                error: 'Cannot delete invoice with associated payments',
            };
        }

        await prisma.invoice.delete({ where: { id } });
        return { success: true as const };
    }

    static async getStats(workspaceId: string) {
        const [
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            overdueInvoices,
            billedData,
            paymentData,
        ] = await Promise.all([
            prisma.invoice.count({ where: { client: { workspaceId } } }),
            prisma.invoice.count({ where: { client: { workspaceId }, status: 'paid' } }),
            prisma.invoice.count({ where: { client: { workspaceId }, status: 'pending' } }),
            prisma.invoice.count({ where: { client: { workspaceId }, status: 'overdue' } }),
            prisma.invoice.aggregate({
                where: { client: { workspaceId } },
                _sum: { totalAmount: true },
            }),
            prisma.payment.aggregate({
                where: { client: { workspaceId } },
                _sum: { amount: true },
            }),
        ]);

        const totalBilled = (
            (billedData._sum.totalAmount as any) ?? new Prisma.Decimal(0)
        ).toNumber();
        const totalPaid = (
            (paymentData._sum.amount as any) ?? new Prisma.Decimal(0)
        ).toNumber();

        return {
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            overdueInvoices,
            totalBilled,
            totalPaid,
            totalOutstanding: totalBilled - totalPaid,
        };
    }

    static async getByClient(clientId: string) {
        const invoices = await prisma.invoice.findMany({
            where: { clientId },
            include: {
                items: { orderBy: { order: 'asc' } },
                payments: true,
                client: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return invoices.map(invoice => {
            const paidAmount = invoice.payments.reduce(
                (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)),
                new Prisma.Decimal(0)
            );
            return { ...invoice, paidAmount: paidAmount.toNumber() };
        });
    }

    static async getClientMatters(clientId: string) {
        return prisma.matter.findMany({
            where: { clientId, status: 'active', deletedAt: null },
            select: { id: true, name: true, caseNumber: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async recordPayment(
        invoiceId: string,
        workspaceId: string,
        data: { amount: number; method?: string; reference?: string; date?: Date | string }
    ) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, client: { workspaceId } },
            include: { client: true, payments: true },
        });
        if (!invoice) return { success: false as const, error: 'Invoice not found' };
        if (data.amount <= 0)
            return { success: false as const, error: 'Amount must be positive' };

        const payment = await prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                amount: data.amount,
                method: data.method ?? 'bank_transfer',
                reference: data.reference,
                date: data.date ? new Date(data.date) : new Date(),
            },
        });

        const prevPaid = invoice.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)),
            new Prisma.Decimal(0)
        );
        const totalPaid = prevPaid.plus(new Prisma.Decimal(data.amount));
        const outstanding = new Prisma.Decimal(invoice.totalAmount as any).minus(totalPaid);

        const newStatus = outstanding.lte(0) ? 'paid' : invoice.status;
        if (outstanding.lte(0)) {
            await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'paid' } });
        }

        return {
            success: true as const,
            data: {
                payment,
                totalPaid: totalPaid.toNumber(),
                outstandingAmount: outstanding.toNumber(),
                status: newStatus,
            },
        };
    }

    static async getPayments(invoiceId: string, workspaceId: string) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, client: { workspaceId } },
            include: { payments: { orderBy: { date: 'desc' } } },
        });
        if (!invoice) return null;

        const totalPaid = invoice.payments.reduce(
            (sum, p) => sum.plus(new Prisma.Decimal(p.amount as any)),
            new Prisma.Decimal(0)
        );

        return {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            totalPaid: totalPaid.toNumber(),
            outstanding: new Prisma.Decimal(invoice.totalAmount as any).minus(totalPaid).toNumber(),
            payments: invoice.payments,
        };
    }
}
