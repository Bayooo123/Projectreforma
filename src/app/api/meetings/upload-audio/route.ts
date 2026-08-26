import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getMembershipForCalendarEntry } from '@/app/actions/calendar-events';

// A meeting recording captured in the browser. Three scopes, in order of
// preference: (1) tied to a specific CalendarEntry (type: MEETING) — "each
// day you can record a meeting, save it, and pull out the transcript" — (2)
// tied directly to a brief with no calendar entry, or (3) fully general,
// scoped only to the workspace (the everyday recording case). Transcription
// (OpenAI Whisper) is kicked off automatically right after the audio is
// saved — see src/lib/meetings/transcribe.ts.

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
        const briefId = searchParams.get('briefId');
        const workspaceIdParam = searchParams.get('workspaceId');
        const title = searchParams.get('title');
        const durationSecondsRaw = searchParams.get('durationSeconds');
        const durationSeconds = durationSecondsRaw ? parseInt(durationSecondsRaw, 10) : null;

        let workspaceId: string;

        if (calendarEntryId) {
            const { entry, workspaceId: resolvedWorkspaceId, membership } = await getMembershipForCalendarEntry(calendarEntryId, session.user.id);
            if (!entry || !resolvedWorkspaceId) {
                return NextResponse.json({ error: 'Calendar entry not found' }, { status: 404 });
            }
            if (!membership) {
                return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
            }
            workspaceId = resolvedWorkspaceId;
        } else if (workspaceIdParam) {
            const membership = await prisma.workspaceMember.findFirst({
                where: { workspaceId: workspaceIdParam, user: { id: session.user.id } },
            });
            if (!membership) {
                return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
            }
            if (briefId) {
                const brief = await prisma.brief.findFirst({
                    where: { id: briefId, workspaceId: workspaceIdParam, deletedAt: null },
                    select: { id: true },
                });
                if (!brief) {
                    return NextResponse.json({ error: 'Brief not found in this workspace' }, { status: 404 });
                }
            }
            workspaceId = workspaceIdParam;
        } else {
            return NextResponse.json({ error: 'Either calendarEntryId or workspaceId is required' }, { status: 400 });
        }

        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_AUDIO_BYTES) {
            return NextResponse.json({ error: 'Recording too large (max 500MB)' }, { status: 400 });
        }

        if (!request.body) {
            return NextResponse.json({ error: 'No audio body provided' }, { status: 400 });
        }

        const blob = await put(filename, request.body, {
            access: 'public',
        });

        const recording = await prisma.meetingRecording.create({
            data: {
                workspaceId,
                calendarEntryId: calendarEntryId || null,
                briefId: briefId || null,
                title: title || null,
                audioUrl: blob.url,
                durationSeconds: durationSeconds && !isNaN(durationSeconds) ? durationSeconds : null,
                createdById: session.user.id,
            },
        });

        import('@/lib/meetings/transcribe').then(({ transcribeMeetingRecording }) =>
            transcribeMeetingRecording(recording.id)
        ).catch(e => console.error('[upload-audio] Transcription failed:', e));

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
