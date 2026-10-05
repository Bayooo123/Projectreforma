import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { getFirmLeads, reminderStageFor } from '@/lib/compliance-reminders';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ['pending', 'sent', 'partially_paid', 'overdue'];
// Invoices with no due date are treated as due this long after issue.
const DEFAULT_TERMS_DAYS = 14;
// After eight weekly nudges an unpaid invoice is a collections decision, not a reminder.
const MAX_DAYS_OVERDUE = 56;

/**
 * Replaces the invoice follow-up half of the old /api/cron/daily, which
 * would have re-notified every pending invoice every day. Follow-ups go out
 * the day after an invoice falls due, then weekly for eight weeks, to the
 * matter's lawyers (or the firm leads when no matter is linked).
 */
export async function runInvoiceFollowUps(now = new Date()) {
    const invoices = await prisma.invoice.findMany({
        where: {
            status: { in: OPEN_STATUSES },
            OR: [
                { dueDate: { lt: now, gte: new Date(now.getTime() - (MAX_DAYS_OVERDUE + 1) * DAY_MS) } },
                { dueDate: null, date: { lt: new Date(now.getTime() - DEFAULT_TERMS_DAYS * DAY_MS) } },
            ],
        },
        include: {
            client: { select: { name: true, workspaceId: true } },
            matter: { select: { lawyerInChargeId: true, lawyers: { select: { lawyerId: true } } } },
            payments: { select: { amount: true } },
        },
    });

    let notified = 0;
    let skipped = 0;

    for (const invoice of invoices) {
        const due = invoice.dueDate ?? new Date(invoice.date.getTime() + DEFAULT_TERMS_DAYS * DAY_MS);
        const stage = reminderStageFor(due, now);
        if (stage?.kind !== 'overdue' || stage.daysOverdue > MAX_DAYS_OVERDUE) continue;

        const alreadySent = await prisma.notification.findFirst({
            where: {
                relatedInvoiceId: invoice.id,
                title: { startsWith: 'Payment follow-up' },
                createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (alreadySent) {
            skipped++;
            continue;
        }

        const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = Math.max(0, Number(invoice.totalAmount) - paid);
        if (balance <= 0) continue;

        const lawyerIds = new Set<string>(
            [invoice.matter?.lawyerInChargeId, ...(invoice.matter?.lawyers.map(l => l.lawyerId) ?? [])].filter(
                (id): id is string => !!id
            )
        );
        const recipients = lawyerIds.size > 0
            ? [...lawyerIds]
            : (await getFirmLeads(invoice.client.workspaceId)).map(r => r.userId);

        const amount = balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        for (const recipientId of recipients) {
            await createNotification({
                title: `Payment follow-up: invoice ${invoice.invoiceNumber}`,
                message: `${invoice.client.name} still owes ₦${amount} on invoice ${invoice.invoiceNumber}, ${stage.daysOverdue} day${stage.daysOverdue === 1 ? '' : 's'} past due. Follow up or record the payment.`,
                recipientId,
                recipientType: 'lawyer',
                type: 'warning',
                priority: stage.daysOverdue >= 28 ? 'high' : 'medium',
                relatedInvoiceId: invoice.id,
            });
        }
        notified++;
    }

    return { checked: invoices.length, notified, skipped };
}
