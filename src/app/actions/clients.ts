'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@/lib/auth-utils';
import { logActivity } from '@/lib/log-activity';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyTitleCaseToFields } from '@/lib/sentence-case';
import { notifyWorkspace } from '@/lib/notifications';
import { ClientService } from '@/lib/services/clients/client-service';
import { assertWorkspaceMember } from '@/lib/workspace-guard';
import { canManageWorkspacePins, checkWorkspacePin, hashPin, PIN_CHECK_ERRORS } from '@/lib/workspace-pins';

export type GetClientsParams = {
    page?: number;
    limit?: number;
    query?: string;
    status?: string;
    industry?: string;
    filter?: string;
};

export async function getClients(workspaceId: string, params: GetClientsParams = {}) {
    await requireAuth();
    try {
        const result = await ClientService.list(workspaceId, params as any);
        return { success: true, data: result.data, meta: result.meta };
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
                        lawyers: {
                            include: { lawyer: { select: { name: true, email: true } } },
                        },
                    },
                },
                invoices: { include: { payments: true } },
                payments: true,
                clientCommunications: {
                    include: { user: { select: { name: true } } },
                    orderBy: { sentAt: 'desc' },
                },
            },
        });
        if (!client) return { success: false, error: 'Client not found' };
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
    data = applyTitleCaseToFields(data, ['name', 'company']);
    try {
        const result = await ClientService.create(data);
        if (!result.success) return result;

        await notifyWorkspace({
            workspaceId: data.workspaceId,
            title: 'New client added',
            message: `${result.data.name}${result.data.company ? ` (${result.data.company})` : ''} has been onboarded as a client.`,
            type: 'success',
            priority: 'low',
            recipients: { role: ['owner', 'partner', 'admin'] },
        }).catch(() => {});

        revalidatePath('/management/clients');
        return { success: true, data: result.data };
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
    data = applyTitleCaseToFields(data, ['name', 'company']);
    try {
        const result = await ClientService.update(id, data);
        if (!result.success) return result;

        revalidatePath('/management/clients');
        return { success: true, data: result.data };
    } catch (error) {
        console.error('Error updating client:', error);
        return { success: false, error: 'Failed to update client' };
    }
}

export async function deleteClient(id: string) {
    const session = await requireAuth();
    try {
        const client = await prisma.client.findUnique({
            where: { id },
            select: { workspaceId: true, name: true },
        });
        if (!client) return { success: false, error: 'Client not found' };

        await requirePermission(client.workspaceId, 'DELETE_CLIENT');

        const result = await ClientService.softDelete(id, client.workspaceId);
        if (!result.success) return result;

        logActivity({ workspaceId: client.workspaceId, userId: session.id!, resource: 'CLIENT', action: 'DELETED', resourceId: id, resourceName: client.name }).catch(() => {});
        revalidatePath('/management/clients');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting client:', error);
        return { success: false, error: error.message || 'Failed to delete client' };
    }
}

export async function getClientStats(workspaceId: string) {
    await requireAuth();
    try {
        const stats = await ClientService.getStats(workspaceId);
        return { success: true, data: stats };
    } catch (error) {
        console.error('Error fetching client stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

export async function validateRevenuePin(workspaceId: string, pin: string) {
    await requireAuth();
    try {
        const userId = await assertWorkspaceMember(workspaceId);
        const result = await checkWorkspacePin(workspaceId, 'revenuePin', pin, userId);
        if (result !== 'valid') return { success: false, error: PIN_CHECK_ERRORS[result] };

        const revenueData = await prisma.payment.aggregate({
            where: { client: { workspaceId } },
            _sum: { amount: true },
        });
        return { success: true, totalRevenue: revenueData._sum.amount || new Prisma.Decimal(0) };
    } catch (error) {
        console.error('Error validating PIN:', error);
        return { success: false, error: 'Validation failed' };
    }
}

export async function setRevenuePin(workspaceId: string, pin: string) {
    await requireAuth();
    try {
        const userId = await assertWorkspaceMember(workspaceId);
        if (!(await canManageWorkspacePins(workspaceId, userId))) {
            return { success: false, error: 'Only the owner, Practice Manager, or Head of Chamber and above can set this PIN' };
        }
        if (!/^\d{5}$/.test(pin)) return { success: false, error: 'PIN must be exactly 5 digits' };
        await prisma.workspace.update({ where: { id: workspaceId }, data: { revenuePin: await hashPin(pin) } });
        return { success: true };
    } catch (error) {
        console.error('Error setting PIN:', error);
        return { success: false, error: 'Failed to set PIN' };
    }
}

export async function searchClients(workspaceId: string, query: string) {
    await requireAuth();
    try {
        const clients = await ClientService.search(workspaceId, query);
        return { success: true, data: clients };
    } catch (error) {
        console.error('Error searching clients:', error);
        return { success: false, error: 'Failed to search clients' };
    }
}

export async function filterClients(workspaceId: string, filters: { status?: string; industry?: string }) {
    await requireAuth();
    try {
        const result = await ClientService.list(workspaceId, filters);
        return { success: true, data: result.data };
    } catch (error) {
        console.error('Error filtering clients:', error);
        return { success: false, error: 'Failed to filter clients' };
    }
}
