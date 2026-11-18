import { prisma } from '@/lib/prisma';

export async function findOrCreateOpenGap(workspaceId: string, briefId: string | null, text: string, hint?: string | null) {
    const existing = await prisma.knowledgeGap.findFirst({ where: { workspaceId, briefId, status: 'open' } });
    if (existing) return existing;
    return prisma.knowledgeGap.create({ data: { workspaceId, briefId, text, hint: hint ?? null } });
}

const DECLINE = /^(no|not now|skip|decline|later)\b/i;

/**
 * Answering a gap closes it out. What that answer actually means depends on
 * the gap's category:
 * - "info" (the default — missing next date, etc.): the answer becomes a
 *   standing Instruction, so the same gap doesn't get raised again once
 *   Junior knows it.
 * - "confirm_update": this gap exists because a client-update letter was
 *   drafted (over WhatsApp or otherwise) and sent to the lawyer to review,
 *   but nothing ever told Reforma what actually went out. The answer closes
 *   that loop directly on the ClientUpdateDraft it points to — either the
 *   final text the lawyer actually sent (captured as real edit-delta
 *   training signal, same as an /ai-native approval), or, if they typed
 *   "sent as drafted", the draft text unchanged.
 * - "stale_ledger": the firm's financial records have gone quiet. The reply
 *   is run straight through the same extraction Ledger itself uses, so
 *   typing the missing expenses right there in the reply actually records
 *   them, rather than just acknowledging the nudge.
 * - "no_invoice": a matter has recorded expenses but was never invoiced.
 *   Unless the reply reads as a decline, this prepares a real draft Invoice
 *   from that matter's recorded expenses (status stays "pending" — nothing
 *   is sent to the client without a separate, explicit send).
 */
export async function resolveGap(workspaceId: string, userId: string, gapId: string, answer: string) {
    const gap = await prisma.knowledgeGap.findFirst({ where: { id: gapId, workspaceId } });
    if (!gap) return { error: 'Gap not found.' };
    if (!answer.trim()) return { error: 'Type an answer first.' };
    const trimmed = answer.trim();

    await prisma.knowledgeGap.update({
        where: { id: gapId },
        data: { status: 'closed', answer: trimmed, resolvedAt: new Date() },
    });

    if (gap.category === 'confirm_update' && gap.refId) {
        const draft = await prisma.clientUpdateDraft.findFirst({ where: { id: gap.refId, workspaceId } });
        if (draft) {
            const sentAsDrafted = /^sent as drafted$/i.test(trimmed);
            const now = new Date();
            await prisma.clientUpdateDraft.update({
                where: { id: draft.id },
                data: {
                    finalText: sentAsDrafted ? draft.draftText : trimmed,
                    status: 'sent',
                    approvedById: userId,
                    approvedAt: now,
                    sentAt: now,
                },
            });
        }
        return { success: true as const };
    }

    if (gap.category === 'stale_ledger') {
        const { recordLedgerEntries } = await import('./ledger');
        await recordLedgerEntries(workspaceId, trimmed).catch(() => null);
        return { success: true as const };
    }

    if (gap.category === 'no_invoice' && gap.refId && !DECLINE.test(trimmed)) {
        const matter = await prisma.matter.findFirst({
            where: { id: gap.refId, workspaceId },
            select: { id: true, clientId: true, client: { select: { name: true, company: true } } },
        });
        const expenses = matter ? await prisma.expense.findMany({ where: { matterId: matter.id }, orderBy: { date: 'asc' } }) : [];
        if (matter?.clientId && expenses.length > 0) {
            const { InvoiceService } = await import('@/lib/services/invoices/invoice-service');
            await InvoiceService.create({
                clientId: matter.clientId,
                matterId: matter.id,
                billToName: matter.client?.company || matter.client?.name || 'Client',
                notes: /^(yes|yep|yeah|please|go ahead|prepare one|ok|okay)\.?$/i.test(trimmed) ? null : trimmed,
                items: expenses.map((e, i) => ({
                    description: e.description || 'Disbursement',
                    amount: Number(e.amount),
                    quantity: 1,
                    order: i,
                })),
                vatRate: 7.5,
                securityChargeRate: 1.0,
            });
        }
        return { success: true as const };
    }

    const instruction = await prisma.instruction.create({
        data: { workspaceId, briefId: gap.briefId, text: trimmed, createdById: userId },
    });
    return { success: true as const, instruction };
}

export async function listOpenGaps(workspaceId: string, briefId?: string | null) {
    return prisma.knowledgeGap.findMany({
        where: { workspaceId, status: 'open', ...(briefId ? { briefId } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { brief: { select: { name: true } } },
    });
}
