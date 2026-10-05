import { prisma } from '@/lib/prisma';

// The single definition of each firm-finance number. The analytics page, the
// Finance page, /api/v1/dashboard/stats and InvoiceService.getStats each used
// to compute these with their own queries — collections keyed on different
// date columns, "outstanding" netted against different sets of payments — so
// the same figure could differ between screens. Change a definition here and
// every surface moves together.

/** Invoices that no longer represent money owed. */
export const CLOSED_INVOICE_STATUSES = ['paid', 'PAID', 'cancelled', 'draft'];

/**
 * Money received between two dates, by the payment's own date (when the
 * client paid), not when someone typed it in.
 */
export async function collectedBetween(workspaceId: string, from: Date, to: Date): Promise<number> {
    const { _sum } = await prisma.payment.aggregate({
        where: { client: { workspaceId }, date: { gte: from, lte: to } },
        _sum: { amount: true },
    });
    return Number(_sum.amount ?? 0);
}

/**
 * What clients still owe: the total of open invoices minus what has already
 * been paid against those same invoices (partial payments included).
 */
export async function outstandingReceivables(workspaceId: string): Promise<number> {
    const openInvoice = { client: { workspaceId }, status: { notIn: CLOSED_INVOICE_STATUSES } };
    const [billed, paid] = await Promise.all([
        prisma.invoice.aggregate({ where: openInvoice, _sum: { totalAmount: true } }),
        prisma.payment.aggregate({ where: { invoice: openInvoice }, _sum: { amount: true } }),
    ]);
    return Math.max(0, Number(billed._sum.totalAmount ?? 0) - Number(paid._sum.amount ?? 0));
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Collections per calendar month for the last `months` months, oldest first. */
export async function monthlyCollections(workspaceId: string, months = 6, now = new Date()) {
    const buckets = Array.from({ length: months }, (_, i) => {
        const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        return { start, key: `${start.getFullYear()}-${start.getMonth()}`, month: MONTH_LABELS[start.getMonth()], amount: 0 };
    });
    const byKey = new Map(buckets.map(b => [b.key, b]));

    const payments = await prisma.payment.findMany({
        where: { client: { workspaceId }, date: { gte: buckets[0].start } },
        select: { amount: true, date: true },
    });
    for (const p of payments) {
        const bucket = byKey.get(`${p.date.getFullYear()}-${p.date.getMonth()}`);
        if (bucket) bucket.amount += Number(p.amount);
    }
    return buckets.map(({ month, amount }) => ({ month, amount: Math.max(0, amount) }));
}
