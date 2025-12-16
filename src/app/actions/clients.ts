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



        // Calculate total revenue (from actual payments, not just invoices)
        const revenueData = await prisma.payment.aggregate({
            where: {
                client: { workspaceId },
            },
            _sum: {
                amount: true,
            },
        });

        const totalRevenue = revenueData._sum.amount || 0;

        // Calculate outstanding amount (from pending/overdue invoices)
        // Ideally: (Sum of Pending Invoice Totals) - (Sum of Payments on Pending Invoices)
        // Simplified for now: Sum of totals of non-paid invoices.
        // Note: If a partial payment is made, invoice is 'pending'. 
        // We should subtract the paid amount on those invoices.
        // Let's stick to the previous implementation for outstanding for now to minimize risk, 
        // OR improve it. Let's improve it.

        const outstandingInvoices = await prisma.invoice.findMany({
            where: {
                client: { workspaceId },
                status: { in: ['pending', 'overdue'] },
            },
            include: {
                payments: {
                    select: { amount: true }
                }
            }
        });

        const outstandingAmount = outstandingInvoices.reduce((sum, invoice) => {
            const paid = invoice.payments.reduce((pSum, p) => pSum + p.amount, 0);
            return sum + (invoice.totalAmount - paid);
        }, 0);

        // Check if revenue pin is set
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { revenuePin: true }
        });

        const isLocked = !!workspace?.revenuePin;

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
                totalRevenue: isLocked ? null : totalRevenue, // Hide if locked
                outstandingAmount,
                isRevenueLocked: isLocked, // Flag for UI
            },
        };
    } catch (error) {
        console.error('Error fetching client stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

export async function validateRevenuePin(workspaceId: string, pin: string) {
    await requireAuth();
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { revenuePin: true }
        });

        if (!workspace || !workspace.revenuePin) {
            return { success: false, error: 'No PIN set' };
        }

        if (workspace.revenuePin === pin) {
            // Valid PIN. Return the revenue data.
            const revenueData = await prisma.payment.aggregate({
                where: {
                    client: { workspaceId },
                },
                _sum: {
                    amount: true,
                },
            });
            return { success: true, totalRevenue: revenueData._sum.amount || 0 };
        } else {
            return { success: false, error: 'Invalid PIN' };
        }
    } catch (error) {
        console.error('Error validating PIN:', error);
        return { success: false, error: 'Validation failed' };
    }
}

export async function setRevenuePin(workspaceId: string, pin: string) {
    await requireAuth();
    try {
        // Basic validation
        if (!/^\d{5}$/.test(pin)) {
            return { success: false, error: 'PIN must be exactly 5 digits' };
        }

        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { revenuePin: pin }
        });

        return { success: true };
    } catch (error) {
        console.error('Error setting PIN:', error);
        return { success: false, error: 'Failed to set PIN' };
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
