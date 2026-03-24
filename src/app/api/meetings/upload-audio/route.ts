import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename') || `recording-${Date.now()}.webm`;
        const calendarEntryId = searchParams.get('calendarEntryId');
        const matterId = searchParams.get('matterId');

        if (!request.body) {
            return NextResponse.json({ error: 'No audio body provided' }, { status: 400 });
        }

        // 1. Upload to Vercel Blob
        const blob = await put(filename, request.body, {
            access: 'public',
        });

        // 2. Create MeetingRecording record
        // Initial state: transcription and summary are empty/pending
        const recording = await prisma.meetingRecording.create({
            data: {
                calendarEntryId: calendarEntryId || null,
                matterId: matterId || null,
                audioUrl: blob.url,
                summary: 'Processing...', // Initial placeholder
                transcriptText: 'Transcribing...', // Initial placeholder
                createdById: session.user.id,
                date: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            recordingId: recording.id,
            audioUrl: blob.url
        });
    } catch (error: any) {
        console.error('Error in upload-audio:', error);
        return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }
}
