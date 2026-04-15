import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type TranscribeRequest = {
    recordingId?: string;
    transcriptText?: string;
    summary?: string;
    actionItems?: string | null;
};

/**
 * Temporary transcribe endpoint.
 * Keeps API contract stable for clients expecting /api/meetings/transcribe.
 */
export async function POST(request: Request) {
    try {
        await requireAuth();
        const body = (await request.json()) as TranscribeRequest;
        const recordingId = body.recordingId;

        if (!recordingId) {
            return NextResponse.json({ error: 'recordingId is required' }, { status: 400 });
        }

        const existing = await (prisma as any).meetingRecording.findUnique({
            where: { id: recordingId },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
        }

        // If explicit transcript payload is provided by an external worker,
        // persist it. Otherwise return processing to preserve backward compatibility.
        if (body.transcriptText || body.summary || body.actionItems !== undefined) {
            const updated = await (prisma as any).meetingRecording.update({
                where: { id: recordingId },
                data: {
                    transcriptText: body.transcriptText ?? undefined,
                    summary: body.summary ?? undefined,
                    actionItems: body.actionItems ?? undefined,
                },
                select: {
                    id: true,
                    transcriptText: true,
                    summary: true,
                    actionItems: true,
                },
            });

            return NextResponse.json({ success: true, status: 'completed', data: updated });
        }

        return NextResponse.json({
            success: true,
            status: 'processing',
            message: 'Transcription job accepted.',
        });
    } catch (error: any) {
        console.error('Error in transcribe route:', error);
        if (String(error?.message || '').toLowerCase().includes('unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to process transcription' }, { status: 500 });
    }
}
