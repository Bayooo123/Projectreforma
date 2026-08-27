import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

export interface Recorder {
    filePath: string;
    // Stops ffmpeg gracefully (sends 'q', the key it listens for to finalize
    // the file cleanly) and resolves once the process has actually exited —
    // killing it outright risks a truncated/corrupt output file.
    stop: () => Promise<void>;
}

// Captures whatever the Windows machine is currently playing, via VB-Cable:
// the system's default *playback* device must be set to "CABLE Input" so
// the browser's meeting audio is routed there, and this reads it back out
// through "CABLE Output" as a normal Windows recording (dshow) device. That
// system-wide playback routing is a one-time manual Windows setting — see
// README.md — not something this script can configure for itself.
export function startRecording(deviceName: string, outputPath: string): Recorder {
    const ffmpeg: ChildProcessWithoutNullStreams = spawn('ffmpeg', [
        '-f', 'dshow',
        '-i', `audio=${deviceName}`,
        '-ac', '1',
        '-ar', '44100',
        '-y',
        outputPath,
    ]);

    ffmpeg.stderr.on('data', () => {}); // ffmpeg logs progress to stderr by design; nothing to surface here

    return {
        filePath: outputPath,
        stop: () =>
            new Promise((resolve) => {
                ffmpeg.once('exit', () => resolve());
                ffmpeg.stdin.write('q');
                // If ffmpeg doesn't exit cleanly within a few seconds, don't
                // hang the job forever waiting on it.
                setTimeout(() => {
                    if (!ffmpeg.killed) ffmpeg.kill();
                    resolve();
                }, 8000);
            }),
    };
}
