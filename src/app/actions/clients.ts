'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';

// ============================================
// CLIENT CRUD OPERATIONS
// ============================================

export async function getClients(workspaceId: string) {
    await requireAuth();
    try {
        const clients = await prisma.client.findMany({
            where: {
                workspaceId,
            },
            include: {
                matters: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                invoices: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                    },
                },
                _count: {
                    select: {
                        matters: true,
                        invoices: true,
                        payments: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Calculate last activity for each client
        const clientsWithActivity = clients.map(client => {
            const lastActivity = client.matters.length > 0
                ? new Date() // Simplified - would calculate from matter updates
                : client.createdAt;

            return {
                ...client,
                lastActivity,
                activeMatters: client.matters.filter(m => m.status === 'active').length,
            };
        });

        return { success: true, data: clientsWithActivity };
    } catch (error) {
        console.error('Error fetching clients:', error);
        return { success: false, error: 'Failed to fetch clients' };
    }
}

export async function getClientById(id: string) {
    await requireAuth();
    try {
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                matters: {
                    include: {
                        assignedLawyer: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                invoices: {
                    include: {
                        payments: true,
                    },
                },
                payments: true,
                clientCommunications: {
                    include: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        sentAt: 'desc',
                    },
                },
            },
        });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        return { success: true, data: client };
    } catch (error) {
        console.error('Error fetching client:', error);
        return { success: false, error: 'Failed to fetch client' };
    }
}

interface CreateClientData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    industry?: string;
    workspaceId: string;
}

export async function createClient(data: CreateClientData) {
    await requireAuth();
    try {
        // Check if email already exists
        const existingClient = await prisma.client.findUnique({
            where: { email: data.email },
        });

        if (existingClient) {
            return { success: false, error: 'A client with this email already exists' };
        }

        const client = await prisma.client.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                company: data.company,
                industry: data.industry,
                workspaceId: data.workspaceId,
                status: 'active',
            },
        });

        revalidatePath('/management/clients');
        return { success: true, data: client };
    } catch (error) {
        console.error('Error creating client:', error);
        return { success: false, error: 'Failed to create client' };
    }
}

interface UpdateClientData {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    industry?: string;
    status?: string;
}

export async function updateClient(id: string, data: UpdateClientData) {
    await requireAuth();
    try {
        // If email is being updated, check for duplicates
        if (data.email) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    email: data.email,
                    NOT: { id },
                },
            });

            if (existingClient) {
                return { success: false, error: 'A client with this email already exists' };
            }
        }

        const client = await prisma.client.update({
            where: { id },
            data,
        });

        revalidatePath('/management/clients');
        return { success: true, data: client };
    } catch (error) {
        console.error('Error updating client:', error);
        return { success: false, error: 'Failed to update client' };
    }
}

export async function deleteClient(id: string) {
    await requireAuth();
    try {
        // Check if client has associated matters
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        matters: true,
                        invoices: true,
                    },
                },
            },
        });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        if (client._count.matters > 0 || client._count.invoices > 0) {
            return {
                success: false,
                error: 'Cannot delete client with associated matters or invoices. Please archive instead.'
            };
        }

        await prisma.client.delete({
            where: { id },
        });

        revalidatePath('/management/clients');
        return { success: true };
    } catch (error) {
        console.error('Error deleting client:', error);
        return { success: false, error: 'Failed to delete client' };
    }
}

// ============================================
// CLIENT STATS & ANALYTICS
// ============================================

export async function getClientStats(workspaceId: string) {
    await requireAuth();
    try {
        const [
            totalClients,
            activeClients,
            totalMatters,
            activeMatters,
            totalInvoices,
            paidInvoices,
        ] = await Promise.all([
            prisma.client.count({
                where: { workspaceId },
            }),
            prisma.client.count({
                where: {
                    workspaceId,
                    status: 'active',
                },
            }),
            prisma.matter.count({
                where: {
                    workspace: { id: workspaceId },
                },
            }),
            prisma.matter.count({
                where: {
                    workspace: { id: workspaceId },
                    status: 'active',
                },
            }),
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
        ]);

        // Calculate total revenue (from paid invoices)
        const revenueData = await prisma.invoice.aggregate({
            where: {
                client: { workspaceId },
                status: 'paid',
            },
            _sum: {
                totalAmount: true,
            },
        });

        const totalRevenue = revenueData._sum.totalAmount || 0;

        // Calculate outstanding amount (from pending invoices)
        const outstandingData = await prisma.invoice.aggregate({
            where: {
                client: { workspaceId },
                status: { in: ['pending', 'overdue'] },
            },
            _sum: {
                totalAmount: true,
            },
        });

        const outstandingAmount = outstandingData._sum.totalAmount || 0;

        return {
            success: true,
            data: {
                totalClients,
                activeClients,
                inactiveClients: totalClients - activeClients,
                totalMatters,
                activeMatters,
                totalInvoices,
                paidInvoices,
                pendingInvoices: totalInvoices - paidInvoices,
                totalRevenue,
                outstandingAmount,
            },
        };
    } catch (error) {
        console.error('Error fetching client stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

// ============================================
// SEARCH & FILTER
// ============================================

export async function searchClients(workspaceId: string, query: string) {
    await requireAuth();
    try {
        const clients = await prisma.client.findMany({
            where: {
                workspaceId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { company: { contains: query, mode: 'insensitive' } },
                    { industry: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: {
                _count: {
                    select: {
                        matters: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: clients };
    } catch (error) {
        console.error('Error searching clients:', error);
        return { success: false, error: 'Failed to search clients' };
    }
}

export async function filterClients(workspaceId: string, filters: {
    status?: string;
    industry?: string;
}) {
    await requireAuth();
    try {
        const where: any = { workspaceId };

        if (filters.status && filters.status !== 'all') {
            where.status = filters.status;
        }

        if (filters.industry && filters.industry !== 'all') {
            where.industry = filters.industry;
        }

        const clients = await prisma.client.findMany({
            where,
            include: {
                _count: {
                    select: {
                        matters: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: clients };
    } catch (error) {
        console.error('Error filtering clients:', error);
        return { success: false, error: 'Failed to filter clients' };
    }
}
