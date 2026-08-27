import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';
import { transcribeMeetingRecording } from '@/lib/meetings/transcribe';

// Called by the local Zoom join-bot once it has actually recorded a meeting
// end-to-end (joined, captured audio, meeting ended) — uploads the audio the
// same way upload-audio does for an in-browser recording, then feeds it into
// the same MeetingRecording + transcription pipeline everything else uses.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

export async function POST(req: NextRequest) {
    const { auth, error } = await withApiAuth(req);
    if (error) return error;

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });

    const job = await prisma.meetingBotRequest.findFirst({
        where: { id: jobId, workspaceId: auth!.workspaceId },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.status === 'completed') {
        return NextResponse.json({ success: true, recordingId: job.recordingId });
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Recording too large (max 500MB)' }, { status: 400 });
    }
    if (!req.body) return NextResponse.json({ error: 'No audio body provided' }, { status: 400 });

    const filename = req.nextUrl.searchParams.get('filename') || `zoom-bot-${job.id}.m4a`;
    const blob = await put(`zoom-bot-recordings/${job.workspaceId}/${job.id}-${filename}`, req.body, {
        access: 'public',
    });

    const recording = await prisma.meetingRecording.create({
        data: {
            workspaceId: job.workspaceId,
            briefId: job.briefId,
            title: 'Zoom meeting (bot join)',
            audioUrl: blob.url,
            createdById: job.requestedById,
        },
    });

    await prisma.meetingBotRequest.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), recordingId: recording.id },
    });

    transcribeMeetingRecording(recording.id).catch(err => console.error('[BotZoomComplete] Transcription failed:', err));

    return NextResponse.json({ success: true, recordingId: recording.id });
}
