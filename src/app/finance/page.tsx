import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import FinanceClient from './FinanceClient';

export const dynamic = 'force-dynamic';

async function getFinanceSummary(workspaceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [invoices, payments, monthExpenses] = await Promise.all([
        prisma.invoice.findMany({
            where: { client: { workspaceId } },
            include: { client: { select: { name: true } }, payments: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.payment.findMany({
            where: { client: { workspaceId } },
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        // Scoped to this month — the same window the embedded expense log
        // (FinancialLog) starts on, so its initial render and this card's
        // total agree without a second fetch.
        prisma.expense.findMany({
            where: { workspaceId, date: { gte: startOfMonth, lte: endOfMonth } },
            orderBy: { date: 'desc' },
        }).catch(() => [] as any[]),
    ]);

    const outstanding = invoices
        .filter(i => i.status !== 'paid' && i.status !== 'PAID')
        .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const collectedMTD = payments
        .filter(p => new Date(p.createdAt) >= startOfMonth)
        .reduce((s, p) => s + Number(p.amount || 0), 0);

    const expensesMTD = (monthExpenses as any[])
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    const byDate = (monthExpenses as any[]).reduce((acc, expense) => {
        const dateKey = new Date(expense.date).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = { total: new Prisma.Decimal(0), count: 0 };
        acc[dateKey].total = acc[dateKey].total.plus(expense.amount);
        acc[dateKey].count += 1;
        return acc;
    }, {} as Record<string, { total: Prisma.Decimal; count: number }>);

    const expenseSummaries = Object.keys(byDate).sort().reverse().map(dateKey => ({
        date: dateKey,
        total: byDate[dateKey].total.toNumber(),
        count: byDate[dateKey].count,
    }));

    const serializedExpenses = (monthExpenses as any[]).map(e => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
    }));

    return { invoices, payments, expenses: serializedExpenses, expenseSummaries, outstanding, collectedMTD, expensesMTD };
}

export default async function FinancePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const { getCurrentUserWithWorkspace } = await import('@/lib/workspace');
    const dataObj = await getCurrentUserWithWorkspace();
    const workspace = dataObj?.workspace;

    if (!workspace) {
        return <div className="p-10 text-center text-slate-500">No workspace found.</div>;
    }

    // Role/ownership gate the embedded expense log's edit/delete actions —
    // same check Office Manager used before this page absorbed it.
    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspace.id, userId: session.user.id },
        include: { workspace: { select: { ownerId: true } } },
    });
    const userRole = membership?.role || 'Associate';
    const isOwner = membership?.workspace.ownerId === session.user.id;

    const { invoices, payments, expenses, expenseSummaries, outstanding, collectedMTD, expensesMTD } =
        await getFinanceSummary(workspace.id);

    return (
        <FinanceClient
            workspaceId={workspace.id}
            invoices={invoices as any}
            payments={payments as any}
            expenses={expenses as any}
            expenseSummaries={expenseSummaries}
            userRole={userRole}
            isOwner={isOwner}
            outstanding={outstanding}
            collectedMTD={collectedMTD}
            expensesMTD={expensesMTD}
        />
    );
}
