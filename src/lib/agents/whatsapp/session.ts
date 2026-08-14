import { prisma } from '@/lib/prisma';
import { HistoryMessage } from './types';

const MAX_HISTORY = 12; // 6 turns
// A long message (a multi-paragraph court judgment, say) sitting in history
// gets re-sent as input tokens on every subsequent, possibly-unrelated turn
// for as long as it stays in the window. Only the most recent exchanges need
// to be verbatim for the model to hold a coherent thread — anything older is
// truncated rather than paying full price for it turn after turn.
const RECENT_FULL_TURNS = 2; // last 2 exchanges (4 messages) kept at full length
const OLD_MESSAGE_CHAR_CAP = 200;

function compactHistory(messages: HistoryMessage[]): HistoryMessage[] {
    const capped = messages.slice(-MAX_HISTORY);
    const keepFullFrom = Math.max(0, capped.length - RECENT_FULL_TURNS * 2);
    return capped.map((m, i) => {
        if (i >= keepFullFrom || m.content.length <= OLD_MESSAGE_CHAR_CAP) return m;
        return { ...m, content: `${m.content.slice(0, OLD_MESSAGE_CHAR_CAP)}… [earlier message truncated]` };
    });
}

export async function getOrCreateSession(fromNumber: string, workspaceId: string) {
    return prisma.whatsappSession.upsert({
        where: { fromNumber_workspaceId: { fromNumber, workspaceId } },
        create: { fromNumber, workspaceId, messages: [] },
        update: {},
    });
}

export async function appendToSession(
    fromNumber: string,
    workspaceId: string,
    userMsg: string,
    assistantMsg: string,
) {
    const session = await prisma.whatsappSession.findUnique({
        where: { fromNumber_workspaceId: { fromNumber, workspaceId } },
    });
    const current: HistoryMessage[] = Array.isArray(session?.messages) ? (session!.messages as unknown as HistoryMessage[]) : [];
    const updated = compactHistory([
        ...current,
        { role: 'user' as const, content: userMsg },
        { role: 'assistant' as const, content: assistantMsg },
    ]);

    await prisma.whatsappSession.update({
        where: { fromNumber_workspaceId: { fromNumber, workspaceId } },
        data: { messages: updated as unknown as Parameters<typeof prisma.whatsappSession.update>[0]['data']['messages'] },
    });
}

export function getHistory(session: { messages: unknown }): HistoryMessage[] {
    return Array.isArray(session.messages) ? (session.messages as unknown as HistoryMessage[]) : [];
}
