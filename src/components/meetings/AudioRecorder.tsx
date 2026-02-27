'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Trash2, Loader2, Play, Pause, Activity } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (audioUrl: string, duration: number) => void;
    onStatusChange?: (status: 'idle' | 'recording' | 'processing') => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onStatusChange }) => {
    const [status, setInternalStatus] = useState<'idle' | 'recording' | 'processing' | 'reviewing'>('idle');
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const drawWaveform = useCallback(() => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#3b82f6'; // blue-500
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio Context for Visualizer
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const finalDuration = durationRef.current;
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setInternalStatus('reviewing');
                uploadAudio(blob, finalDuration);
            };

            mediaRecorder.start();
            setInternalStatus('recording');
            onStatusChange?.('recording');

            startTimeRef.current = Date.now();
            durationRef.current = 0;
            setDuration(0);

            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                durationRef.current = elapsed;
                setDuration(elapsed);
            }, 1000);

            drawWaveform();
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const uploadAudio = async (blob: Blob, finalDuration: number) => {
        setIsUploading(true);
        setInternalStatus('processing');
        onStatusChange?.('processing');
        try {
            const filename = `recording-${Date.now()}.webm`;
            const response = await fetch(`/api/upload?filename=${filename}`, {
                method: 'POST',
                body: blob,
            });

            if (!response.ok) throw new Error('Failed to upload audio');

            const data = await response.json();
            onRecordingComplete(data.url, finalDuration);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload audio recording.');
            setInternalStatus('idle');
            onStatusChange?.('idle');
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setDuration(0);
        durationRef.current = 0;
        setInternalStatus('idle');
        onStatusChange?.('idle');
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        };
    }, [audioUrl]);

    return (
        <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700/50 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-6">
                {/* Header/Status */}
                <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {status === 'idle' && 'Ready to Record'}
                            {status === 'recording' && 'Recording Audio'}
                            {status === 'processing' && 'Processing AI'}
                            {status === 'reviewing' && 'Review Recording'}
                        </span>
                    </div>
                    {status !== 'idle' && (
                        <div className="text-xl font-mono font-medium text-white tabular-nums">
                            {formatTime(duration)}
                        </div>
                    )}
                </div>

                {/* Waveform Visualization Area */}
                <div className="w-full h-24 bg-slate-800/50 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-700/30">
                    {status === 'recording' ? (
                        <canvas ref={canvasRef} className="w-full h-full" width={400} height={100} />
                    ) : status === 'processing' ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-blue-500" size={24} />
                            <span className="text-[10px] text-slate-400 font-medium">Extracting Insights...</span>
                        </div>
                    ) : status === 'reviewing' ? (
                        <div className="flex items-center gap-4 text-white">
                            <audio src={audioUrl!} controls className="h-8 max-w-[200px]" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-30 select-none">
                            <Activity size={32} className="text-slate-500" />
                            <span className="text-xs text-slate-500 mt-2">Silence</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 w-full">
                    {status === 'idle' ? (
                        <button
                            onClick={startRecording}
                            className="group relative flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            title="Start Recording"
                        >
                            <Mic size={32} className="text-white group-hover:animate-bounce" />
                            <div className="absolute inset-0 rounded-full border-2 border-red-400/30 group-hover:scale-125 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
                        </button>
                    ) : status === 'recording' ? (
                        <button
                            onClick={stopRecording}
                            className="group relative flex items-center justify-center w-20 h-20 bg-slate-100 hover:bg-white rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
                            title="Stop Recording"
                        >
                            <Square size={28} className="text-slate-900 fill-slate-900" />
                            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
                        </button>
                    ) : (
                        <button
                            onClick={reset}
                            disabled={isUploading}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider disabled:opacity-30"
                        >
                            <Trash2 size={16} />
                            Reset
                        </button>
                    )}
                </div>

                <p className="text-[10px] text-center text-slate-500 max-w-[240px] leading-relaxed">
                    {status === 'idle' && 'Click the microphone to begin recording. Ensure your microphone is active.'}
                    {status === 'recording' && 'Speak clearly. The AI will handle transcription and summarization automatically.'}
                    {status === 'processing' && 'Almost done! Our AI is processing your audio for perfect insights.'}
                </p>
            </div>
        </div>
    );
};
