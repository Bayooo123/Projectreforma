import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';

// Called by the local Zoom join-bot when it can't complete a claimed job —
// couldn't join (bad link, waiting room never admitted it), audio capture
// failed, upload failed after retries, etc. Records why, so a failed job is
// visible instead of silently vanishing after being claimed.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const { auth, error } = await withApiAuth(req);
    if (error) return error;

    const body = await req.json().catch(() => null) as { jobId?: string; message?: string } | null;
    if (!body?.jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });

    const job = await prisma.meetingBotRequest.findFirst({
        where: { id: body.jobId, workspaceId: auth!.workspaceId },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    await prisma.meetingBotRequest.update({
        where: { id: job.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: body.message?.slice(0, 500) ?? 'Unknown error' },
    });

    return NextResponse.json({ success: true });
}
