import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { transcribeMeetingRecording } from '@/lib/meetings/transcribe';

type TranscribeRequest = {
    recordingId?: string;
    transcriptText?: string;
};

// Manual retry endpoint for a recording whose automatic transcription
// (kicked off from upload-audio) failed or never ran — e.g. OPENAI_API_KEY
// wasn't set at upload time. Also still accepts a transcript typed/pasted
// in directly, for a recording transcribed by other means.
export async function POST(request: Request) {
    try {
        await requireAuth();
        const body = (await request.json()) as TranscribeRequest;
        const recordingId = body.recordingId;

        if (!recordingId) {
            return NextResponse.json({ error: 'recordingId is required' }, { status: 400 });
        }

        const existing = await prisma.meetingRecording.findUnique({
            where: { id: recordingId },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
        }

        if (body.transcriptText) {
            const updated = await prisma.meetingRecording.update({
                where: { id: recordingId },
                data: {
                    transcriptText: body.transcriptText,
                    transcriptStatus: 'completed',
                },
                select: { id: true, transcriptText: true, transcriptStatus: true },
            });

            return NextResponse.json({ success: true, status: 'completed', data: updated });
        }

        await transcribeMeetingRecording(recordingId);
        const result = await prisma.meetingRecording.findUnique({
            where: { id: recordingId },
            select: { id: true, transcriptText: true, transcriptStatus: true },
        });

        return NextResponse.json({ success: true, status: result?.transcriptStatus ?? 'processing', data: result });
    } catch (error) {
        console.error('Error in transcribe route:', error);
        if (error instanceof Error && error.message.toLowerCase().includes('unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to process transcription' }, { status: 500 });
    }
}
