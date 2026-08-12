import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getMembershipForCalendarEntry } from '@/app/actions/calendar-events';

// A meeting recording captured in the browser and tied to a specific
// CalendarEntry (type: MEETING) — "each day you can record a meeting, save
// it, and pull out the transcript." This only stores the audio; transcription
// (Whisper API) is a follow-on step, not wired in here.

const MAX_AUDIO_BYTES = 500 * 1024 * 1024; // 500MB — long meetings recorded in-browser can run large

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename') || `recording-${Date.now()}.webm`;
        const calendarEntryId = searchParams.get('calendarEntryId');
        const durationSecondsRaw = searchParams.get('durationSeconds');
        const durationSeconds = durationSecondsRaw ? parseInt(durationSecondsRaw, 10) : null;

        if (!calendarEntryId) {
            return NextResponse.json({ error: 'calendarEntryId is required' }, { status: 400 });
        }

        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_AUDIO_BYTES) {
            return NextResponse.json({ error: 'Recording too large (max 500MB)' }, { status: 400 });
        }

        if (!request.body) {
            return NextResponse.json({ error: 'No audio body provided' }, { status: 400 });
        }

        const { entry, workspaceId, membership } = await getMembershipForCalendarEntry(calendarEntryId, session.user.id);
        if (!entry || !workspaceId) {
            return NextResponse.json({ error: 'Calendar entry not found' }, { status: 404 });
        }
        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
        }

        const blob = await put(filename, request.body, {
            access: 'public',
        });

        const recording = await prisma.meetingRecording.create({
            data: {
                calendarEntryId,
                audioUrl: blob.url,
                durationSeconds: durationSeconds && !isNaN(durationSeconds) ? durationSeconds : null,
                createdById: session.user.id,
            },
        });

        return NextResponse.json({
            success: true,
            recordingId: recording.id,
            audioUrl: blob.url,
        });
    } catch (error) {
        console.error('Error in upload-audio:', error);
        return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }
}
