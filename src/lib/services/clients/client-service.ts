import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateClientInput {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    industry?: string | null;
    workspaceId: string;
}

export interface UpdateClientInput {
    name?: string;
    email?: string;
    phone?: string | null;
    company?: string | null;
    industry?: string | null;
    status?: string;
}

export interface ListClientsParams {
    page?: number;
    limit?: number;
    offset?: number;
    query?: string;
    status?: string;
    industry?: string;
    filter?: 'active_matters' | 'outstanding' | 'revenue';
}

export class ClientService {
    static buildSearchWhere(query: string): Prisma.ClientWhereInput {
        return {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
                { industry: { contains: query, mode: 'insensitive' } },
            ],
        };
    }

    static async list(workspaceId: string, params: ListClientsParams = {}) {
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const skip = params.offset ?? (page - 1) * limit;

        const where: Prisma.ClientWhereInput = { workspaceId, deletedAt: null };

        if (params.query) {
            where.OR = [
                { name: { contains: params.query, mode: 'insensitive' } },
                { email: { contains: params.query, mode: 'insensitive' } },
                { company: { contains: params.query, mode: 'insensitive' } },
            ];
        }
        if (params.status && params.status !== 'all') where.status = params.status;
        if (params.industry && params.industry !== 'all') where.industry = params.industry;
        if (params.filter === 'active_matters') where.matters = { some: { status: 'active' } };
        if (params.filter === 'outstanding') where.invoices = { some: { status: { in: ['pending', 'overdue'] } } };
        if (params.filter === 'revenue') where.payments = { some: {} };

        const [total, clients] = await prisma.$transaction([
            prisma.client.count({ where }),
            prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            matters: { where: { status: 'active', deletedAt: null } },
                            invoices: true,
                            payments: true,
                        },
                    },
                },
            }),
        ]);

        const data = clients.map(client => ({
            ...client,
            lastActivity: client.updatedAt > client.createdAt ? client.updatedAt : client.createdAt,
            activeMatters: client._count.matters,
        }));

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    static async getById(id: string, workspaceId?: string) {
        const where: Prisma.ClientWhereInput = workspaceId ? { id, workspaceId } : { id };

        return prisma.client.findFirst({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                industry: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                workspaceId: true,
                deletedAt: true,
                _count: {
                    select: {
                        matters: true,
                        invoices: true,
                        briefs: true,
                        payments: true,
                    },
                },
            },
        });
    }

    static async getMatters(clientId: string, workspaceId?: string) {
        return prisma.matter.findMany({
            where: { clientId, ...(workspaceId ? { workspaceId } : {}), deletedAt: null },
            include: {
                lawyers: {
                    include: { lawyer: { select: { name: true, email: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async getFinancialSummary(clientId: string) {
        const [billed, paid] = await Promise.all([
            prisma.invoice.aggregate({
                where: { clientId },
                _sum: { totalAmount: true },
            }),
            prisma.payment.aggregate({
                where: { clientId },
                _sum: { amount: true },
            }),
        ]);

        const totalBilled = (billed._sum.totalAmount as any) ?? new Prisma.Decimal(0);
        const totalPaid = (paid._sum.amount as any) ?? new Prisma.Decimal(0);
        const outstanding = new Prisma.Decimal(totalBilled).minus(new Prisma.Decimal(totalPaid));

        return {
            totalBilled: totalBilled instanceof Prisma.Decimal ? totalBilled.toNumber() : Number(totalBilled),
            totalPaid: totalPaid instanceof Prisma.Decimal ? totalPaid.toNumber() : Number(totalPaid),
            outstanding: outstanding.toNumber(),
        };
    }

    static async create(input: CreateClientInput) {
        const existing = await prisma.client.findUnique({ where: { email: input.email } });
        if (existing) return { success: false as const, error: 'A client with this email already exists' };

        const client = await prisma.client.create({
            data: {
                name: input.name,
                email: input.email,
                phone: input.phone ?? undefined,
                company: input.company ?? undefined,
                industry: input.industry ?? undefined,
                workspaceId: input.workspaceId,
                status: 'active',
            },
        });

        return { success: true as const, data: client };
    }

    static async update(id: string, patch: UpdateClientInput) {
        if (patch.email) {
            const dup = await prisma.client.findFirst({
                where: { email: patch.email, NOT: { id } },
            });
            if (dup) return { success: false as const, error: 'A client with this email already exists' };
        }

        const client = await prisma.client.update({ where: { id }, data: patch });
        return { success: true as const, data: client };
    }

    static async softDelete(id: string, workspaceId: string) {
        const client = await prisma.client.findFirst({
            where: { id, workspaceId },
            select: { name: true },
        });
        if (!client) return { success: false as const, error: 'Client not found' };

        await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
        return { success: true as const };
    }

    static async getStats(workspaceId: string) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalClients, activeClients, totalMatters, activeMatters,
            totalInvoices, paidInvoices, newClientsThisMonth,
            revenueData, outstandingTotals, paymentsOnPending, workspace,
        ] = await Promise.all([
            prisma.client.count({ where: { workspaceId } }),
            prisma.client.count({ where: { workspaceId, status: 'active' } }),
            prisma.matter.count({ where: { workspace: { id: workspaceId } } }),
            prisma.matter.count({ where: { workspace: { id: workspaceId }, status: 'active' } }),
            prisma.invoice.count({ where: { client: { workspaceId } } }),
            prisma.invoice.count({ where: { client: { workspaceId }, status: 'paid' } }),
            prisma.client.count({ where: { workspaceId, createdAt: { gte: startOfMonth } } }),
            prisma.payment.aggregate({ where: { client: { workspaceId } }, _sum: { amount: true } }),
            prisma.invoice.aggregate({ where: { client: { workspaceId }, status: { in: ['pending', 'overdue'] } }, _sum: { totalAmount: true } }),
            prisma.payment.aggregate({ where: { invoice: { status: { in: ['pending', 'overdue'] }, client: { workspaceId } } }, _sum: { amount: true } }),
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { revenuePin: true } }),
        ]);

        const totalRevenue = revenueData._sum.amount || new Prisma.Decimal(0);
        const outstandingAmount = new Prisma.Decimal(outstandingTotals._sum.totalAmount ?? 0)
            .minus(new Prisma.Decimal(paymentsOnPending._sum.amount ?? 0));
        const isLocked = !!workspace?.revenuePin;

        return {
            totalClients,
            activeClients,
            inactiveClients: totalClients - activeClients,
            totalMatters,
            activeMatters,
            newClientsThisMonth,
            totalInvoices,
            paidInvoices,
            pendingInvoices: totalInvoices - paidInvoices,
            totalRevenue: isLocked ? null : totalRevenue,
            outstandingAmount,
            isRevenueLocked: isLocked,
        };
    }

    static async search(workspaceId: string, query: string) {
        return prisma.client.findMany({
            where: {
                workspaceId,
                ...ClientService.buildSearchWhere(query),
            },
            include: { _count: { select: { matters: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}
