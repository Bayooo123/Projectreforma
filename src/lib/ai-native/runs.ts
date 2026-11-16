/* eslint-disable @typescript-eslint/no-explicit-any -- payload is a genuinely heterogeneous Prisma Json field, shape depends on run kind */
import { prisma } from '@/lib/prisma';

export type RunStep = [string, 'live' | 'muted'];

export async function createRun(params: {
    workspaceId: string;
    userId: string;
    briefId?: string | null;
    agent: string;
    reason?: string | null;
    input: string;
    kind: string;
    payload?: unknown;
    steps?: RunStep[];
}) {
    return prisma.juniorRun.create({
        data: {
            workspaceId: params.workspaceId,
            userId: params.userId,
            briefId: params.briefId ?? null,
            agent: params.agent,
            reason: params.reason ?? null,
            input: params.input,
            kind: params.kind,
            payload: params.payload as any,
            steps: params.steps as any,
        },
    });
}

export async function updateRun(runId: string, data: { kind?: string; payload?: unknown; briefId?: string | null; steps?: RunStep[] }) {
    return prisma.juniorRun.update({
        where: { id: runId },
        data: {
            ...(data.kind !== undefined ? { kind: data.kind } : {}),
            ...(data.payload !== undefined ? { payload: data.payload as any } : {}),
            ...(data.briefId !== undefined ? { briefId: data.briefId } : {}),
            ...(data.steps !== undefined ? { steps: data.steps as any } : {}),
        },
    });
}

/**
 * Draft and gap runs are enriched with live state rather than trusting the
 * payload snapshot taken when the run was written — a draft's text or a
 * gap's answer can change after the run row was created, and the run
 * should always show what's actually true now.
 */
export async function listRuns(workspaceId: string, briefId?: string | null, limit = 30) {
    const runs = await prisma.juniorRun.findMany({
        where: { workspaceId, ...(briefId ? { briefId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const draftIds = runs.filter(r => r.kind === 'draft').map(r => (r.payload as any)?.draftId).filter(Boolean);
    const gapIds = runs.filter(r => r.kind === 'gap').map(r => (r.payload as any)?.gapId).filter(Boolean);

    const [drafts, gaps] = await Promise.all([
        draftIds.length ? prisma.clientUpdateDraft.findMany({ where: { id: { in: draftIds } } }) : Promise.resolve([]),
        gapIds.length ? prisma.knowledgeGap.findMany({ where: { id: { in: gapIds } } }) : Promise.resolve([]),
    ]);
    const draftById = new Map(drafts.map(d => [d.id, d]));
    const gapById = new Map(gaps.map(g => [g.id, g]));

    return runs.map(r => {
        const payload = (r.payload as any) ?? {};
        if (r.kind === 'draft' && payload.draftId && draftById.has(payload.draftId)) {
            const d = draftById.get(payload.draftId)!;
            return {
                ...r,
                live: {
                    draftText: d.finalText ?? d.draftText,
                    status: d.status,
                    edited: !!d.finalText && d.finalText !== d.draftText,
                },
            };
        }
        if (r.kind === 'gap' && payload.gapId && gapById.has(payload.gapId)) {
            const g = gapById.get(payload.gapId)!;
            return { ...r, live: { gapStatus: g.status, answer: g.answer } };
        }
        return { ...r, live: null };
    });
}
