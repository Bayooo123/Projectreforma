import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { config } from '@/lib/config';
import { requireOjogbonUser } from '@/lib/ojogbon/server';

// Record-your-voice: a student speaks about their paper, this uploads the
// recording and transcribes it with Whisper synchronously (recordings here
// are short — a few minutes at most — unlike a full meeting recording), so
// the transcript comes back in the same response and is saved into the
// paper's own JSON (voiceNotes[]) as a reference the student can revisit.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 24 * 1024 * 1024; // Whisper's own request-body cap

export async function POST(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;

    const contentType = req.headers.get('content-type') || 'audio/webm';
    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
        return NextResponse.json({ code: 'bad_request', error: 'No audio received.' }, { status: 400 });
    }
    if (arrayBuffer.byteLength > MAX_BYTES) {
        return NextResponse.json({ code: 'too_large', error: 'That recording is too long (over ~25MB).' }, { status: 413 });
    }

    const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('ogg') ? 'ogg' : 'webm';
    let audioUrl: string;
    try {
        const blob = await put(`ojogbon-voice-notes/${who.userId}/${Date.now()}.${ext}`, Buffer.from(arrayBuffer), {
            access: 'public',
            contentType,
        });
        audioUrl = blob.url;
    } catch (error) {
        console.error('[ojogbon/voice-note] upload failed', error);
        return NextResponse.json({ code: 'error', error: 'Couldn’t save the recording.' }, { status: 500 });
    }

    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ url: audioUrl, transcript: '', note: 'Transcription unavailable.' });
    }

    try {
        const client = new OpenAI({ apiKey });
        const file = await toFile(Buffer.from(arrayBuffer), `recording.${ext}`);
        const transcription = await client.audio.transcriptions.create({ file, model: 'whisper-1' });
        return NextResponse.json({ url: audioUrl, transcript: transcription.text });
    } catch (error) {
        console.error('[ojogbon/voice-note] transcription failed', error);
        return NextResponse.json({ url: audioUrl, transcript: '', note: 'Saved, but transcription failed.' });
    }
}
