import { prisma } from '@/lib/prisma';
import { Prisma, ProcessingJob } from '@prisma/client';

type Db = Prisma.TransactionClient | typeof prisma;

const BACKOFF_BASE_MINUTES = 2;

/**
 * Creates a job row. Pass `tx` (the callback argument of an existing
 * prisma.$transaction) to enqueue inside the same transaction as the
 * mutation that triggered it — that's what makes the job durable: the row
 * exists before the HTTP response is sent, so a mid-request crash loses
 * nothing. Without `tx`, this is still useful (e.g. from a cron route),
 * just without that same-transaction guarantee.
 */
export async function enqueueProcessingJob(
    type: string,
    workspaceId: string,
    payload: object,
    opts?: { availableAt?: Date; tx?: Db },
): Promise<ProcessingJob> {
    const db = opts?.tx ?? prisma;
    return db.processingJob.create({
        data: {
            workspaceId,
            type,
            payload: payload as Prisma.InputJsonValue,
            availableAt: opts?.availableAt,
        },
    });
}

/**
 * Same two-step claim as src/app/api/bot/zoom/next/route.ts: findFirst a
 * pending-and-available row, then an updateMany guarded by { id, status:
 * 'pending' } — atomic at the DB level, so two callers racing on the same
 * row only ever have one succeed (the other gets count === 0 and moves on).
 * Sufficient at current volume with no concurrent worker pool; if that
 * changes, the upgrade path is `SELECT ... FOR UPDATE SKIP LOCKED`.
 */
export async function claimNextJob(workerId: string, type?: string): Promise<ProcessingJob | null> {
    const pending = await prisma.processingJob.findFirst({
        where: { status: 'pending', availableAt: { lte: new Date() }, ...(type ? { type } : {}) },
        orderBy: { createdAt: 'asc' },
    });
    if (!pending) return null;

    const claimed = await prisma.processingJob.updateMany({
        where: { id: pending.id, status: 'pending' },
        data: { status: 'claimed', claimedAt: new Date(), claimedBy: workerId },
    });
    if (claimed.count === 0) return null;

    return { ...pending, status: 'claimed', claimedAt: new Date(), claimedBy: workerId };
}

/**
 * Claims one specific job by id — used by the fast path right after
 * enqueueing, so the after() callback processes the job it just created
 * rather than whatever's oldest in the queue. Same guarded-update pattern
 * as claimNextJob, just keyed by id.
 */
export async function claimJobById(jobId: string, workerId: string): Promise<ProcessingJob | null> {
    const claimed = await prisma.processingJob.updateMany({
        where: { id: jobId, status: 'pending' },
        data: { status: 'claimed', claimedAt: new Date(), claimedBy: workerId },
    });
    if (claimed.count === 0) return null;
    return prisma.processingJob.findUnique({ where: { id: jobId } });
}

export async function completeJob(jobId: string): Promise<void> {
    await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: 'completed', completedAt: new Date() },
    });
}

/** Exponential backoff; flips to dead_letter once attempts reach maxAttempts instead of retrying forever. */
export async function failJob(jobId: string, error: string): Promise<void> {
    const job = await prisma.processingJob.findUnique({ where: { id: jobId }, select: { attempts: true, maxAttempts: true } });
    if (!job) return;

    const attempts = job.attempts + 1;
    const dead = attempts >= job.maxAttempts;
    const backoffMinutes = BACKOFF_BASE_MINUTES ** attempts;

    await prisma.processingJob.update({
        where: { id: jobId },
        data: {
            attempts,
            status: dead ? 'dead_letter' : 'pending',
            availableAt: dead ? undefined : new Date(Date.now() + backoffMinutes * 60_000),
            lastError: error.slice(0, 2000),
        },
    });
}

/**
 * Resets jobs stuck 'claimed' past a staleness threshold back to 'pending'
 * — the invocation that claimed them crashed or was torn down before
 * finishing. Called by the reconciliation sweep, not the fast path.
 */
export async function resetStaleClaims(staleAfterMinutes = 10): Promise<number> {
    const result = await prisma.processingJob.updateMany({
        where: { status: 'claimed', claimedAt: { lt: new Date(Date.now() - staleAfterMinutes * 60_000) } },
        data: { status: 'pending', claimedAt: null, claimedBy: null },
    });
    return result.count;
}
