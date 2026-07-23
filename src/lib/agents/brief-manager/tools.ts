import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { SYSTEM_PROMPTS } from '@/lib/drafting/prompts';
import { addBriefActivity } from '@/lib/briefs';
import { calculateTextSimilarity } from '@/lib/services/ocr-versioning';
import { generateBriefManagerInsight, type BriefManagerInsightData } from './scan';

// Below this, a lawyer's statement is treated as unrelated to any existing
// record rather than a restatement of it — lower than ocr-versioning's 0.85
// document-version threshold since these are short sentences, not whole documents.
const SIMILAR_FACT_THRESHOLD = 0.5;

function tool(name: string, description: string, properties: Record<string, unknown>, required?: string[]) {
    return { name, description, input_schema: { type: 'object' as const, properties, ...(required && { required }) } };
}

export const BRIEF_MANAGER_TOOLS = [
    tool('answer_from_brief_data', 'Fetch fresh data about the brief to answer a follow-up question — use this rather than guessing when the user asks about something not already covered in the insight.', {
        aspect: { type: 'string', description: 'Which aspect to fetch', enum: ['timeline', 'tasks', 'hearings', 'correspondence', 'documents'] },
    }, ['aspect']),

    tool('read_document', 'Read the full text of one specific document in this brief\'s vault — use this when a document needs closer reading than the short snippet already in context, or the lawyer references a specific document by name.', {
        name: { type: 'string', description: 'The document name, or a distinctive part of it — matched case-insensitively' },
    }, ['name']),

    tool('draft_client_update', 'Draft a short client-facing status update email grounded in this brief\'s known facts. Only call this after the user agrees they want a draft.', {
        instruction: { type: 'string', description: 'Any specific tone/content instruction from the lawyer for this update (optional)' },
    }, []),

    tool('request_documents', 'Flag that more documents are needed before you can say anything further useful about this brief, and show the user an inline upload prompt.', {
        reason: { type: 'string', description: 'Specifically what is missing and why it is needed' },
    }, ['reason']),

    tool('record_brief_update', 'Record something the lawyer just told you about this brief as permanent case history. Call this IMMEDIATELY whenever the lawyer states any fact or update — do not wait for confirmation, and never let asking a follow-up question delay this.', {
        statement: { type: 'string', description: 'The fact/update as the lawyer stated it, rewritten as one clear standalone sentence' },
    }, ['statement']),

    tool('mark_client_updated', 'Record that the client has just been sent an update on this brief — resets the "client update overdue" flag. Call this when the lawyer confirms they sent the client update (e.g. after using draft_client_update and sending it).', {
        note: { type: 'string', description: 'Optional short note on what was sent' },
    }, []),

    tool('mark_resolved', 'Mark this brief check-in as resolved — the user has addressed what was raised.', {
        note: { type: 'string', description: 'Short note on the resolution' },
    }, []),

    tool('dismiss', 'Dismiss this check-in without resolving it — the user doesn\'t need to act on it right now.', {
        note: { type: 'string', description: 'Short note on why' },
    }, []),
];

async function fetchAspect(briefId: string, aspect: string) {
    switch (aspect) {
        case 'timeline':
            return prisma.documentTimelineEvent.findMany({
                where: { briefId },
                orderBy: { eventDate: 'desc' },
                take: 30,
                select: { eventDateRaw: true, description: true, documentName: true },
            });
        case 'tasks':
            return prisma.task.findMany({
                where: { briefId },
                orderBy: { dueDate: 'asc' },
                take: 20,
                select: { title: true, status: true, dueDate: true, priority: true },
            });
        case 'hearings':
            return prisma.calendarEntry.findMany({
                where: { briefId },
                orderBy: { date: 'desc' },
                take: 10,
                select: { date: true, court: true, proceedings: true, outcome: true, adjournedFor: true },
            });
        case 'correspondence':
            return prisma.pulseEvent.findMany({
                where: { briefId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { createdAt: true, senderType: true, senderName: true, intent: true, summary: true },
            });
        case 'documents':
            return (await prisma.document.findMany({
                where: { briefId },
                orderBy: { uploadedAt: 'desc' },
                take: 30,
                select: { name: true, type: true, uploadedAt: true, ocrStatus: true, ocrText: true },
            })).map(d => ({
                name: d.name, type: d.type, uploadedAt: d.uploadedAt, ocrStatus: d.ocrStatus,
                snippet: d.ocrText ? d.ocrText.slice(0, 300) : null,
            }));
        default:
            return { error: `Unknown aspect: ${aspect}` };
    }
}

const MAX_READ_DOCUMENT_CHARS = 6000;

async function readDocument(briefId: string, name: string) {
    const document = await prisma.document.findFirst({
        where: { briefId, name: { contains: name, mode: 'insensitive' } },
        orderBy: { uploadedAt: 'desc' },
        select: { name: true, ocrStatus: true, ocrText: true },
    });
    if (!document) return { error: `No document matching "${name}" found in this brief's vault.` };
    if (!document.ocrText) return { name: document.name, error: `"${document.name}" has no extracted text yet (OCR status: ${document.ocrStatus}).` };
    return { name: document.name, text: document.ocrText.slice(0, MAX_READ_DOCUMENT_CHARS) };
}

async function draftClientUpdate(briefId: string, insightData: BriefManagerInsightData, instruction?: string): Promise<{ draft: string } | { error: string }> {
    if (!config.ANTHROPIC_API_KEY) return { error: 'Drafting is not configured.' };

    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        select: { name: true, aiSummaryProse: true, client: { select: { name: true } } },
    });
    if (!brief) return { error: 'Brief not found.' };

    const currentStatus = insightData.summary?.currentStatus ?? insightData.lastActivity;
    const context = [
        `Brief: ${brief.name}`,
        brief.client?.name ? `Client: ${brief.client.name}` : null,
        brief.aiSummaryProse ? `Case summary:\n${brief.aiSummaryProse}` : null,
        insightData.summary?.background ? `Background: ${insightData.summary.background}` : null,
        currentStatus ? `Most recent activity: ${currentStatus}` : null,
        `Next steps: ${insightData.nextSteps.join('; ')}`,
        `Current position: ${insightData.ballInCourt.rationale}`,
    ].filter(Boolean).join('\n\n');

    const prompt = SYSTEM_PROMPTS.CLIENT_UPDATE_INSTRUCTION
        .replace('{{CONTEXT}}', context)
        .replace('{{INSTRUCTION}}', instruction || 'Write a routine status update.');

    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    try {
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPTS.SENIOR_ASSOCIATE,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        if (!text) return { error: 'Drafting failed — empty response.' };
        return { draft: text };
    } catch (error) {
        console.error('[BriefManager] draft_client_update failed:', error);
        return { error: 'Drafting failed.' };
    }
}

async function recordBriefUpdate(briefId: string, insightId: string, userId: string | undefined, statement: string) {
    const [recentActivity, brief] = await Promise.all([
        prisma.briefActivityLog.findMany({
            where: { briefId },
            orderBy: { timestamp: 'desc' },
            take: 20,
            select: { description: true },
        }),
        prisma.brief.findUnique({ where: { id: briefId }, select: { aiSummaryProse: true } }),
    ]);

    const knownTexts = [...recentActivity.map(a => a.description), brief?.aiSummaryProse ?? ''].filter(Boolean);
    const likelyNew = !knownTexts.some(known => calculateTextSimilarity(known, statement) > SIMILAR_FACT_THRESHOLD);

    await addBriefActivity(briefId, 'agent_memory', statement, { source: 'brief_manager_chat', insightId, likelyNew }, userId);

    // The saved fact is what matters and must never be lost even if this fails —
    // regeneration only refreshes the board's cached view (status/next steps/
    // needsDocuments) to reflect it immediately, instead of leaving it stale
    // until the next nightly scan or a manual "Check now".
    if (likelyNew) {
        try {
            const generated = await generateBriefManagerInsight(briefId);
            if (generated) {
                await prisma.agentInsight.update({
                    where: { id: insightId },
                    data: {
                        title: generated.title,
                        summary: generated.summary,
                        data: generated.data as unknown as Prisma.InputJsonValue,
                        lastSignalAt: generated.lastSignalAt,
                    },
                });
            }
        } catch (error) {
            console.error('[BriefManager] Failed to refresh insight after record_brief_update:', error);
        }
    }

    return {
        recorded: true,
        likelyNew,
        message: likelyNew
            ? 'Recorded, and the case assessment has been refreshed to reflect it — you may ask ONE short optional clarifying question, but it is already saved and reflected either way.'
            : 'Recorded — this matches what was already known, no need to ask further.',
    };
}

async function markClientUpdated(briefId: string, insightId: string, userId: string | undefined, insightData: BriefManagerInsightData, note?: string) {
    const statement = note ? `Client updated: ${note}` : 'Client sent a status update.';
    await addBriefActivity(briefId, 'agent_memory', statement, { source: 'brief_manager_chat', insightId, clientUpdateSent: true }, userId);

    const updatedData: BriefManagerInsightData = { ...insightData, needsClientUpdate: false, daysSinceClientContact: 0 };
    await prisma.agentInsight.update({ where: { id: insightId }, data: { data: updatedData as unknown as Prisma.InputJsonValue } });

    return { success: true, message: 'Recorded — client update flag cleared.' };
}

export async function executeBriefManagerTool(
    name: string,
    input: Record<string, unknown>,
    ctx: { insightId: string; briefId: string; insightData: BriefManagerInsightData; userId?: string },
) {
    switch (name) {
        case 'answer_from_brief_data':
            return { data: await fetchAspect(ctx.briefId, String(input.aspect ?? '')) };

        case 'read_document':
            return readDocument(ctx.briefId, String(input.name ?? ''));

        case 'draft_client_update':
            return draftClientUpdate(ctx.briefId, ctx.insightData, typeof input.instruction === 'string' ? input.instruction : undefined);

        case 'record_brief_update':
            return recordBriefUpdate(ctx.briefId, ctx.insightId, ctx.userId, String(input.statement ?? ''));

        case 'mark_client_updated':
            return markClientUpdated(ctx.briefId, ctx.insightId, ctx.userId, ctx.insightData, typeof input.note === 'string' ? input.note : undefined);

        case 'request_documents': {
            const updatedData: BriefManagerInsightData = { ...ctx.insightData, needsDocuments: true, docRequestReason: String(input.reason ?? '') };
            await prisma.agentInsight.update({ where: { id: ctx.insightId }, data: { data: updatedData as unknown as Prisma.InputJsonValue } });
            return { success: true, message: 'Upload prompt shown to the user.' };
        }

        case 'mark_resolved':
            await prisma.agentInsight.update({ where: { id: ctx.insightId }, data: { status: 'resolved', resolvedAt: new Date() } });
            return { success: true, resolved: true, message: 'Marked resolved.' };

        case 'dismiss':
            await prisma.agentInsight.update({ where: { id: ctx.insightId }, data: { status: 'dismissed', dismissedAt: new Date() } });
            return { success: true, dismissed: true, message: 'Dismissed.' };

        default:
            return { error: `Unknown tool: ${name}` };
    }
}
