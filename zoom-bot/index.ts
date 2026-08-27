import 'dotenv/config';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parseZoomLink, joinMeeting, waitForMeetingEnd } from './zoom.ts';
import { startRecording } from './audio.ts';

const REFORMA_API_URL = requireEnv('REFORMA_API_URL');
const REFORMA_API_KEY = requireEnv('REFORMA_API_KEY');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 15_000);
const BOT_DISPLAY_NAME = process.env.BOT_DISPLAY_NAME ?? 'Reforma Recorder';
const AUDIO_DEVICE_NAME = process.env.AUDIO_DEVICE_NAME ?? 'CABLE Output (VB-Audio Virtual Cable)';
const BOT_HEADLESS = process.env.BOT_HEADLESS === 'true';
const MAX_MEETING_DURATION_MS = 4 * 60 * 60_000; // safety cap, not an expected normal case

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required env var ${name} — copy .env.example to .env and fill it in.`);
        process.exit(1);
    }
    return value;
}

interface Job {
    id: string;
    meetingLink: string;
    briefId: string | null;
}

async function fetchNextJob(): Promise<Job | null> {
    const res = await fetch(`${REFORMA_API_URL}/api/bot/zoom/next`, {
        headers: { Authorization: `Bearer ${REFORMA_API_KEY}` },
    });
    if (!res.ok) {
        console.error(`[poll] Reforma returned ${res.status}: ${await res.text().catch(() => '')}`);
        return null;
    }
    const data = await res.json() as { job: Job | null };
    return data.job;
}

async function reportFailure(jobId: string, message: string): Promise<void> {
    console.error(`[job ${jobId}] Failed: ${message}`);
    await fetch(`${REFORMA_API_URL}/api/bot/zoom/fail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REFORMA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, message }),
    }).catch((err) => console.error(`[job ${jobId}] Also failed to report the failure:`, err));
}

async function uploadRecording(jobId: string, filePath: string): Promise<void> {
    const audio = readFileSync(filePath);
    const res = await fetch(`${REFORMA_API_URL}/api/bot/zoom/complete?jobId=${jobId}&filename=recording.wav`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REFORMA_API_KEY}`, 'Content-Type': 'audio/wav' },
        body: audio,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text().catch(() => '')}`);
}

async function runJob(job: Job): Promise<void> {
    console.log(`[job ${job.id}] Starting: ${job.meetingLink}`);
    const { meetingId, pwd } = parseZoomLink(job.meetingLink);
    const audioPath = join(process.cwd(), `recording-${job.id}.wav`);

    let joined: Awaited<ReturnType<typeof joinMeeting>> | null = null;
    let recorder: ReturnType<typeof startRecording> | null = null;

    try {
        joined = await joinMeeting(meetingId, pwd, BOT_DISPLAY_NAME, BOT_HEADLESS);
        console.log(`[job ${job.id}] Joined — recording started.`);
        recorder = startRecording(AUDIO_DEVICE_NAME, audioPath);

        await waitForMeetingEnd(joined.page, MAX_MEETING_DURATION_MS);
        console.log(`[job ${job.id}] Meeting ended — stopping recording.`);

        await recorder.stop();
        await joined.browser.close();

        await uploadRecording(job.id, audioPath);
        console.log(`[job ${job.id}] Uploaded and filed.`);
    } catch (err) {
        if (recorder) await recorder.stop().catch(() => {});
        if (joined) await joined.browser.close().catch(() => {});
        await reportFailure(job.id, err instanceof Error ? err.message : String(err));
    } finally {
        try {
            unlinkSync(audioPath);
        } catch {
            // Nothing to clean up if recording never started (e.g. join failed).
        }
    }
}

async function main() {
    console.log(`Reforma Zoom join-bot started. Polling ${REFORMA_API_URL} every ${POLL_INTERVAL_MS}ms.`);
    for (;;) {
        try {
            const job = await fetchNextJob();
            if (job) {
                await runJob(job);
                continue; // check again immediately in case more are queued
            }
        } catch (err) {
            console.error('[poll] Unexpected error:', err);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

main();
