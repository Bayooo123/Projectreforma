import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { downloadZoomRecording } from '@/lib/zoom/client';
import { transcribeMeetingRecording } from '@/lib/meetings/transcribe';

// Zoom Cloud Recording -> Reforma, for meetings held on the firm's own Zoom
// account (hosted meetings only — a meeting we don't host never generates
// a cloud recording on our account, so there's nothing this endpoint can
// see for those; that's the separate, much heavier Meeting-SDK-bot case).
//
// Register this URL as the Event Subscription endpoint on a Zoom
// Server-to-Server OAuth app, subscribed to "Recording Completed". Zoom
// verifies ownership of the URL with a one-time handshake
// (endpoint.url_validation) before it will ever send a real event.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ZoomRecordingFile {
    id: string;
    recording_type: string;
    file_type: string;
    download_url: string;
    recording_start: string;
    recording_end: string;
}

interface ZoomWebhookPayload {
    event: string;
    payload: {
        plainToken?: string;
        object?: {
            uuid: string;
            topic: string;
            start_time: string;
            recording_files?: ZoomRecordingFile[];
        };
    };
}

function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
    if (!config.ZOOM_WEBHOOK_SECRET_TOKEN) return false;
    const message = `v0:${timestamp}:${rawBody}`;
    const expected = 'v0=' + createHmac('sha256', config.ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
}

// A Zoom cloud recording isn't inherently tied to a brief the way an email
// or WhatsApp message is — this is a best-effort match against a scheduled
// MEETING-type calendar entry around the same time, by whether its title,
// brief name, or matter name shows up in the Zoom meeting's topic. No match
// just means it lands as a general recording (same as any other unmatched
// recording), reviewed manually on the Recordings page — not blocked.
async function matchMeetingToBrief(workspaceId: string, topic: string, startTime: Date): Promise<string | null> {
    const windowStart = new Date(startTime.getTime() - 24 * 3600_000);
    const windowEnd = new Date(startTime.getTime() + 24 * 3600_000);

    const candidates = await prisma.calendarEntry.findMany({
        where: {
            type: 'MEETING',
            date: { gte: windowStart, lte: windowEnd },
            deletedAt: null,
            OR: [
                { matter: { workspaceId } },
                { brief: { workspaceId } },
                { client: { workspaceId } },
            ],
        },
        select: {
            date: true,
            briefId: true,
            title: true,
            brief: { select: { name: true } },
            matter: { select: { name: true } },
        },
    });

    const topicLower = topic.toLowerCase();
    const scored = candidates
        .filter((c): c is typeof c & { briefId: string } => !!c.briefId)
        .map(c => {
            const names = [c.title, c.brief?.name, c.matter?.name].filter((n): n is string => !!n);
            const matched = names.some(n => topicLower.includes(n.toLowerCase()) || n.toLowerCase().includes(topicLower));
            const hoursApart = Math.abs(c.date.getTime() - startTime.getTime()) / 3600_000;
            return { briefId: c.briefId, matched, hoursApart };
        })
        .filter(c => c.matched)
        .sort((a, b) => a.hoursApart - b.hoursApart);

    return scored[0]?.briefId ?? null;
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    let body: ZoomWebhookPayload;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // One-time endpoint ownership handshake Zoom sends when the Event
    // Subscription URL is first configured — no signature to check yet,
    // this response is what proves ownership.
    if (body.event === 'endpoint.url_validation' && body.payload?.plainToken) {
        if (!config.ZOOM_WEBHOOK_SECRET_TOKEN) {
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }
        const plainToken = body.payload.plainToken;
        const encryptedToken = createHmac('sha256', config.ZOOM_WEBHOOK_SECRET_TOKEN).update(plainToken).digest('hex');
        return NextResponse.json({ plainToken, encryptedToken });
    }

    const signature = req.headers.get('x-zm-signature');
    const timestamp = req.headers.get('x-zm-request-timestamp');
    if (!signature || !timestamp || !verifySignature(rawBody, timestamp, signature)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.event !== 'recording.completed') {
        return NextResponse.json({ ok: true });
    }

    const meeting = body.payload.object;
    if (!meeting) return NextResponse.json({ ok: true });

    // Firm currently runs a single workspace — same fallback convention the
    // Zoho email webhook uses (src/app/api/webhooks/zoho-email/route.ts)
    // for anything with no more specific routing signal.
    const workspace = await prisma.workspace.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, ownerId: true },
    });
    if (!workspace) return NextResponse.json({ ok: true });

    // Prefer an audio-only file (smaller, and all Whisper needs); fall back
    // to the video recording — its audio track transcribes just as well and
    // this way nothing depends on "Audio only" being enabled in Zoom's
    // recording settings.
    const audioOnly = meeting.recording_files?.find(f => f.recording_type === 'audio_only');
    const videoFile = meeting.recording_files?.find(f => f.file_type === 'MP4');
    const file = audioOnly ?? videoFile;
    if (!file) return NextResponse.json({ ok: true });

    const buffer = await downloadZoomRecording(file.download_url);
    if (!buffer) return NextResponse.json({ ok: false, error: 'Download failed' }, { status: 500 });

    const isAudioOnly = file === audioOnly;
    const ext = isAudioOnly ? 'm4a' : 'mp4';
    const blob = await put(`zoom-recordings/${workspace.id}/${meeting.uuid}-${file.id}.${ext}`, buffer, {
        access: 'public',
        contentType: isAudioOnly ? 'audio/mp4' : 'video/mp4',
    });

    const startTime = new Date(meeting.start_time);
    const briefId = await matchMeetingToBrief(workspace.id, meeting.topic, startTime);
    const durationSeconds = Math.round(
        (new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()) / 1000
    );

    const recording = await prisma.meetingRecording.create({
        data: {
            workspaceId: workspace.id,
            briefId,
            // Attributed to the workspace owner — a Zoom recording has no
            // per-meeting "who filed this" the way a WhatsApp/manual upload does.
            createdById: workspace.ownerId,
            title: meeting.topic,
            audioUrl: blob.url,
            durationSeconds,
        },
    });

    transcribeMeetingRecording(recording.id).catch(err => console.error('[ZoomWebhook] Transcription failed:', err));

    return NextResponse.json({ ok: true, recordingId: recording.id, briefId });
}
