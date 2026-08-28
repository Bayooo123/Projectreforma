import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { AgentContext, HistoryMessage } from './types';
import { searchBriefsByQuery, getUpcomingHearingsForWorkspace, type BriefSearchResult } from '@/lib/ai-context/brief-context';
import { DraftingService } from '@/lib/drafting/drafting-service';
import { generateBriefManagerInsight } from '@/lib/agents/brief-manager/scan';
import { getClaudeTools as getWorkspaceTools, executeTool as executeWorkspaceTool, idOrTextFilter } from '@/lib/eureka/tools';
import { sendWhatsAppDocument } from './send';
import { markdownToDocxBuffer } from '@/lib/documents/markdown-to-docx';

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
        name: 'file_pending_document',
        description: 'File the most recent document this WhatsApp number sent that is still unfiled/pending (i.e. Reforma could not tell which brief it belonged to when it arrived) into a specific brief. Use this — not draft_document, not record_brief_update — whenever the user\'s message is naming where a document they just sent belongs, e.g. "file it under X", "that goes in the Adeyemi matter", "it\'s for Osinowo v Lukefield". Only call this when a pending document context has actually been given to you below; if none was given, there is nothing pending to file and you should treat the message as a normal instruction instead.',
        input_schema: {
            type: 'object' as const,
            properties: {
                brief_id: { type: 'string', description: 'The brief ID' },
                brief_title: { type: 'string', description: 'Search by brief title, case name, or number if ID unknown' },
            },
            required: [],
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

async function filePendingDocument(ctx: AgentContext, ref: string | undefined) {
    if (!ctx.pendingAttachment) {
        return { error: 'There is no unfiled document from you right now to file — did you mean to send the document again, or record a different kind of update?' };
    }
    if (!ref) return { error: 'Which brief/case does this go under?' };

    const resolved = await resolveBriefRef(ref, ctx.workspaceId);
    if (!resolved.ok) return resolved.result;

    const { fileInboxAttachment } = await import('@/lib/services/inbox-attachments');
    try {
        await fileInboxAttachment(ctx.pendingAttachment.id, resolved.id);
    } catch (err) {
        console.error(`[WhatsApp Agent] Failed to file pending attachment ${ctx.pendingAttachment.id}:`, err);
        return { error: 'Could not file that document — it may have already been filed. Check the Reforma Inbox.' };
    }

    return { success: true, fileName: ctx.pendingAttachment.fileName, briefId: resolved.id, briefName: resolved.name };
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
        case 'file_pending_document':
            return filePendingDocument(ctx, (input.brief_id as string | undefined) ?? (input.brief_title as string | undefined));
        case 'record_brief_update':
            return recordBriefUpdate(
                input.brief_id as string,
                workspaceId,
                ctx.userId,
                input.status_update as string | undefined,
                input.next_action as string | undefined,
            );
        case 'draft_document': {
            // Eureka's version returns Markdown text — fine to read inline in
            // a web chat, but a wall of Markdown as a WhatsApp text message is
            // a worse experience than just handing over the actual file. This
            // channel renders the same draft to a .docx and sends it as a
            // document instead of relaying the raw text.
            const result = await executeWorkspaceTool('draft_document', input, workspaceId, ctx.userId);
            if (!result || typeof result !== 'object' || 'error' in result) return result;
            const { brief, draft } = result as { brief: string; draft: string };

            try {
                const buffer = await markdownToDocxBuffer(draft, brief);
                const { put } = await import('@vercel/blob');
                const safeName = (brief || 'Draft').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 60) || 'Draft';
                const filename = `${safeName}.docx`;
                const blob = await put(`whatsapp-drafts/${workspaceId}/${Date.now()}-${filename}`, buffer, {
                    access: 'public',
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                });
                await sendWhatsAppDocument(ctx.fromNumber, blob.url, filename, `Draft for ${brief} — review before sending.`);
                return { success: true, sentAsDocument: true, filename, brief };
            } catch (err) {
                console.error('[WhatsApp Agent] Failed to render/send draft document:', err);
                return { success: true, draft, note: 'Could not send this as a file — here is the draft text instead.' };
            }
        }
        case 'create_invoice': {
            const result = await executeWorkspaceTool('create_invoice', input, workspaceId, ctx.userId);
            if (result && typeof result === 'object' && 'downloadUrl' in result) {
                const { downloadUrl, invoiceNumber } = result as { downloadUrl: string | null; invoiceNumber: string };
                if (downloadUrl) {
                    await sendWhatsAppDocument(ctx.fromNumber, downloadUrl, `${invoiceNumber}.docx`, `Invoice ${invoiceNumber}`)
                        .catch(err => console.error('[WhatsApp Agent] Failed to send invoice document:', err));
                }
            }
            return result;
        }
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
${ctx.pendingAttachment ? `
PENDING UNFILED DOCUMENT — read this before interpreting the message below: ${ctx.userName} sent "${ctx.pendingAttachment.fileName}" over WhatsApp ${ctx.pendingAttachment.minutesAgo} minute(s) ago, and Reforma could not tell which brief it belongs to — it is sitting unfiled. If the message below names or clearly identifies a brief, case, matter, or client — even briefly, e.g. "it's for Osinowo v Lukefield", "file it under BRF-0072", "that's the Adeyemi matter" — that is an instruction about THIS document. Call file_pending_document with that reference. Do not record it as a status update, a case summary, or anything about a different brief or a different document — a bare brief reference right now means "file the document I just sent there," nothing else, unless the message is unmistakably about something else entirely (a question, a reference to a different document, an explicit "no" to filing it). This takes priority over every other tool-selection rule below.
` : ''}
Never refuse a question or say you can "only help with briefs and case information" — if it's about this firm's work, there is very likely a tool for it. Try the tool that fits before concluding you can't help, and if you're genuinely unsure which one applies, make your best attempt rather than deflecting.

Rules for WhatsApp responses:
- Keep responses under 800 characters when possible — split naturally into a few messages if the answer genuinely needs more, don't cram it or truncate it
- No asterisks, anywhere, for any reason — not **markdown bold**, not WhatsApp's own *bold* syntax either. No tables, no markdown links (unlike the web chat, WhatsApp won't render them) — just say the name/number in plain prose. Write dates and headings as plain text: "18 August 2026", not "*18 August 2026*".
- Use numbered lists for chronologies
- For AI summaries, give the headline points, not the full text
- Always cite the source document when mentioning case facts
- Format money in Naira (₦) with commas

Matters vs briefs — these are different records, and this is the single most common source of a false "not found":
- A "matter" is the case-level record (court, judge, overall status); a "brief" is the work product/file within it (or can stand alone with just a client, no matter). Most named cases a user asks about are actually briefs, not matters — "the Sijuade v MBA brief" is a brief even though it names a case. If in doubt, try search_briefs/analyze_brief/get_brief_detail before get_matters/get_matter_detail, not after.
- get_matter_detail and update_matter already check for a same-named brief automatically when no matter matches, and return it as "briefSuggestions" with a "note" telling you it's a brief, not a matter. Treat that exactly like the "suggestions" case below: this is not a failure to fix "later" or report to the user as broken — it is the answer. Immediately proceed with get_brief_detail/analyze_brief/get_brief_timeline (or update_brief) using that brief, or present it to the user first only if the note suggests confirming (e.g. before updating).

Never dead-end on a brief lookup — this is non-negotiable:
- Every tool that resolves a brief (get_brief_detail, get_brief_timeline, analyze_brief, search_brief_documents, record_brief_update, update_brief) automatically falls back to the closest name matches when there's no exact hit, returned as a "suggestions" array (same names/numbers as search_briefs).
- If a tool result includes "suggestions" or "briefSuggestions", you MUST show them to the user as a short numbered list ("1. Smith v Adeyemi (BRF-014) — Adeyemi Motors\\n2. Smith v Okafor (BRF-021) — Okafor & Co\\nWhich one?") and wait for their reply — never respond with just "not found", "no results", or that there's a technical issue/database error when candidates were offered; there is no such thing as an unresolvable brief lookup in this system, only an unconfirmed one. When they answer with a number, match it against the list you just showed and immediately carry out the ORIGINAL request (the analysis, the timeline, the update, whatever they originally asked for) against the brief they picked — don't just confirm the pick and stop.
- If a tool result has an error but no "suggestions"/"briefSuggestions" at all (truly nothing close), call list_briefs as a last resort to show what's actually in the workspace before telling the user you found nothing — only report a genuine dead end after that, and never suggest there's a database problem or advise contacting technical support — there almost certainly isn't one; it means the record doesn't exist under any name close to what was given.
- If it's not obvious which brief the user means even before calling a tool, search_briefs/list_briefs first rather than guessing an id.

Choosing the right tool for a question about a brief:
- "What's the status of X" / "how's X doing" / "what's going on with X" / "give me an analysis" / "what should I do next" / "who's the ball with" → analyze_brief. This is the deep case-manager read (status, next steps, ball-in-court, open questions). Prefer it over get_brief_detail (metadata + docs/tasks, no real analysis) and over get_brief_timeline (raw timeline, no synthesis) whenever the user wants an actual answer rather than a data dump.
- Anything that needs a fact FROM INSIDE a document — a clause, a date, an amount, a name, what a witness said, what was pleaded → search_brief_documents (semantic search over document content). Never guess or answer from a chronology snippet alone when the user is asking what a document actually says. analyse_document is for going deep on one already-identified document (including PDFs and images) once you have its document_id.
- "What's happened / what's the timeline" → get_brief_timeline.
- "Draft/write a letter/reply/notice to X" → draft_document. It grounds the draft in the brief's actual filed documents via semantic search, not generic language. On WhatsApp the drafted text is automatically rendered as a real .docx file and sent to the user as a document attachment — don't paste the draft body into your reply as text, since they'll already have it as a file. Just confirm briefly (what the draft is, which brief it's grounded in) and make clear it's a draft for review: you have not sent, filed, or recorded anything by drafting it. If the user then says to file it or record it as the update, use record_brief_update or the document tools — drafting and filing are two separate steps, never combined automatically.
- "Record/log an expense" (fees paid, disbursements, filing costs, etc.) → record_expense. Confirm briefly what was recorded and against which brief/matter/client once done.
- "Create/generate/prepare an invoice/bill for X" → create_invoice. Needs the client and the line items (description + amount each); ask only for whichever of those isn't already clear from the conversation. It auto-selects the workspace's bank account and uses you (the calling lawyer) as signatory — don't ask the user to choose either. The generated invoice is rendered as a .docx and sent automatically as a document attachment, same as draft_document — confirm briefly (invoice number, client, total) rather than repeating the line items back as text.
- Naming a brief/case right after sending a document that's still unfiled → file_pending_document (see the PENDING UNFILED DOCUMENT note above, when present) — never record_brief_update or anything else for this.
- "Join/record/send the bot into a Zoom meeting [we're not hosting]" → join_zoom_meeting. Zoom links only — say so plainly if given a Meet/Teams link instead of quietly queuing it anyway. This only queues the request; it is not instant and depends on the local bot machine being on. Tell the user it's queued and the recording will land on the Recordings page once the bot has joined and the meeting has ended — don't imply it already joined.

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
