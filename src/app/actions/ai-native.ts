'use server';

import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
import { resolveBrief } from '@/lib/ai-native/resolve-brief';
import { classifyIntent, type JuniorAgent } from '@/lib/ai-native/junior';
import { dispatchAgent } from '@/lib/ai-native/agents';
import { identifyForFirstDraft, buildDraftForMatter, createBriefForFacts } from '@/lib/ai-native/first-draft-flow';
import type { ExtractedCaseFacts } from '@/lib/ai-native/case-extraction';

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

/** Step 2 for anything other than First Draft — runs the specialist directly. */
export async function executeAgent(agent: JuniorAgent, input: string, briefRef: string) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const brief = briefRef?.trim() ? await resolveBrief(workspaceId, briefRef.trim()) : null;
    const result = await dispatchAgent(agent, { input, brief, workspaceId, userId });
    return { agent, ...result };
}

/** Step 2 for First Draft — does this relate to a brief we already have? */
export async function identifyBriefForDraft(input: string, briefRef: string) {
    const { workspaceId } = await requireWorkspaceContext();
    return identifyForFirstDraft(workspaceId, input, briefRef);
}

/** Step 3a — a matching brief was found: record the proceeding and draft against it. */
export async function draftForMatchedBrief(input: string, briefId: string, facts: ExtractedCaseFacts) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId },
        include: { matter: true, client: true },
    });
    if (!brief?.matter) return { error: 'That brief no longer has a matter to write to.' };

    const result = await buildDraftForMatter(workspaceId, userId, brief.matter, brief.client?.name ?? facts.claimantName, input, facts);
    return { success: true as const, ...result, briefName: brief.name };
}

/** Step 3b — no brief matched, and the lawyer confirmed creating one. */
export async function confirmCreateBriefAndDraft(input: string, facts: ExtractedCaseFacts) {
    const { userId, workspaceId } = await requireWorkspaceContext();
    const { brief, matter } = await createBriefForFacts(workspaceId, userId, facts);
    const result = await buildDraftForMatter(workspaceId, userId, matter, facts.claimantName, input, facts);
    return { success: true as const, ...result, briefName: brief.name, briefCreated: true as const };
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

export async function listRecentBriefs() {
    const { workspaceId } = await requireWorkspaceContext();
    return prisma.brief.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, name: true, briefNumber: true, matter: { select: { name: true } } },
    });
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
