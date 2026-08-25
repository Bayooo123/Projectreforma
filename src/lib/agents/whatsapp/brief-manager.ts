import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { AgentContext, HistoryMessage } from './types';
import { searchBriefsByQuery, getUpcomingHearingsForWorkspace, type BriefSearchResult } from '@/lib/ai-context/brief-context';
import { DraftingService } from '@/lib/drafting/drafting-service';
import { generateBriefManagerInsight } from '@/lib/agents/brief-manager/scan';
import { getClaudeTools as getWorkspaceTools, executeTool as executeWorkspaceTool, idOrTextFilter } from '@/lib/eureka/tools';

// ── Tool definitions ──────────────────────────────────────────────────────────
// Exported so the OpenAI-driven loop (brief-manager-openai.ts) can reuse the
// exact same schemas and business logic — only the "which LLM drives the
// loop" part differs per provider. Anthropic's input_schema and OpenAI's
// function.parameters are both just JSON Schema, so one canonical
// Anthropic-shaped array is the source of truth; brief-manager-openai.ts
// converts it at the wrapper boundary rather than duplicating it by hand.
//
// This agent is not brief-only — it's the whole workspace, reached over
// WhatsApp. It reuses Eureka's full tool set (matters, clients, court dates,
// financials, documents, anomalies, emails — everything the web chat agent
// can do) via getWorkspaceTools()/executeWorkspaceTool below, and adds only
// what's genuinely specific to this channel: a lightweight brief-only
// search/list pair for the "which brief do you mean" disambiguation flow,
// semantic document search, on-demand case-manager analysis, and recording
// an update from a WhatsApp message. get_brief_detail, get_brief_timeline,
// and create_brief come from Eureka's set — no need to duplicate them here.

const WHATSAPP_TOOLS: Anthropic.Tool[] = [
    {
        name: 'search_briefs',
        description: 'Search for briefs by name, client, or matter. Use this first when the user asks about a specific case, or to disambiguate before recording an update.',
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
        description: 'List active briefs in the workspace. Defaults to the 8 most recently updated — fine for "what briefs do I have" or a quick overview. If the user asks for ALL briefs, the complete list, or every brief, call this with limit set to 200 so nothing is left out.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: { type: 'number', description: 'Max results. Default 8 for a quick overview — set to 200 when the user wants the complete list.' },
            },
        },
    },
    {
        name: 'get_upcoming_hearings',
        description: 'Get upcoming court hearings and meetings (both types) across the whole workspace within a day window — the quickest way to answer "what\'s coming up". For date-range or lawyer-filtered court queries specifically, use get_court_dates instead.',
        input_schema: {
            type: 'object' as const,
            properties: {
                days_ahead: { type: 'number', description: 'How many days ahead (default 30)' },
            },
        },
    },
    {
        name: 'search_brief_documents',
        description: 'Search the actual text of documents filed under a brief — use this whenever the user asks what a specific document says, or asks something that needs a fact, clause, date, amount, or name from inside a document rather than the chronology summary (e.g. "what does the tenancy agreement say about rent review", "who witnessed the affidavit", "what damages did we claim"). Returns the most relevant passages, not a full chronology.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string' },
                query: { type: 'string', description: 'The question or topic to search for, in natural language' },
            },
            required: ['brief_id', 'query'],
        },
    },
    {
        name: 'analyze_brief',
        description: 'Run a full case-manager analysis of a brief on demand: current status, key developments, next steps, who currently holds the ball (firm/opposing counsel/court), open questions, and whether documents or a client update are needed. Use this when the user asks for an analysis, a status check, "what\'s going on with X", or "what should I do next on X" — this is deeper than get_brief_timeline, which only lists raw events.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string' },
            },
            required: ['brief_id'],
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
];

// The full merged tool set exposed to the model: Eureka's workspace-wide
// tools plus this channel's own additions. No name collisions — verified
// against getWorkspaceTools()'s list (get_brief_detail, get_brief_timeline,
// and create_brief live there now, not here).
export const TOOLS: Anthropic.Tool[] = [...(getWorkspaceTools() as Anthropic.Tool[]), ...WHATSAPP_TOOLS];

// ── Tool implementations ──────────────────────────────────────────────────────
// search_briefs and get_upcoming_hearings are backed by the shared
// src/lib/ai-context/brief-context.ts module (the same queries were
// hand-rolled near-identically in Pulse's Brief Manager and Eureka) — see
// that file for the implementations. Everything not specific to this
// channel (get_matters, get_brief_detail, financials, clients, anomalies,
// emails, create/update tools, etc.) is delegated to executeWorkspaceTool
// in the default case below — see src/lib/eureka/tools.ts.

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

// Shared by every WhatsApp tool that takes a single brief_id/brief_title
// slot. A failed lookup never dead-ends in a bare "not found" — it falls
// back to the closest name matches (the same tokenized, word-order-tolerant
// search behind search_briefs) so the model always has something to act
// on: present the candidates, let the person pick, retry with the real id.
type BriefResolution =
    | { ok: true; id: string; name: string }
    | { ok: false; result: { error: string; suggestions?: BriefSearchResult[] } };

async function resolveBriefRef(ref: string, workspaceId: string): Promise<BriefResolution> {
    const brief = await prisma.brief.findFirst({
        where: { workspaceId, deletedAt: null, OR: idOrTextFilter(ref, ['name', 'briefNumber', 'customBriefNumber'], undefined) },
        select: { id: true, name: true },
    });
    if (brief) return { ok: true, id: brief.id, name: brief.name };

    const suggestions = await searchBriefsByQuery(ref, workspaceId, 5);
    return {
        ok: false,
        result: suggestions.length > 0
            ? { error: `No exact match for "${ref}".`, suggestions }
            : { error: 'No brief found matching that reference.' },
    };
}

async function recordBriefUpdate(
    briefId: string,
    workspaceId: string,
    userId: string,
    statusUpdate?: string,
    nextAction?: string,
) {
    const resolved = await resolveBriefRef(briefId, workspaceId);
    if (!resolved.ok) return resolved.result;
    if (!statusUpdate && !nextAction) return { error: 'Provide at least a status update or a next action' };
    briefId = resolved.id;

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

    return { success: true, briefId: resolved.id, briefName: resolved.name };
}

async function searchBriefDocuments(briefId: string, workspaceId: string, query: string) {
    const resolved = await resolveBriefRef(briefId, workspaceId);
    if (!resolved.ok) return resolved.result;
    briefId = resolved.id;

    if (!config.VOYAGE_API_KEY) return { error: 'Document search is not configured for this workspace.' };

    try {
        const context = await DraftingService.retrieveContext(briefId, query, 6);
        if (!context.trim()) return { results: [], note: 'No matching passages found in this brief\'s documents.' };
        return { results: context };
    } catch (err) {
        console.error(`[WhatsApp Agent] Document search failed for brief ${briefId}:`, err);
        return { error: 'Document search failed. Try again in a moment.' };
    }
}

async function analyzeBrief(briefId: string, workspaceId: string) {
    const resolved = await resolveBriefRef(briefId, workspaceId);
    if (!resolved.ok) return resolved.result;
    briefId = resolved.id;

    const result = await generateBriefManagerInsight(briefId);
    if (!result.success) return { error: result.reason };

    return { headline: result.insight.summary, ...result.insight.data };
}

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(name: string, input: Record<string, unknown>, ctx: AgentContext): Promise<unknown> {
    const workspaceId = ctx.workspaceId;
    switch (name) {
        case 'search_briefs':
            return searchBriefsByQuery(input.query as string, workspaceId);
        case 'list_briefs':
            return listBriefs(workspaceId, (input.limit as number) ?? 8);
        case 'get_upcoming_hearings':
            return getUpcomingHearingsForWorkspace(workspaceId, (input.days_ahead as number) ?? 30);
        case 'search_brief_documents':
            return searchBriefDocuments(input.brief_id as string, workspaceId, input.query as string);
        case 'analyze_brief':
            return analyzeBrief(input.brief_id as string, workspaceId);
        case 'record_brief_update':
            return recordBriefUpdate(
                input.brief_id as string,
                workspaceId,
                ctx.userId,
                input.status_update as string | undefined,
                input.next_action as string | undefined,
            );
        default:
            // Everything else — matters, clients, court dates, financials,
            // documents, anomalies, emails, create/update — is Eureka's tool
            // set. See src/lib/eureka/tools.ts; this channel doesn't need its
            // own copy of logic that's already implemented and battle-tested
            // there.
            return executeWorkspaceTool(name, input, workspaceId, ctx.userId);
    }
}

// ── Shared system prompt ──────────────────────────────────────────────────────
// Exported so the OpenAI loop uses word-for-word identical instructions —
// the two providers should differ in mechanics only, never in behavior.

export function buildSystemPrompt(ctx: AgentContext): string {
    return `You are Reforma's assistant, accessible via WhatsApp for ${ctx.firmName} — the same intelligence behind Reforma's web chat (Eureka), reachable from a phone. You are not limited to briefs: you have live access to the whole workspace — matters, clients, court dates, financials, documents, anomalies, and email correspondence — and you can create and update records, not just read them.

You are talking to: ${ctx.userName}
Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

Never refuse a question or say you can "only help with briefs and case information" — if it's about this firm's work, there is very likely a tool for it. Try the tool that fits before concluding you can't help, and if you're genuinely unsure which one applies, make your best attempt rather than deflecting.

Rules for WhatsApp responses:
- Keep responses under 800 characters when possible — split naturally into a few messages if the answer genuinely needs more, don't cram it or truncate it
- Use plain text — no markdown bold, no tables, no markdown links (unlike the web chat, WhatsApp won't render them) — just say the name/number in prose
- Use numbered lists for chronologies
- For AI summaries, give the headline points, not the full text
- Always cite the source document when mentioning case facts
- Format money in Naira (₦) with commas

Matters vs briefs — these are different records:
- A "matter" is the case-level record (court, judge, overall status); a "brief" is the work product/file within it (or can stand alone with just a client, no matter). A question naming a case could mean either — if get_matters/get_matter_detail comes up empty, try search_briefs/get_brief_detail before concluding it doesn't exist, and vice versa.

Never dead-end on a brief lookup — this is non-negotiable:
- Every tool that resolves a brief (get_brief_detail, get_brief_timeline, analyze_brief, search_brief_documents, record_brief_update, update_brief) automatically falls back to the closest name matches when there's no exact hit, returned as a "suggestions" array (same names/numbers as search_briefs).
- If a tool result includes "suggestions", you MUST show them to the user as a short numbered list ("1. Smith v Adeyemi (BRF-014) — Adeyemi Motors\\n2. Smith v Okafor (BRF-021) — Okafor & Co\\nWhich one?") and wait for their reply — never respond with just "not found" or "no results" when suggestions were offered. When they answer with a number, match it against the list you just showed and immediately carry out the ORIGINAL request (the analysis, the timeline, the update, whatever they originally asked for) against the brief they picked — don't just confirm the pick and stop.
- If a tool result has an error but no "suggestions" (truly nothing close), call list_briefs as a last resort to show what's actually in the workspace before telling the user you found nothing — only report a genuine dead end after that.
- If it's not obvious which brief the user means even before calling a tool, search_briefs/list_briefs first rather than guessing an id.

Choosing the right tool for a question about a brief:
- "What's the status of X" / "how's X doing" / "what's going on with X" / "give me an analysis" / "what should I do next" / "who's the ball with" → analyze_brief. This is the deep case-manager read (status, next steps, ball-in-court, open questions). Prefer it over get_brief_detail (metadata + docs/tasks, no real analysis) and over get_brief_timeline (raw timeline, no synthesis) whenever the user wants an actual answer rather than a data dump.
- Anything that needs a fact FROM INSIDE a document — a clause, a date, an amount, a name, what a witness said, what was pleaded → search_brief_documents (semantic search over document content). Never guess or answer from a chronology snippet alone when the user is asking what a document actually says. analyse_document is for going deep on one already-identified document (including PDFs and images) once you have its document_id.
- "What's happened / what's the timeline" → get_brief_timeline.

Everything beyond briefs — clients, matters, court dates, financials, deadlines, anomalies, emails — works the same way: search/list first if the target record isn't already clear from context, then call the specific tool. Don't ask the user for an ID you can look up yourself.

Recording updates (record_brief_update):
- When the user tells you something that happened on a case, or what needs to happen next, record it — don't just chat back and let it evaporate. That's the whole point of this channel.
- Record-then-optionally-clarify: if it's clear which brief they mean (they named it, or it's the only/obvious match from search_briefs), call record_brief_update immediately. Don't ask for confirmation you don't need.
- If nothing matches at all (record_brief_update returns an error with no suggestions), ask if they want to create a new brief for it (create_brief). If they say yes (or already said so), create it, then immediately record the update against the brief you just created — don't make them repeat themselves.
- After recording, creating, or updating anything, confirm briefly and concretely: what you did, and against which record (name + number/reference).`;
}

// ── Agent entry point (Anthropic) ─────────────────────────────────────────────
// This is the fallback path — see runBriefManager in index.ts for the
// OpenAI-primary/Anthropic-fallback router.

export async function runBriefManagerAnthropic(
    message: string,
    ctx: AgentContext,
    history: HistoryMessage[],
): Promise<string> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) return 'AI is not configured. Please contact your administrator.';

    const client = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(ctx);

    // Build messages from history + current message
    const messages: Anthropic.MessageParam[] = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
    ];

    // Agentic loop — 10 iterations and a 4096-token budget to match Eureka:
    // a workspace-wide tool set means more multi-hop lookups (matter → brief
    // → timeline, or client → matters → invoices) than the old brief-only
    // set ever needed, and richer tool output (document OCR, timelines) can
    // need more room than the old 1024-token cap allowed for.
    let iterations = 0;
    while (iterations < 10) {
        iterations++;
        const response = await client.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 4096,
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
