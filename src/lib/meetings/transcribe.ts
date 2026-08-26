import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

// Whisper's transcription endpoint caps request bodies at 25MB — call this
// unawaited right after a recording is saved (mirrors the fire-and-forget
// embedDocument() pattern in src/lib/ingestion/embed-document.ts) so a slow
// or failed transcription never blocks the upload response.
const MAX_TRANSCRIBE_BYTES = 24 * 1024 * 1024;

export async function transcribeMeetingRecording(recordingId: string): Promise<void> {
    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey) return;

    const recording = await prisma.meetingRecording.findUnique({
        where: { id: recordingId },
        select: { id: true, audioUrl: true },
    });
    if (!recording) return;

    await prisma.meetingRecording.update({
        where: { id: recordingId },
        data: { transcriptStatus: 'processing' },
    });

    try {
        const res = await fetch(recording.audioUrl);
        if (!res.ok) throw new Error(`Could not fetch audio (${res.status})`);
        const arrayBuffer = await res.arrayBuffer();

        if (arrayBuffer.byteLength > MAX_TRANSCRIBE_BYTES) {
            await prisma.meetingRecording.update({
                where: { id: recordingId },
                data: {
                    transcriptStatus: 'failed',
                    transcriptText: 'This recording is too long to transcribe automatically (over ~25MB, roughly 40+ minutes) — long-recording chunking isn’t built yet.',
                },
            });
            return;
        }

        const client = new OpenAI({ apiKey });
        const file = await toFile(Buffer.from(arrayBuffer), 'recording.webm');
        const transcription = await client.audio.transcriptions.create({
            file,
            model: 'whisper-1',
        });

        await prisma.meetingRecording.update({
            where: { id: recordingId },
            data: { transcriptText: transcription.text, transcriptStatus: 'completed' },
        });
    } catch (err) {
        console.error(`[transcribeMeetingRecording] Failed for ${recordingId}:`, err);
        await prisma.meetingRecording.update({
            where: { id: recordingId },
            data: { transcriptStatus: 'failed' },
        }).catch(() => {});
    }
}
