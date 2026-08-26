'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Loader, FileAudio } from 'lucide-react';
import { getMeetingRecordings, deleteMeetingRecording, type MeetingRecordingRow, type RecordingScope } from '@/app/actions/meeting-recordings';
import { formatMeetingDuration as formatDuration, formatMeetingDate as formatDate, transcriptBadge } from '@/lib/meetings/format';

type Phase = 'idle' | 'recording' | 'reviewing' | 'uploading';

interface MeetingRecorderProps {
    scope: RecordingScope;
    /** Only used when scope has no calendarEntryId — labels a general/brief-tied recording. */
    title?: string;
    /** Fires after a recording is successfully saved — lets a parent feed (e.g. the Recordings page) refresh. */
    onSaved?: () => void;
}

export default function MeetingRecorder({ scope, title, onSaved }: MeetingRecorderProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [seconds, setSeconds] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recordings, setRecordings] = useState<MeetingRecordingRow[] | null>(null);
    const [loadingList, setLoadingList] = useState(true);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const blobRef = useRef<Blob | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadRecordings = useCallback(async () => {
        setLoadingList(true);
        try {
            const list = await getMeetingRecordings(scope);
            setRecordings(list);
        } catch {
            setRecordings([]);
        } finally {
            setLoadingList(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(scope)]);

    // Standard fetch-on-mount pattern; setState inside load() is intentional.
    useEffect(() => { loadRecordings(); }, [loadRecordings]);

    // Transcription runs async server-side after upload — poll while anything
    // is still pending/processing, so "Transcribing…" flips to the finished
    // transcript without the user having to refresh.
    useEffect(() => {
        const hasPending = recordings?.some(r => r.transcriptStatus === 'pending' || r.transcriptStatus === 'processing');
        if (!hasPending) return;
        pollRef.current = setInterval(loadRecordings, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [recordings, loadRecordings]);

    useEffect(() => () => {
        // Clean up on unmount: stop any live stream/timer, release the preview object URL.
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startRecording = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                blobRef.current = blob;
                setPreviewUrl(URL.createObjectURL(blob));
                setPhase('reviewing');
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setSeconds(0);
            setPhase('recording');
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } catch {
            setError('Microphone access was denied or is unavailable — check your browser/app permissions.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const discard = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        blobRef.current = null;
        setPreviewUrl(null);
        setSeconds(0);
        setPhase('idle');
    };

    const save = async () => {
        if (!blobRef.current) return;
        setPhase('uploading');
        setError(null);
        try {
            const ext = (blobRef.current.type.split('/')[1] || 'webm').split(';')[0];
            const filename = `meeting-${Date.now()}.${ext}`;
            const params = new URLSearchParams({ filename, durationSeconds: String(seconds) });
            if ('calendarEntryId' in scope) {
                params.set('calendarEntryId', scope.calendarEntryId);
            } else {
                params.set('workspaceId', scope.workspaceId);
                if (scope.briefId) params.set('briefId', scope.briefId);
            }
            if (title) params.set('title', title);

            const res = await fetch(`/api/meetings/upload-audio?${params.toString()}`, {
                method: 'POST',
                body: blobRef.current,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Upload failed');
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            blobRef.current = null;
            setPreviewUrl(null);
            setSeconds(0);
            setPhase('idle');
            await loadRecordings();
            onSaved?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the recording — please try again.');
            setPhase('reviewing');
        }
    };

    const removeRecording = async (id: string) => {
        setRecordings(prev => prev?.filter(r => r.id !== id) ?? prev);
        const result = await deleteMeetingRecording(id);
        if (!result.success) await loadRecordings();
    };

    return (
        <div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.9rem 1rem', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb',
            }}>
                {phase === 'idle' && (
                    <button
                        onClick={startRecording}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                            background: '#dc2626', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        <Mic size={14} /> Record meeting
                    </button>
                )}

                {phase === 'recording' && (
                    <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                            {formatDuration(seconds)}
                        </span>
                        <button
                            onClick={stopRecording}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                                background: '#111827', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Square size={13} /> Stop
                        </button>
                    </>
                )}

                {phase === 'reviewing' && previewUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                        <audio controls src={previewUrl} style={{ height: 32, maxWidth: 260 }} />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatDuration(seconds)}</span>
                        <button
                            onClick={save}
                            style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                background: '#0d9488', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Save
                        </button>
                        <button
                            onClick={discard}
                            style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #e5e7eb',
                                background: '#fff', color: '#374151', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Discard
                        </button>
                    </div>
                )}

                {phase === 'uploading' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280' }}>
                        <Loader size={14} className="rm-spin" /> Saving…
                    </span>
                )}
            </div>

            {error && <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: '0.5rem 0 0' }}>{error}</p>}

            <div style={{ marginTop: '0.9rem' }}>
                {loadingList && <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Loading recordings…</p>}
                {!loadingList && recordings?.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>No recordings yet.</p>
                )}
                {!loadingList && recordings && recordings.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recordings.map(r => {
                            const badge = transcriptBadge(r.transcriptStatus);
                            return (
                                <div key={r.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
                                    padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
                                }}>
                                    <FileAudio size={15} color="#6b7280" />
                                    <audio controls src={r.audioUrl} style={{ height: 30, flex: '1 1 220px', minWidth: 200 }} />
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatDuration(r.durationSeconds)}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatDate(r.createdAt)}{r.createdByName ? ` · ${r.createdByName}` : ''}</span>
                                    <span style={{
                                        fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                                        padding: '2px 8px', borderRadius: 999,
                                        background: badge.bg, color: badge.fg,
                                    }}>
                                        {badge.label}
                                    </span>
                                    <button
                                        onClick={() => removeRecording(r.id)}
                                        title="Delete recording"
                                        style={{ display: 'flex', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                    {r.transcriptText && (
                                        <p style={{ width: '100%', fontSize: '0.75rem', color: '#374151', lineHeight: 1.5, margin: '0.3rem 0 0' }}>
                                            {r.transcriptText}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
