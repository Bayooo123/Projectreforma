'use server';

import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
import { resolveBrief } from '@/lib/ai-native/resolve-brief';
import { classifyIntent, type JuniorAgent } from '@/lib/ai-native/junior';
import { dispatchAgent } from '@/lib/ai-native/agents';
import { identifyForFirstDraft, buildDraftForMatter, createBriefForFacts } from '@/lib/ai-native/first-draft-flow';
import type { ExtractedCaseFacts } from '@/lib/ai-native/case-extraction';
import { createRun, updateRun, listRuns } from '@/lib/ai-native/runs';
import { addInstruction, listInstructions } from '@/lib/ai-native/instructions';
import { resolveGap, listOpenGaps } from '@/lib/ai-native/gaps';
import { getKnowledgeStatus, runKnowledgePass } from '@/lib/ai-native/knowledge-status';

async function requireWorkspaceContext() {
    const data = await getCurrentUserWithWorkspace();
    if (!data?.user || !data.workspace) throw new Error('Unauthorized: please log in to a workspace.');
    return { userId: data.user.id, workspaceId: data.workspace.id };
}

/** Step 1 for every message: Junior decides which specialist this belongs to. */
export async function classifyInput(input: string) {
    if (!input?.trim()) return { error: 'Type something for Junior to work with.' };
    const { agent, reason } = await classifyIntent(input);
    return { agent, reason };
}

/** Step 2 for anything other than First Draft — runs the specialist directly and persists the run. */
export async function executeAgent(agent: Exclude<JuniorAgent, 'first_draft'>, reason: string, input: string, briefRef: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const brief = briefRef?.trim() ? await resolveBrief(workspaceId, briefRef.trim()) : null;
    const result = await dispatchAgent(agent, { input, brief, workspaceId, userId });

    const run = await createRun({
        workspaceId, userId, briefId: brief?.id ?? null, agent, reason, input,
        kind: result.kind,
        payload: result.kind === 'ledger' ? { items: result.items, total: result.total }
            : result.kind === 'gap' ? { gapId: result.gapId, text: result.text, hint: result.hint }
            : result.kind === 'text' ? { title: result.title, text: result.text }
            : result.kind === 'error' ? { text: result.text }
            : undefined,
        steps: [[result.kind === 'error' ? 'Failed' : 'Done', result.kind === 'error' ? 'muted' : 'live']],
    });

    return { runId: run.id, agent, ...result };
}

/** Step 2 for First Draft — does this relate to a brief we already have? */
export async function identifyBriefForDraft(input: string, briefRef: string, reason: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const identified = await identifyForFirstDraft(workspaceId, input, briefRef);

    if (identified.status === 'matched') {
        return { status: 'matched' as const, briefId: identified.brief.id, briefName: identified.brief.name, facts: identified.facts };
    }

    const run = await createRun({
        workspaceId, userId, agent: 'first_draft', reason, input,
        kind: 'confirm',
        payload: identified.facts,
    });
    return { status: 'confirm' as const, runId: run.id, facts: identified.facts };
}

/** Step 3a — a matching brief was found: record the proceeding and draft against it. */
export async function draftForMatchedBrief(input: string, briefId: string, facts: ExtractedCaseFacts, reason: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId },
        include: { matter: true, client: true },
    });
    if (!brief?.matter) return { error: 'That brief no longer has a matter to write to.' };

    const result = await buildDraftForMatter(workspaceId, userId, brief.matter, brief.client?.name ?? facts.claimantName, input, facts);
    const run = await createRun({
        workspaceId, userId, briefId: brief.id, agent: 'first_draft', reason, input,
        kind: 'draft',
        payload: { draftId: result.draftId, title: result.title },
    });

    return { success: true as const, runId: run.id, ...result, briefName: brief.name };
}

/** Step 3b — no brief matched, and the lawyer confirmed creating one. Updates the same run the confirm card lived on. */
export async function confirmCreateBriefAndDraft(runId: string, input: string, facts: ExtractedCaseFacts) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const { brief, matter } = await createBriefForFacts(workspaceId, userId, facts);
    const result = await buildDraftForMatter(workspaceId, userId, matter, facts.claimantName, input, facts);

    await updateRun(runId, {
        kind: 'draft',
        briefId: brief.id,
        payload: { draftId: result.draftId, title: result.title, briefCreated: true },
    });

    return { success: true as const, runId, ...result, briefName: brief.name, briefCreated: true as const };
}

/** The lawyer said "Not now" on a confirm card — nothing is created, the run just records that. */
export async function dismissConfirm(runId: string) {
    await requireWorkspaceContext();
    await updateRun(runId, { kind: 'text', payload: { title: 'First Draft', text: 'Left as is. Nothing was created.' } });
    return { success: true };
}

/**
 * The learning-loop capture point: whatever the lawyer actually kept after
 * editing becomes finalText, on the same ClientUpdateDraft the ml/ export
 * pipeline already reads draftText-vs-finalText pairs from. This doesn't
 * make the model better by itself — that still needs an actual fine-tuning
 * run — but it's the real signal that run would train on.
 */
export async function approveAiNativeDraft(draftId: string, finalText: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const draft = await prisma.clientUpdateDraft.findFirst({ where: { id: draftId, workspaceId } });
    if (!draft) return { error: 'Draft not found.' };

    await prisma.clientUpdateDraft.update({
        where: { id: draftId },
        data: { finalText, status: 'approved', approvedById: userId, approvedAt: new Date() },
    });
    return { success: true };
}

/** "Discard" — the draft is never sent, but the run stays as a real record that it happened. */
export async function discardAiNativeDraft(runId: string, draftId: string) {
    const { workspaceId } = await requireWorkspaceContext();
    const draft = await prisma.clientUpdateDraft.findFirst({ where: { id: draftId, workspaceId } });
    if (draft) {
        await prisma.clientUpdateDraft.update({ where: { id: draftId }, data: { status: 'discarded' } });
    }
    await updateRun(runId, { kind: 'text', payload: { title: 'First Draft', text: 'Discarded — nothing was sent.' } });
    return { success: true };
}

export async function addInstructionAction(text: string, briefId: string | null) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    if (!text?.trim()) return { error: 'Type something for Junior to remember.' };

    await addInstruction(workspaceId, userId, text.trim(), briefId);
    const run = await createRun({
        workspaceId, userId, briefId, agent: 'instruction', input: text.trim(),
        kind: 'instruction',
        steps: [[briefId ? 'Saved to this brief' : 'Saved firm-wide', 'live']],
    });
    return { success: true, runId: run.id };
}

export async function resolveGapAction(gapId: string, answer: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    return resolveGap(workspaceId, userId, gapId, answer);
}

export async function listRunsAction(briefId?: string | null) {
    const { workspaceId } = await requireWorkspaceContext();
    return listRuns(workspaceId, briefId ?? null);
}

export async function listOpenGapsAction(briefId?: string | null) {
    const { workspaceId } = await requireWorkspaceContext();
    return listOpenGaps(workspaceId, briefId ?? null);
}

export async function listInstructionsAction(briefId?: string | null) {
    const { workspaceId } = await requireWorkspaceContext();
    return listInstructions(workspaceId, briefId ?? null);
}

export async function getKnowledgeStatusAction() {
    const { workspaceId } = await requireWorkspaceContext();
    return getKnowledgeStatus(workspaceId);
}

export async function runKnowledgePassAction() {
    const { workspaceId } = await requireWorkspaceContext();
    return runKnowledgePass(workspaceId);
}

export async function listBriefsWithStatus() {
    const { workspaceId } = await requireWorkspaceContext();
    const briefs = await prisma.brief.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: {
            id: true, name: true, briefNumber: true,
            matter: { select: { id: true, court: true, judge: true, nextCourtDate: true } },
        },
    });

    const [openGapBriefIds, pendingDraftMatterIds] = await Promise.all([
        prisma.knowledgeGap.findMany({ where: { workspaceId, status: 'open' }, select: { briefId: true } }),
        prisma.clientUpdateDraft.findMany({ where: { workspaceId, status: 'pending' }, select: { matterId: true } }),
    ]);
    const gapBriefSet = new Set(openGapBriefIds.map(g => g.briefId));
    const pendingMatterSet = new Set(pendingDraftMatterIds.map(d => d.matterId));

    return briefs.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        court: b.matter?.court ?? null,
        judge: b.matter?.judge ?? null,
        nextDate: b.matter?.nextCourtDate?.toISOString() ?? null,
        pending: gapBriefSet.has(b.id) || (b.matter ? pendingMatterSet.has(b.matter.id) : false),
    }));
}

export async function getLedgerSummary() {
    const { workspaceId } = await requireWorkspaceContext();
    const entries = await prisma.expense.findMany({
        where: { workspaceId },
        orderBy: { date: 'desc' },
        take: 20,
    });
    const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    return {
        total,
        entries: entries.map(e => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            category: e.category,
            date: e.date.toISOString(),
        })),
    };
}
