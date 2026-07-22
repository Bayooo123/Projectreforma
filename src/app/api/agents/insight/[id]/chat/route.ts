import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { AGENT_REGISTRY } from '@/lib/agents/registry';

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

    if (!config.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

    const history: HistoryMessage[] = Array.isArray(insight.messages) ? (insight.messages as unknown as HistoryMessage[]) : [];
    const systemPrompt = agentDef.systemPrompt({
        title: insight.title,
        summary: insight.summary,
        data: insight.data as Record<string, unknown>,
        briefId: insight.briefId,
    });

    let currentMessages: Anthropic.MessageParam[] = [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
    ];

    const toolCtx = { insightId: insight.id, briefId: insight.briefId, insightData: insight.data as Record<string, unknown>, userId: session.user.id };

    let response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: agentDef.tools,
        messages: currentMessages,
    });

    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 8) {
        iterations++;
        const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        const results = await Promise.all(toolBlocks.map(async b => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: JSON.stringify(await agentDef.executeTool(b.name, b.input as Record<string, unknown>, toolCtx)),
        })));
        currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: response.content },
            { role: 'user' as const, content: results },
        ];
        response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            tools: agentDef.tools,
            messages: currentMessages,
        });
    }

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const replyText = text?.text ?? 'Done.';

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
