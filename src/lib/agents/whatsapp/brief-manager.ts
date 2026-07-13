import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { AgentContext, HistoryMessage } from './types';

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
    {
        name: 'search_briefs',
        description: 'Search for briefs by name, client, or matter. Use this first when the user asks about a specific case.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'Search term — name, client, or keywords' },
            },
            required: ['query'],
        },
    },
    {
        name: 'list_briefs',
        description: 'List active briefs in the workspace. Use when the user asks "what briefs do I have" or needs an overview.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: { type: 'number', description: 'Max results (default 8)' },
            },
        },
    },
    {
        name: 'get_brief_detail',
        description: 'Get full detail for a brief including AI summary, document count, and open tasks.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string' },
            },
            required: ['brief_id'],
        },
    },
    {
        name: 'get_case_chronology',
        description: 'Get the chronological timeline of facts extracted from documents in a brief.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string' },
            },
            required: ['brief_id'],
        },
    },
    {
        name: 'get_upcoming_hearings',
        description: 'Get upcoming court hearings and meetings across all briefs.',
        input_schema: {
            type: 'object' as const,
            properties: {
                days_ahead: { type: 'number', description: 'How many days ahead (default 30)' },
            },
        },
    },
];

// ── Tool implementations ──────────────────────────────────────────────────────

async function searchBriefs(query: string, workspaceId: string) {
    const results = await prisma.brief.findMany({
        where: {
            workspaceId,
            deletedAt: null,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { client: { name: { contains: query, mode: 'insensitive' } } },
                { matter: { name: { contains: query, mode: 'insensitive' } } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            status: true,
            dueDate: true,
            client: { select: { name: true } },
            matter: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
    });
    return results.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        status: b.status,
        client: b.client?.name ?? null,
        matter: b.matter?.name ?? null,
        dueDate: b.dueDate?.toISOString().split('T')[0] ?? null,
    }));
}

async function listBriefs(workspaceId: string, limit = 8) {
    const results = await prisma.brief.findMany({
        where: { workspaceId, deletedAt: null, status: 'active' },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            status: true,
            dueDate: true,
            client: { select: { name: true } },
            matter: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
    });
    return results.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        status: b.status,
        client: b.client?.name ?? null,
        matter: b.matter?.name ?? null,
        dueDate: b.dueDate?.toISOString().split('T')[0] ?? null,
    }));
}

async function getBriefDetail(briefId: string, workspaceId: string) {
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId, deletedAt: null },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            status: true,
            description: true,
            dueDate: true,
            aiSummaryProse: true,
            aiSummaryGeneratedAt: true,
            client: { select: { name: true } },
            matter: { select: { name: true } },
            _count: {
                select: {
                    documents: true,
                    tasks: { where: { status: { not: 'completed' } } },
                },
            },
        },
    });
    if (!brief) return { error: 'Brief not found' };
    return {
        id: brief.id,
        name: brief.name,
        briefNumber: brief.briefNumber,
        status: brief.status,
        client: brief.client?.name ?? null,
        matter: brief.matter?.name ?? null,
        description: brief.description,
        dueDate: brief.dueDate?.toISOString().split('T')[0] ?? null,
        documentCount: brief._count.documents,
        openTaskCount: brief._count.tasks,
        aiSummary: brief.aiSummaryProse ?? null,
        aiSummaryDate: brief.aiSummaryGeneratedAt?.toISOString().split('T')[0] ?? null,
    };
}

async function getCaseChronology(briefId: string, workspaceId: string) {
    // Verify brief belongs to workspace
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId },
        select: { id: true, name: true },
    });
    if (!brief) return { error: 'Brief not found' };

    const events = await prisma.documentTimelineEvent.findMany({
        where: { briefId },
        select: { eventDate: true, eventDateRaw: true, description: true, documentName: true },
        take: 30,
    });

    const sorted = events.sort((a, b) => {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return a.eventDate.getTime() - b.eventDate.getTime();
    });

    return {
        briefName: brief.name,
        eventCount: sorted.length,
        events: sorted.map(e => ({
            date: e.eventDate?.toISOString().split('T')[0] ?? e.eventDateRaw,
            description: e.description,
            source: e.documentName,
        })),
    };
}

async function getUpcomingHearings(workspaceId: string, daysAhead = 30) {
    const from = new Date();
    const to = new Date(from.getTime() + daysAhead * 86_400_000);

    const entries = await prisma.calendarEntry.findMany({
        where: {
            date: { gte: from, lte: to },
            deletedAt: null,
            OR: [
                { brief: { workspaceId } },
                { matter: { workspaceId } },
            ],
        },
        select: {
            date: true,
            title: true,
            type: true,
            court: true,
            judge: true,
            brief: { select: { name: true } },
            matter: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: 15,
    });

    return entries.map(e => ({
        date: e.date.toISOString().split('T')[0],
        title: e.title,
        type: e.type,
        court: e.court ?? null,
        judge: e.judge ?? null,
        brief: e.brief?.name ?? null,
        matter: e.matter?.name ?? null,
    }));
}

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>, workspaceId: string): Promise<unknown> {
    switch (name) {
        case 'search_briefs':
            return searchBriefs(input.query as string, workspaceId);
        case 'list_briefs':
            return listBriefs(workspaceId, (input.limit as number) ?? 8);
        case 'get_brief_detail':
            return getBriefDetail(input.brief_id as string, workspaceId);
        case 'get_case_chronology':
            return getCaseChronology(input.brief_id as string, workspaceId);
        case 'get_upcoming_hearings':
            return getUpcomingHearings(workspaceId, (input.days_ahead as number) ?? 30);
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

// ── Agent entry point ─────────────────────────────────────────────────────────

export async function runBriefManager(
    message: string,
    ctx: AgentContext,
    history: HistoryMessage[],
): Promise<string> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) return 'AI is not configured. Please contact your administrator.';

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are Reforma's Brief Manager — a legal assistant accessible via WhatsApp for ${ctx.firmName}.

You are talking to: ${ctx.userName}
Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

You have access to the firm's brief database. Use your tools to answer accurately.

Rules for WhatsApp responses:
- Keep responses under 800 characters when possible
- Use plain text — no markdown bold, no tables
- Use numbered lists for chronologies
- If multiple briefs match a search, list them and ask which one
- For AI summaries, give the headline points, not the full text
- Always cite the source document when mentioning case facts`;

    // Build messages from history + current message
    const messages: Anthropic.MessageParam[] = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
    ];

    // Agentic loop
    let iterations = 0;
    while (iterations < 8) {
        iterations++;
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            tools: TOOLS,
            messages,
        });

        if (response.stop_reason === 'end_turn') {
            const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined;
            return textBlock?.text.trim() ?? 'Done.';
        }

        if (response.stop_reason === 'tool_use') {
            messages.push({ role: 'assistant', content: response.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
                if (block.type === 'tool_use') {
                    const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx.workspaceId);
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: JSON.stringify(result),
                    });
                }
            }
            messages.push({ role: 'user', content: toolResults });
        } else {
            // Unexpected stop reason
            break;
        }
    }

    return 'I was unable to complete your request. Please try again.';
}
