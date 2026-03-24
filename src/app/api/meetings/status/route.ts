import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: Request) {
    try {
        await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const recording = await (prisma as any).meetingRecording.findUnique({
            where: { id },
            select: {
                id: true,
                transcriptText: true,
                summary: true,
                actionItems: true,
                audioUrl: true,
            }
        });

        if (!recording) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Status is 'completed' if we have transcriptText that isn't the initial placeholder
        const isCompleted = recording.transcriptText && recording.transcriptText !== 'Transcribing...';
        const isFailed = recording.transcriptText === 'Failed'; // Placeholder for failures

        return NextResponse.json({
            status: isCompleted ? 'completed' : isFailed ? 'failed' : 'processing',
            data: recording
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
