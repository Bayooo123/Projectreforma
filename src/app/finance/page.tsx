import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import FinanceClient from './FinanceClient';

export const dynamic = 'force-dynamic';

async function getFinanceSummary(workspaceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoices, payments, expenses] = await Promise.all([
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
        prisma.expense.findMany({
            where: { workspaceId },
            orderBy: { date: 'desc' },
            take: 50,
        }).catch(() => [] as any[]),
    ]);

    const outstanding = invoices
        .filter(i => i.status !== 'paid' && i.status !== 'PAID')
        .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const collectedMTD = payments
        .filter(p => new Date(p.createdAt) >= startOfMonth)
        .reduce((s, p) => s + Number(p.amount || 0), 0);

    const expensesMTD = (expenses as any[])
        .filter(e => new Date(e.date || e.createdAt) >= startOfMonth)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    return { invoices, payments, expenses, outstanding, collectedMTD, expensesMTD };
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

    const { invoices, payments, expenses, outstanding, collectedMTD, expensesMTD } =
        await getFinanceSummary(workspace.id);

    return (
        <FinanceClient
            invoices={invoices as any}
            payments={payments as any}
            expenses={expenses as any}
            outstanding={outstanding}
            collectedMTD={collectedMTD}
            expensesMTD={expensesMTD}
        />
    );
}
