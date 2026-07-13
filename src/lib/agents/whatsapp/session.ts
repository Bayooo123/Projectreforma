import { prisma } from '@/lib/prisma';
import { HistoryMessage } from './types';

const MAX_HISTORY = 12; // 6 turns

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
    const updated = [
        ...current,
        { role: 'user' as const, content: userMsg },
        { role: 'assistant' as const, content: assistantMsg },
    ].slice(-MAX_HISTORY);

    await prisma.whatsappSession.update({
        where: { fromNumber_workspaceId: { fromNumber, workspaceId } },
        data: { messages: updated as unknown as Parameters<typeof prisma.whatsappSession.update>[0]['data']['messages'] },
    });
}

export function getHistory(session: { messages: unknown }): HistoryMessage[] {
    return Array.isArray(session.messages) ? (session.messages as unknown as HistoryMessage[]) : [];
}
