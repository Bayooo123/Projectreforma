import type { ProcessingJob } from '@prisma/client';
import { completeJob, failJob, claimJobById } from './queue';
import { triggerFirstDraftForCourtEvent } from '@/lib/first-draft/trigger';

type Handler = (payload: Record<string, unknown>) => Promise<void>;

function isFirstDraftPayload(p: Record<string, unknown>): p is { workspaceId: string; matterId: string; calendarEntryId: string; userId: string } {
    return typeof p.workspaceId === 'string' && typeof p.matterId === 'string'
        && typeof p.calendarEntryId === 'string' && typeof p.userId === 'string';
}

// One entry per job type. Add a new key here when another after() call site
// migrates onto the queue — see the ReformaOS Durable Queue design doc.
const HANDLERS: Record<string, Handler> = {
    first_draft_court_event: async (payload) => {
        if (!isFirstDraftPayload(payload)) throw new Error(`Malformed first_draft_court_event payload: ${JSON.stringify(payload)}`);
        await triggerFirstDraftForCourtEvent(payload);
    },
};

/**
 * The fast path: called from after() right after enqueueProcessingJob, to
 * process the job immediately instead of waiting for the sweep. Claims by
 * id (not "next of type"), so it processes the job it was just handed, not
 * whatever happens to be oldest in the queue. If the claim fails (another
 * caller already got it, or the job no longer exists) this is a silent
 * no-op — the sweep will still catch anything genuinely left pending.
 */
export async function runJobFastPath(jobId: string): Promise<void> {
    const job = await claimJobById(jobId, 'fast-path');
    if (job) await processJob(job);
}

/** Dispatches a claimed job to its handler, then marks it complete or failed (with retry/backoff). */
export async function processJob(job: ProcessingJob): Promise<void> {
    const handler = HANDLERS[job.type];
    if (!handler) {
        await failJob(job.id, `No handler registered for job type "${job.type}"`);
        return;
    }
    try {
        await handler(job.payload as Record<string, unknown>);
        await completeJob(job.id);
    } catch (err) {
        console.error(`[Jobs] ${job.type} (${job.id}) failed:`, err);
        await failJob(job.id, err instanceof Error ? err.message : String(err));
    }
}
