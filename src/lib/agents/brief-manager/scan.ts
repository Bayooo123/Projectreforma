import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { sendWhatsAppMessage } from '@/lib/agents/whatsapp/send';

export type BallInCourtStatus = 'us' | 'opposing_counsel' | 'court' | 'unclear';
export type RepresentationConfidence = 'confirmed' | 'inferred' | 'unclear';

export interface BriefExecutiveSummary {
    currentStatus: string;
    background: string;
    keyDevelopments: string[];
    outstandingIssues: string[];
}

export interface BriefManagerInsightData {
    // Optional for backward compatibility with insights generated before this
    // field existed — the board falls back to it when `summary` is absent.
    lastActivity?: string;
    summary: BriefExecutiveSummary;
    nextSteps: string[];
    ballInCourt: { status: BallInCourtStatus; rationale: string };
    representing: { party: string; confidence: RepresentationConfidence };
    questions: string[];
    needsDocuments: boolean;
    docRequestReason?: string;
    needsClientUpdate: boolean;
    daysSinceClientContact: number;
}

interface GeneratedInsight {
    title: string;
    summary: string;
    data: BriefManagerInsightData;
    lastSignalAt: Date;
}

// Distinguishes *why* generation didn't produce an insight — a parse failure,
// an API error, and "brief isn't active" used to all collapse into the same
// bare `null`, so a "Check now" failure told the user nothing beyond a dead
// end. Every caller now gets a real reason to show or log.
export type InsightGenerationResult =
    | { success: true; insight: GeneratedInsight }
    | { success: false; reason: string };

const MAX_CHRONOLOGY_ROWS = 30;
const MAX_PULSE_EVENTS = 5;
const MAX_TASKS = 10;
const MAX_MEMORY_ENTRIES = 15;
const MAX_RECENT_DOCS = 3;
const MAX_DOC_CHARS = 2000;
const CLIENT_UPDATE_THRESHOLD_DAYS = 14;
const DORMANT_RECHECK_COOLDOWN_DAYS = 7;

function getClient(): Anthropic | null {
    if (!config.ANTHROPIC_API_KEY) return null;
    return new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
}

function parseJSON<T>(text: string): T | null {
    try {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean) as T;
    } catch {
        return null;
    }
}

const BALL_IN_COURT_LABEL: Record<BallInCourtStatus, string> = {
    us: 'Waiting on you',
    opposing_counsel: 'Waiting on opposing counsel',
    court: 'Waiting on the court',
    unclear: 'Status unclear',
};

// The most recent activity timestamp across everything that could change our
// assessment of a brief — used to decide whether a fresh scan is warranted.
async function computeLastSignalAt(briefId: string, briefCreatedAt: Date): Promise<Date> {
    const [lastPulse, lastTimeline, lastCalendar, lastTask, lastMemory] = await Promise.all([
        prisma.pulseEvent.findFirst({ where: { briefId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.documentTimelineEvent.findFirst({ where: { briefId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.calendarEntry.findFirst({ where: { briefId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
        prisma.task.findFirst({ where: { briefId }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
        prisma.briefActivityLog.findFirst({ where: { briefId, activityType: { in: ['agent_memory', 'status_changed'] } }, orderBy: { timestamp: 'desc' }, select: { timestamp: true } }),
    ]);

    const dates = [briefCreatedAt, lastPulse?.createdAt, lastTimeline?.createdAt, lastCalendar?.updatedAt, lastTask?.updatedAt, lastMemory?.timestamp]
        .filter((d): d is Date => !!d);
    return new Date(Math.max(...dates.map(d => d.getTime())));
}

// The client hearing from us — distinct from computeLastSignalAt, which tracks
// ANY activity. A brief can be internally very active while the client hears
// nothing, which is exactly the gap this exists to catch.
async function computeDaysSinceClientContact(briefId: string, briefCreatedAt: Date): Promise<number> {
    const [lastClientPulse, lastUpdateSent] = await Promise.all([
        prisma.pulseEvent.findFirst({
            where: { briefId, senderType: 'client' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        }),
        prisma.briefActivityLog.findFirst({
            where: { briefId, activityType: 'agent_memory', metadata: { path: ['clientUpdateSent'], equals: true } },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
        }),
    ]);

    const dates = [briefCreatedAt, lastClientPulse?.createdAt, lastUpdateSent?.timestamp].filter((d): d is Date => !!d);
    const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
    return Math.floor((Date.now() - mostRecent.getTime()) / 86_400_000);
}

function buildPrompt(input: {
    brief: {
        name: string; briefNumber: string; category: string; status: string; dueDate: string | null;
        client: string | null; lawyerInCharge: string | null;
        matter: { opponentName: string | null; opponentCounsel: string | null; nextCourtDate: string | null; lastClientContact: string | null } | null;
        aiSummaryProse: string | null;
    };
    chronology: string;
    pulseEvents: string;
    tasks: string;
    nextHearing: string;
    recordedByLawyers: string;
    recentDocuments: string;
    daysSinceClientContact: number;
}): string {
    return `You are a Legal Case Manager assistant for a Nigerian law firm, reviewing one brief (case file) to brief a partner on its status.

## Brief
Name: ${input.brief.name} (${input.brief.briefNumber})
Category: ${input.brief.category}
Status: ${input.brief.status}
Client: ${input.brief.client ?? 'Unknown'}
Lawyer in charge: ${input.brief.lawyerInCharge ?? 'Unassigned'}
Due date: ${input.brief.dueDate ?? 'None set'}
${input.brief.matter ? `Opposing party: ${input.brief.matter.opponentName ?? 'Unknown'}
Opposing counsel: ${input.brief.matter.opponentCounsel ?? 'Unknown'}
Last client contact: ${input.brief.matter.lastClientContact ?? 'Unknown'}` : ''}

## Existing case summary (may be stale)
${input.brief.aiSummaryProse ?? 'No summary generated yet.'}

## Document-derived chronology (most recent first)
${input.chronology || 'No dated events extracted yet.'}

## Recent document contents (most recently uploaded first — read these for concrete next steps, not just the chronology)
${input.recentDocuments || 'No document text available.'}

## Recent correspondence (most recent first)
${input.pulseEvents || 'No correspondence logged.'}

## Open tasks
${input.tasks || 'None.'}

## Next hearing
${input.nextHearing || 'None scheduled.'}

## Recorded by lawyers (told directly to Brief Manager, most recent first)
${input.recordedByLawyers || 'Nothing recorded yet.'}

## Days since the client last heard from us
${input.daysSinceClientContact} (flag as needing a courtesy update past ${CLIENT_UPDATE_THRESHOLD_DAYS} days)

---

Write like a senior associate handing this file to a partner before a meeting — synthesised, not a data dump. Respond with EXACTLY this JSON (no markdown fences, no commentary):
{
  "summary": {
    "currentStatus": "<1-2 sentences, forward-looking, NOT a chronological recap: state the LAST thing that happened (the most recent single development) and the LIKELY NEXT ACTION(S) — this is the one line a lawyer sees by default on the board, so it must read like 'here's where we just landed, and here's what's probably coming next', not a mini-history of dated events>",
    "background": "<2-4 sentences: how the matter reached this stage — the short version, not the full chronology>",
    "keyDevelopments": ["<a significant filing, ruling, correspondence, or action — most recent first>", "..."],
    "outstandingIssues": ["<something unresolved that needs attention or a decision>", "..."]
  },
  "nextSteps": ["<specific, actionable next step — ground this in the recent document contents where possible, not just the chronology summary>", "..."],
  "ballInCourt": {
    "status": "<us|opposing_counsel|court|unclear>",
    "rationale": "<one sentence explaining why, based on who sent the most recent correspondence and open tasks/hearings>"
  },
  "representing": {
    "party": "<which party the firm acts for, e.g. 'Claimant', 'Defendant', 'Applicant', named specifically if known — infer from client name, document content, and correspondence direction>",
    "confidence": "<confirmed|inferred|unclear>"
  },
  "questions": ["<a specific question you would ask the responsible lawyer, phrased naturally — see the rule on when to ask 'what's happened since / what's next', and include a question about which party we represent if representing.confidence is 'unclear'>"],
  "needsDocuments": <true|false>,
  "docRequestReason": "<if needsDocuments is true, what specifically is missing and why you need it before you can say more — omit if false>"
}

Rules:
- Ground every statement in the material above — never invent facts, dates, or names not present.
- "summary" is the synthesised executive view — currentStatus and background should read as prose a partner can absorb in seconds, not a list of every event; keyDevelopments and outstandingIssues are short bullet-style items, not paragraphs.
- currentStatus is NOT a second chronology. Do not narrate two or three past events with their dates — that belongs in background/keyDevelopments. currentStatus answers exactly two questions: what just happened (most recently), and what's likely to happen next. If the most recent thing was a lawyer directly telling Brief Manager something (see "Recorded by lawyers"), lead with that — it is more current than the document chronology.
- If the material is too thin to say anything useful, set needsDocuments: true and explain what's missing in docRequestReason.
- "ballInCourt" must be your best inference from who sent the most recent correspondence (client/court/opposing counsel) and whether there are open tasks or upcoming hearings requiring firm action — use "unclear" if genuinely ambiguous, do not guess wildly.
- "representing" must not be guessed wildly either — set confidence "unclear" and ask about it in questions rather than assume, if the material doesn't make it reasonably clear.
- Documents and correspondence only ever establish what was true as of when they were written — they cannot tell you what's happened since. Whenever your understanding is built mostly from documents/chronology rather than something a lawyer told you directly, or the most recent dated material is old relative to today, lead with a direct question: what has happened on this matter since <the most recent date you actually have>, and what's next? Ask this even when you can otherwise describe the file confidently — having documents is not the same as being current.
- Waiting on the other side or the court ("ballInCourt" not "us") is NOT a reason to skip a client update — if days since client contact exceeds ${CLIENT_UPDATE_THRESHOLD_DAYS}, include a next step to send the client a courtesy update on where things stand, even if there's nothing else for the firm to do right now.
- questions should be 1-3 items, phrased as a case manager would ask a partner, not generic.`;
}

export async function generateBriefManagerInsight(briefId: string): Promise<InsightGenerationResult> {
    const client = getClient();
    if (!client) return { success: false, reason: 'AI is not configured for this workspace (missing API key).' };

    const brief = await prisma.brief.findUnique({
        where: { id: briefId, deletedAt: null },
        select: {
            name: true, briefNumber: true, category: true, status: true, dueDate: true,
            createdAt: true, aiSummaryProse: true,
            client: { select: { name: true } },
            lawyerInCharge: { select: { name: true } },
            lawyer: { select: { name: true } },
            matter: {
                select: {
                    opponentName: true, opponentCounsel: true,
                    nextCourtDate: true, lastClientContact: true,
                },
            },
        },
    });
    if (!brief) return { success: false, reason: 'Brief not found.' };
    if (brief.status !== 'active') return { success: false, reason: `Brief status is "${brief.status}", not active — Brief Manager only reviews active briefs.` };

    const [chronologyRows, pulseEvents, openTasks, nextHearing, memoryEntries, recentDocs] = await Promise.all([
        prisma.documentTimelineEvent.findMany({
            where: { briefId },
            orderBy: { eventDate: 'desc' },
            take: MAX_CHRONOLOGY_ROWS,
            select: { eventDateRaw: true, description: true },
        }),
        prisma.pulseEvent.findMany({
            where: { briefId },
            orderBy: { createdAt: 'desc' },
            take: MAX_PULSE_EVENTS,
            select: { createdAt: true, senderType: true, senderName: true, intent: true, summary: true },
        }),
        prisma.task.findMany({
            where: { briefId, status: { not: 'completed' } },
            orderBy: { dueDate: 'asc' },
            take: MAX_TASKS,
            select: { title: true, dueDate: true, status: true },
        }),
        prisma.calendarEntry.findFirst({
            where: { briefId, date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            select: { date: true, adjournedFor: true, court: true },
        }),
        prisma.briefActivityLog.findMany({
            where: { briefId, activityType: { in: ['agent_memory', 'status_changed'] } },
            orderBy: { timestamp: 'desc' },
            take: MAX_MEMORY_ENTRIES,
            select: { timestamp: true, description: true },
        }),
        prisma.document.findMany({
            where: { briefId, ocrText: { not: null } },
            orderBy: { uploadedAt: 'desc' },
            take: MAX_RECENT_DOCS,
            select: { name: true, ocrText: true },
        }),
    ]);

    const lastSignalAt = await computeLastSignalAt(briefId, brief.createdAt);
    const daysSinceClientContact = await computeDaysSinceClientContact(briefId, brief.createdAt);

    const prompt = buildPrompt({
        brief: {
            name: brief.name,
            briefNumber: brief.briefNumber,
            category: brief.category,
            status: brief.status,
            dueDate: brief.dueDate?.toISOString().slice(0, 10) ?? null,
            client: brief.client?.name ?? null,
            lawyerInCharge: brief.lawyerInCharge?.name ?? brief.lawyer?.name ?? null,
            matter: brief.matter ? {
                opponentName: brief.matter.opponentName,
                opponentCounsel: brief.matter.opponentCounsel,
                nextCourtDate: brief.matter.nextCourtDate?.toISOString().slice(0, 10) ?? null,
                lastClientContact: brief.matter.lastClientContact?.toISOString().slice(0, 10) ?? null,
            } : null,
            aiSummaryProse: brief.aiSummaryProse,
        },
        chronology: chronologyRows.map(r => `- ${r.eventDateRaw}: ${r.description}`).join('\n'),
        pulseEvents: pulseEvents.map(p =>
            `- ${p.createdAt.toISOString().slice(0, 10)} [${p.senderType ?? 'unknown'}] ${p.senderName ?? ''}: ${p.intent} — ${p.summary}`
        ).join('\n'),
        tasks: openTasks.map(t => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate.toISOString().slice(0, 10)})` : ''} [${t.status}]`).join('\n'),
        nextHearing: nextHearing
            ? `${nextHearing.date.toISOString().slice(0, 10)}${nextHearing.court ? ` at ${nextHearing.court}` : ''}${nextHearing.adjournedFor ? ` — ${nextHearing.adjournedFor}` : ''}`
            : '',
        recordedByLawyers: memoryEntries.map(m => `- ${m.timestamp.toISOString().slice(0, 10)}: ${m.description}`).join('\n'),
        recentDocuments: recentDocs.map(d => `--- ${d.name} ---\n${(d.ocrText ?? '').slice(0, MAX_DOC_CHARS)}`).join('\n\n'),
        daysSinceClientContact,
    });

    let data: BriefManagerInsightData | null = null;
    let rawText = '';
    try {
        const response = await client.messages.create({
            model: 'claude-sonnet-5',
            // Raised from 1024: the executive-summary schema (4-part summary plus
            // nextSteps/ballInCourt/representing/questions) can run the model's
            // JSON output long enough on a correspondence-heavy brief to get cut
            // off mid-response, which then silently fails to parse below.
            max_tokens: 2048,
            system: 'You are a meticulous legal case manager. Return only valid JSON — no markdown, no explanation.',
            messages: [{ role: 'user', content: prompt }],
        });
        rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
        data = parseJSON<BriefManagerInsightData>(rawText);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BriefManager] Insight generation failed for brief ${briefId}:`, error);
        return { success: false, reason: `AI request failed: ${message}` };
    }
    if (!data) {
        console.error(`[BriefManager] Could not parse AI response for brief ${briefId} (${rawText.length} chars). Preview: ${rawText.slice(0, 300)}`);
        return { success: false, reason: 'The AI response could not be parsed — it may have been truncated or malformed. Try again; if it keeps happening, this brief may have unusually long correspondence history.' };
    }

    // Deterministic, not left to the model's own arithmetic — these two fields
    // are always computed here, overwriting whatever (if anything) the LLM guessed.
    data.daysSinceClientContact = daysSinceClientContact;
    data.needsClientUpdate = daysSinceClientContact > CLIENT_UPDATE_THRESHOLD_DAYS;

    // Defensive: the model's JSON can omit a field it was asked for (truncation,
    // an edge-case brief with almost nothing to go on, etc). Reading straight
    // into data.ballInCourt.status / data.nextSteps[0] without guards used to
    // throw here — uncaught, since this ran after the try/catch above — which
    // silently killed the whole insight with no error surfaced anywhere up the
    // call chain. Every field touched below is optional-chained instead.
    const currentStatus = data.summary?.currentStatus ?? data.lastActivity ?? '';
    const nextStep = data.nextSteps?.[0];
    const ballInCourtStatus = data.ballInCourt?.status;
    const summary = data.needsDocuments
        ? `Needs more documents — ${data.docRequestReason ?? 'insufficient information'}`
        : data.needsClientUpdate
            ? `Client update overdue — ${daysSinceClientContact} days. ${nextStep ?? currentStatus}`
            : `${(ballInCourtStatus && BALL_IN_COURT_LABEL[ballInCourtStatus]) ?? 'Status unclear'}. ${nextStep ?? currentStatus}`;

    return {
        success: true,
        insight: {
            title: brief.name,
            summary,
            data,
            lastSignalAt,
        },
    };
}

export async function upsertInsightForBrief(workspaceId: string, briefId: string, generated: GeneratedInsight): Promise<'created' | 'updated'> {
    const existing = await prisma.agentInsight.findFirst({
        where: { workspaceId, briefId, agentType: 'brief_manager', status: { in: ['new', 'viewed'] } },
        select: { id: true },
    });

    // Keep Brief.aiSummaryProse — the summary Eureka and the WhatsApp agent
    // actually read — in sync with what Pulse just synthesized, instead of
    // leaving it to drift until someone happens to click "Generate summary."
    // This is free: the LLM call already happened to produce this insight:
    // no second summarization call, just reusing its output where the other
    // two surfaces look for it. (aiSummaryChronology is left untouched — this
    // pipeline doesn't produce an equivalent structured chronology.)
    await prisma.brief.update({
        where: { id: briefId },
        data: {
            aiSummaryProse: generated.data.summary.currentStatus,
            aiSummaryGeneratedAt: new Date(),
        },
    }).catch(err => console.error(`[BriefManager] Failed to sync aiSummaryProse for brief ${briefId}:`, err));

    if (existing) {
        await prisma.agentInsight.update({
            where: { id: existing.id },
            data: {
                title: generated.title,
                summary: generated.summary,
                data: generated.data as unknown as Prisma.InputJsonValue,
                lastSignalAt: generated.lastSignalAt,
                status: 'new',
            },
        });
        return 'updated';
    }

    await prisma.agentInsight.create({
        data: {
            workspaceId,
            briefId,
            agentType: 'brief_manager',
            title: generated.title,
            summary: generated.summary,
            data: generated.data as unknown as Prisma.InputJsonValue,
            lastSignalAt: generated.lastSignalAt,
        },
    });
    return 'created';
}

// Closes the loop from "detected obligation" to "the responsible lawyer knows
// right now" — without this, a fresh insight just sits on the board until
// someone happens to open Reforma. Only fires for the three cases that are
// genuinely someone's job to act on, not every reshuffled chronology.
function buildNudgeMessage(brief: { name: string; briefNumber: string }, data: BriefManagerInsightData): string {
    const reasons: string[] = [];
    if (data.ballInCourt?.status === 'us') reasons.push(BALL_IN_COURT_LABEL.us);
    if (data.needsClientUpdate) reasons.push(`Client update overdue — ${data.daysSinceClientContact}d since last contact`);
    if (data.needsDocuments) reasons.push(`Needs documents — ${data.docRequestReason ?? 'more information required'}`);

    const lines = [`⚖️ *${brief.name}* (${brief.briefNumber})`, reasons.join(' · ')];
    const nextStep = data.nextSteps?.[0];
    if (nextStep) lines.push(`Next: ${nextStep}`);
    lines.push('Reply here to update Brief Manager, or open Reforma for the full brief.');
    return lines.join('\n');
}

async function notifyResponsibleLawyer(
    brief: { id: string; name: string; briefNumber: string; lawyerId: string; lawyerInChargeId: string | null },
    data: BriefManagerInsightData,
): Promise<void> {
    const isActionable = data.ballInCourt?.status === 'us' || data.needsClientUpdate || data.needsDocuments;
    if (!isActionable) return;

    const responsibleId = brief.lawyerInChargeId ?? brief.lawyerId;
    const user = await prisma.user.findUnique({ where: { id: responsibleId }, select: { phone: true } });
    if (!user?.phone) return;

    await sendWhatsAppMessage(user.phone.replace(/\D/g, ''), buildNudgeMessage(brief, data))
        .catch(err => console.error(`[BriefManager] Nudge failed for brief ${brief.id}:`, err));
}

export async function scanBriefsForWorkspace(workspaceId: string): Promise<{ created: number; updated: number; skipped: number }> {
    const [briefs, existingInsights] = await Promise.all([
        prisma.brief.findMany({
            where: { workspaceId, status: 'active', deletedAt: null },
            select: { id: true, createdAt: true, name: true, briefNumber: true, lawyerId: true, lawyerInChargeId: true },
        }),
        prisma.agentInsight.findMany({
            where: { workspaceId, agentType: 'brief_manager', status: { in: ['new', 'viewed'] } },
            select: { briefId: true, lastSignalAt: true, createdAt: true, data: true },
        }),
    ]);

    const priorByBrief = new Map(
        existingInsights.filter((i): i is typeof i & { briefId: string } => !!i.briefId).map(i => [i.briefId, i])
    );

    let created = 0, updated = 0, skipped = 0;

    for (const brief of briefs) {
        const prior = priorByBrief.get(brief.id);
        const currentSignal = await computeLastSignalAt(brief.id, brief.createdAt);
        const hasNewSignal = !prior || currentSignal.getTime() > prior.lastSignalAt.getTime();

        if (!hasNewSignal) {
            // No new activity — this is exactly the dormant case, so it needs its
            // own check rather than being skipped outright like a "nothing changed" brief.
            const daysSinceClientContact = await computeDaysSinceClientContact(brief.id, brief.createdAt);
            const isDormant = daysSinceClientContact > CLIENT_UPDATE_THRESHOLD_DAYS;

            if (!isDormant) {
                skipped++;
                continue;
            }

            const alreadyFlagged = !!(prior?.data as unknown as BriefManagerInsightData | undefined)?.needsClientUpdate;
            const insightAgeDays = prior ? (Date.now() - prior.createdAt.getTime()) / 86_400_000 : Infinity;
            if (alreadyFlagged && insightAgeDays < DORMANT_RECHECK_COOLDOWN_DAYS) {
                // Already flagged recently — don't re-run the LLM every night while dormant.
                skipped++;
                continue;
            }
        }

        const generated = await generateBriefManagerInsight(brief.id);
        if (!generated.success) {
            console.error(`[BriefManager] Nightly scan skipped brief ${brief.id}: ${generated.reason}`);
            skipped++;
            continue;
        }

        const result = await upsertInsightForBrief(workspaceId, brief.id, generated.insight);
        if (result === 'created') created++; else updated++;

        await notifyResponsibleLawyer(brief, generated.insight.data);
    }

    return { created, updated, skipped };
}

export async function scanBriefsAllWorkspaces(): Promise<void> {
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    await Promise.all(workspaces.map(w => scanBriefsForWorkspace(w.id).catch(console.error)));
}
