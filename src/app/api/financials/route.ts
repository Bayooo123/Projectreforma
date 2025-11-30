import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const workspaceId = session.user.workspaceId;

        // Fetch expenses
        const expenses = await prisma.expense.findMany({
            where: { workspaceId },
            orderBy: { date: 'desc' },
        });

        // Fetch invoices (as income)
        const invoices = await prisma.invoice.findMany({
            where: {
                client: {
                    workspaceId: workspaceId
                }
            },
            include: {
                client: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' },
        });

        // Combine and transform into a unified log
        const log = [
            ...expenses.map(e => ({
                id: e.id,
                type: 'expense',
                description: e.description,
                amount: e.amount,
                date: e.date,
                category: e.category,
                status: 'completed', // Expenses are assumed completed
            })),
            ...invoices.map(i => ({
                id: i.id,
                type: 'income',
                description: `Invoice #${i.invoiceNumber} - ${i.client.name}`,
                amount: i.totalAmount,
                date: i.date,
                category: 'Legal Services',
                status: i.status,
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(log);
    } catch (error) {
        console.error('Error fetching financials:', error);
        return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
    }
}
