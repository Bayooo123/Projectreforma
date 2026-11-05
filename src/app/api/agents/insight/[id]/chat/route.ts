import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { pickAgentProvider, runAgentToolLoop } from '@/lib/agents/ai-client';

export const dynamic = 'force-dynamic';

const MAX_HISTORY = 12; // 6 turns, mirrors WhatsappSession's cap

interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const workspaceId = session.user.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const { id } = await params;
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    const insight = await prisma.agentInsight.findUnique({ where: { id } });
    if (!insight || insight.workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }
    if (!insight.briefId) {
        return NextResponse.json({ error: 'Insight has no associated brief' }, { status: 400 });
    }

    const agentDef = AGENT_REGISTRY[insight.agentType];
    if (!agentDef) return NextResponse.json({ error: `Unknown agent type: ${insight.agentType}` }, { status: 400 });

    if (!pickAgentProvider()) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });

    const history: HistoryMessage[] = Array.isArray(insight.messages) ? (insight.messages as unknown as HistoryMessage[]) : [];
    const systemPrompt = agentDef.systemPrompt({
        title: insight.title,
        summary: insight.summary,
        data: insight.data as Record<string, unknown>,
        briefId: insight.briefId,
    });

    const toolCtx = { insightId: insight.id, briefId: insight.briefId, workspaceId, insightData: insight.data as Record<string, unknown>, userId: session.user.id };

    let replyText: string;
    try {
        replyText = await runAgentToolLoop({
            system: systemPrompt,
            tools: agentDef.tools,
            history,
            userMessage: message,
            executeTool: (name, input) => agentDef.executeTool(name, input, toolCtx),
        });
    } catch (error) {
        console.error(`[agents/insight/${id}/chat] AI call failed:`, error);
        return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 502 });
    }

    const updatedHistory = [
        ...history,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: replyText },
    ].slice(-MAX_HISTORY);

    await prisma.agentInsight.update({
        where: { id: insight.id },
        data: { messages: updatedHistory as unknown as Prisma.InputJsonValue },
    });

    const refreshed = await prisma.agentInsight.findUnique({
        where: { id: insight.id },
        select: { status: true, data: true },
    });

    return NextResponse.json({ message: replyText, status: refreshed?.status, data: refreshed?.data });
}
