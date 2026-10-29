import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { claimNextJob, resetStaleClaims } from '@/lib/jobs/queue';
import { processJob } from '@/lib/jobs/handlers';

// The reconciliation sweep (ReformaOS Durable Queue design doc): catches
// anything the fast path (after(), right after enqueueProcessingJob) didn't
// finish — either because it never ran, or because it crashed mid-job and
// left the row stuck 'claimed'. Triggered externally (see
// .github/workflows/process-jobs.yml) rather than Vercel Cron, since Hobby
// only allows once-daily crons — far too infrequent for a sweep meant to
// catch failures within minutes, not within a day.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_JOBS_PER_RUN = 20; // keep each invocation well inside maxDuration

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!config.CRON_SECRET || authHeader !== `Bearer ${config.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resetCount = await resetStaleClaims();

    let processed = 0;
    const results: { id: string; type: string }[] = [];
    for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
        const job = await claimNextJob('sweep');
        if (!job) break;
        await processJob(job);
        results.push({ id: job.id, type: job.type });
        processed++;
    }

    console.log(`[Cron] process-jobs: reset ${resetCount} stale claim(s), processed ${processed} job(s)`);
    return NextResponse.json({ success: true, resetCount, processed, jobs: results });
}
