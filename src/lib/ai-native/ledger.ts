import { completeJSON } from '@/lib/agents/ai-client';
import { categorizeExpense } from '@/lib/services/expense-classification';
import { prisma } from '@/lib/prisma';

const SYSTEM = `Extract each distinct expense from a lawyer's end-of-day note. Return JSON only, no other text: {"items": [{"description": "...", "amount": 1234}]}. Amounts are in Naira, numbers only — no currency symbols, commas, or words. If there are no real expenses in the text, return {"items": []}.`;

/**
 * Ledger: drop a line of expenses into chat, they get parsed and stored on
 * the real Expense model (the same one the rest of the app already reads
 * from for distribution charts, exports, etc.) — not a parallel table.
 */
export async function recordLedgerEntries(workspaceId: string, input: string, matterId?: string | null) {
    let items: { description: string; amount: number }[];
    try {
        const raw = await completeJSON({ system: SYSTEM, prompt: input, tier: 'quick', maxTokens: 500 });
        items = JSON.parse(raw).items ?? [];
    } catch (err) {
        console.error('[Ledger] extraction failed:', err);
        return { kind: 'error' as const, text: "Couldn't parse any expenses from that — try one item per line, e.g. \"fuel 5000\"." };
    }

    items = items.filter(i => i?.description && Number.isFinite(i.amount) && i.amount > 0);
    if (items.length === 0) {
        return { kind: 'error' as const, text: "Didn't find a recognisable expense in that message." };
    }

    const created = await Promise.all(items.map(item =>
        prisma.expense.create({
            data: {
                workspaceId,
                matterId: matterId ?? null,
                amount: item.amount,
                description: item.description,
                category: categorizeExpense({ title: item.description, amount: item.amount }),
                reference: 'ai-native:ledger',
            },
        })
    ));

    const total = created.reduce((sum, e) => sum + Number(e.amount), 0);
    return {
        kind: 'ledger' as const,
        items: created.map(e => ({ desc: e.description ?? '', cat: e.category, amt: Number(e.amount) })),
        total,
    };
}
