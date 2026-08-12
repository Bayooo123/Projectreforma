import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type TranscribeRequest = {
    recordingId?: string;
    transcriptText?: string;
};

/**
 * Accepts a transcript for a previously-uploaded MeetingRecording.
 * Nothing calls the transcription API yet — this just persists a transcript
 * once one exists. Wiring Whisper (or another provider) to call this
 * automatically is a follow-on step.
 */
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

        return NextResponse.json({
            success: true,
            status: 'processing',
            message: 'No transcript provided yet.',
        });
    } catch (error) {
        console.error('Error in transcribe route:', error);
        if (error instanceof Error && error.message.toLowerCase().includes('unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to process transcription' }, { status: 500 });
    }
}
