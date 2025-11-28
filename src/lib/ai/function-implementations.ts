// Function implementations for Lex AI Agent
// These functions execute the actual operations

import { prisma } from '../prisma';

// ============================================
// MATTER MANAGEMENT IMPLEMENTATIONS
// ============================================

export async function getMatters(params: {
    workspaceId: string;
    status?: string;
    practiceArea?: string;
    assignedTo?: string;
    clientName?: string;
    limit?: number;
}) {
    const { workspaceId, status, practiceArea, assignedTo, clientName, limit = 10 } = params;

    const where: any = { workspaceId };

    if (status && status !== 'all') {
        where.status = status;
    }
    if (practiceArea) {
        where.practiceArea = practiceArea;
    }
    if (clientName) {
        where.client = { name: { contains: clientName, mode: 'insensitive' } };
    }

    const matters = await prisma.matter.findMany({
        where,
        include: {
            client: true,
            assignedLawyers: { include: { user: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
    });

    return {
        count: matters.length,
        matters: matters.map(m => ({
            id: m.id,
            title: m.title,
            client: m.client.name,
            practiceArea: m.practiceArea,
            status: m.status,
            assignedLawyers: m.assignedLawyers.map(al => al.user.name),
            createdAt: m.createdAt,
        })),
    };
}

export async function createMatter(params: {
    workspaceId: string;
    title: string;
    clientName: string;
    practiceArea: string;
    status?: string;
    assignedLawyer?: string;
    description?: string;
}) {
    const { workspaceId, title, clientName, practiceArea, status = 'active', description } = params;

    // Find or create client
    let client = await prisma.client.findFirst({
        where: {
            workspaceId,
            name: { equals: clientName, mode: 'insensitive' },
        },
    });

    if (!client) {
        client = await prisma.client.create({
            data: {
                workspaceId,
                name: clientName,
                email: `${clientName.toLowerCase().replace(/\s+/g, '')}@placeholder.com`,
                phone: '',
                address: '',
            },
        });
    }

    const matter = await prisma.matter.create({
        data: {
            workspaceId,
            title,
            clientId: client.id,
            practiceArea,
            status,
            description: description || '',
        },
        include: {
            client: true,
        },
    });

    return {
        success: true,
        matter: {
            id: matter.id,
            title: matter.title,
            client: matter.client.name,
            practiceArea: matter.practiceArea,
            status: matter.status,
        },
        message: `Matter "${title}" created successfully for ${clientName}`,
    };
}

export async function updateMatter(params: {
    workspaceId: string;
    matterId: string;
    status?: string;
    assignedLawyer?: string;
    description?: string;
}) {
    const { workspaceId, matterId, status, description } = params;

    const updates: any = {};
    if (status) updates.status = status;
    if (description) updates.description = description;

    const matter = await prisma.matter.update({
        where: { id: matterId, workspaceId },
        data: updates,
        include: { client: true },
    });

    return {
        success: true,
        matter: {
            id: matter.id,
            title: matter.title,
            status: matter.status,
        },
        message: `Matter "${matter.title}" updated successfully`,
    };
}

export async function deleteMatter(params: {
    workspaceId: string;
    matterId: string;
    confirm: boolean;
}) {
    if (!params.confirm) {
        return {
            success: false,
            message: 'Deletion not confirmed. Set confirm=true to proceed.',
        };
    }

    const matter = await prisma.matter.delete({
        where: { id: params.matterId, workspaceId: params.workspaceId },
    });

    return {
        success: true,
        message: `Matter "${matter.title}" deleted successfully`,
    };
}

// ============================================
// CLIENT MANAGEMENT IMPLEMENTATIONS
// ============================================

export async function getClients(params: {
    workspaceId: string;
    searchQuery?: string;
    limit?: number;
}) {
    const { workspaceId, searchQuery, limit = 10 } = params;

    const where: any = { workspaceId };

    if (searchQuery) {
        where.OR = [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
            { phone: { contains: searchQuery, mode: 'insensitive' } },
        ];
    }

    const clients = await prisma.client.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
    });

    return {
        count: clients.length,
        clients: clients.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
        })),
    };
}

export async function createClient(params: {
    workspaceId: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    type?: string;
}) {
    const { workspaceId, name, email, phone = '', address = '' } = params;

    const client = await prisma.client.create({
        data: {
            workspaceId,
            name,
            email,
            phone,
            address,
        },
    });

    return {
        success: true,
        client: {
            id: client.id,
            name: client.name,
            email: client.email,
        },
        message: `Client "${name}" added successfully`,
    };
}

export async function updateClient(params: {
    workspaceId: string;
    clientId: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
}) {
    const { workspaceId, clientId, ...updates } = params;

    const client = await prisma.client.update({
        where: { id: clientId, workspaceId },
        data: updates,
    });

    return {
        success: true,
        client: {
            id: client.id,
            name: client.name,
            email: client.email,
        },
        message: `Client "${client.name}" updated successfully`,
    };
}

export async function deleteClient(params: {
    workspaceId: string;
    clientId: string;
    confirm: boolean;
}) {
    if (!params.confirm) {
        return {
            success: false,
            message: 'Deletion not confirmed. This will delete all client data (NDPA right to erasure). Set confirm=true to proceed.',
        };
    }

    const client = await prisma.client.delete({
        where: { id: params.clientId, workspaceId: params.workspaceId },
    });

    return {
        success: true,
        message: `Client "${client.name}" and all associated data deleted successfully (NDPA compliant)`,
    };
}

// ============================================
// FINANCIAL OPERATIONS IMPLEMENTATIONS
// ============================================

export async function recordExpense(params: {
    workspaceId: string;
    category: string;
    amount: number;
    description: string;
    reference?: string;
    date?: string;
}) {
    const { workspaceId, category, amount, description, reference, date } = params;

    const expense = await prisma.expense.create({
        data: {
            workspaceId,
            category,
            amount: Math.round(amount * 100), // Convert to kobo
            description,
            reference,
            date: date ? new Date(date) : new Date(),
        },
    });

    return {
        success: true,
        expense: {
            id: expense.id,
            category: expense.category,
            amount: expense.amount / 100,
            description: expense.description,
        },
        message: `Expense recorded: ₦${(expense.amount / 100).toLocaleString()} for ${category}`,
    };
}

export async function getExpenses(params: {
    workspaceId: string;
    period: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    includeAnalytics?: boolean;
}) {
    const { workspaceId, period, category, includeAnalytics = true } = params;

    const where: any = { workspaceId };

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    where.date = { gte: startDate };

    if (category) {
        where.category = category;
    }

    const expenses = await prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const result: any = {
        count: expenses.length,
        total: total / 100,
        expenses: expenses.map(e => ({
            id: e.id,
            category: e.category,
            amount: e.amount / 100,
            description: e.description,
            date: e.date,
        })),
    };

    if (includeAnalytics) {
        // Group by category
        const byCategory: Record<string, number> = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });

        result.analytics = {
            byCategory: Object.entries(byCategory).map(([category, amount]) => ({
                category,
                amount: amount / 100,
                percentage: ((amount / total) * 100).toFixed(1),
            })),
        };
    }

    return result;
}

// Export all function implementations
export const LEX_FUNCTION_IMPLEMENTATIONS = {
    get_matters: getMatters,
    create_matter: createMatter,
    update_matter: updateMatter,
    delete_matter: deleteMatter,
    get_clients: getClients,
    create_client: createClient,
    update_client: updateClient,
    delete_client: deleteClient,
    record_expense: recordExpense,
    get_expenses: getExpenses,
    // TODO: Add remaining implementations
};
