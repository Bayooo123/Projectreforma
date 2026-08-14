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
    {
        name: 'record_brief_update',
        description: 'Record a status update and/or next action on a specific brief — writes to the manual tracker (the "Status / Last Action" and "Next Action" fields visible on the Brief Tracker) and logs it to the brief\'s activity history. Use this once you know which brief the user means — from search_briefs/list_briefs, from the user naming it directly, or from the user picking a number off a list you showed them earlier in this conversation.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string', description: 'The brief to update' },
                status_update: { type: 'string', description: 'What just happened / the current status. Optional if only recording a next action.' },
                next_action: { type: 'string', description: 'What happens next / who needs to do what. Optional if only recording a status update.' },
            },
            required: ['brief_id'],
        },
    },
    {
        name: 'create_brief',
        description: 'Create a new brief when the user wants to log something against a case that doesn\'t exist yet. Only use after confirming no existing brief matches (search_briefs/list_briefs came up empty, or the user explicitly says to create one). The brief number is generated automatically — never ask the user for one.',
        input_schema: {
            type: 'object' as const,
            properties: {
                name: { type: 'string', description: 'The case/brief name, e.g. "Smith v Adeyemi"' },
                client_name: { type: 'string', description: 'Client name, if known — links to an existing client with a matching name, or leaves unlinked if none matches' },
                category: { type: 'string', description: 'Category, e.g. Litigation, Advisory, Drafting. Defaults to "General" if not given.' },
            },
            required: ['name'],
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

async function recordBriefUpdate(
    briefId: string,
    workspaceId: string,
    userId: string,
    statusUpdate?: string,
    nextAction?: string,
) {
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId, deletedAt: null },
        select: { id: true, name: true },
    });
    if (!brief) return { error: 'Brief not found in this workspace' };
    if (!statusUpdate && !nextAction) return { error: 'Provide at least a status update or a next action' };

    await prisma.brief.update({
        where: { id: briefId },
        data: {
            ...(statusUpdate ? { manualStatus: statusUpdate } : {}),
            ...(nextAction ? { manualNextAction: nextAction } : {}),
            manualStatusUpdatedAt: new Date(),
            manualStatusUpdatedById: userId,
        },
    });

    const { addBriefActivity } = await import('@/lib/briefs');
    await addBriefActivity(
        briefId,
        'status_changed',
        `📱 WhatsApp update: ${statusUpdate || nextAction}`,
        { statusUpdate: statusUpdate ?? null, nextAction: nextAction ?? null, source: 'whatsapp' },
        userId,
    );

    return { success: true, briefId: brief.id, briefName: brief.name };
}

async function createBriefFromWhatsApp(
    name: string,
    workspaceId: string,
    userId: string,
    clientName?: string,
    category?: string,
) {
    const { generateBriefNumber } = await import('@/lib/briefs');
    const briefNumber = await generateBriefNumber(workspaceId);

    let clientId: string | null = null;
    if (clientName) {
        const client = await prisma.client.findFirst({
            where: { workspaceId, name: { equals: clientName, mode: 'insensitive' }, deletedAt: null },
            select: { id: true },
        });
        clientId = client?.id ?? null;
    }

    const brief = await prisma.brief.create({
        data: {
            briefNumber,
            name,
            clientId,
            lawyerId: userId,
            workspaceId,
            category: category || 'General',
            status: 'active',
        },
        select: { id: true, name: true, briefNumber: true },
    });

    return {
        success: true,
        briefId: brief.id,
        briefName: brief.name,
        briefNumber: brief.briefNumber,
        clientLinked: !!clientId,
        note: clientName && !clientId ? `No existing client named "${clientName}" was found — brief created without a linked client.` : undefined,
    };
}

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>, ctx: AgentContext): Promise<unknown> {
    const workspaceId = ctx.workspaceId;
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
        case 'record_brief_update':
            return recordBriefUpdate(
                input.brief_id as string,
                workspaceId,
                ctx.userId,
                input.status_update as string | undefined,
                input.next_action as string | undefined,
            );
        case 'create_brief':
            return createBriefFromWhatsApp(
                input.name as string,
                workspaceId,
                ctx.userId,
                input.client_name as string | undefined,
                input.category as string | undefined,
            );
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

You have access to the firm's brief database, and you can also record updates and create new briefs.

Rules for WhatsApp responses:
- Keep responses under 800 characters when possible
- Use plain text — no markdown bold, no tables
- Use numbered lists for chronologies
- For AI summaries, give the headline points, not the full text
- Always cite the source document when mentioning case facts

Recording updates (record_brief_update):
- When the user tells you something that happened on a case, or what needs to happen next, record it — don't just chat back and let it evaporate. That's the whole point of this channel.
- Record-then-optionally-clarify: if it's clear which brief they mean (they named it, or it's the only/obvious match from search_briefs), call record_brief_update immediately. Don't ask for confirmation you don't need.
- Only pause to ask when it's genuinely ambiguous: if search_briefs/list_briefs returns multiple plausible matches, reply with a short numbered list ("1. Smith v Adeyemi (BRF-014)\\n2. Smith v Okafor (BRF-021)\\nWhich one?") and wait for their reply. When they answer with just a number, match it against the list you showed in your own previous message in this conversation.
- If nothing matches at all, tell them so and ask if they want to create a new brief for it. If they say yes (or already said so), call create_brief, then immediately record the update against the brief you just created — don't make them repeat themselves.
- After recording or creating, confirm briefly and concretely: what you recorded, and against which brief (name + number).`;

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
            model: 'claude-sonnet-5',
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
                    const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx);
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
