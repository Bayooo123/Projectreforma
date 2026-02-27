'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (audioUrl: string, duration: number) => void;
    onStatusChange?: (status: 'idle' | 'recording' | 'processing') => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onStatusChange }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                uploadAudio(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            onStatusChange?.('recording');

            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const uploadAudio = async (blob: Blob) => {
        setIsUploading(true);
        onStatusChange?.('processing');
        try {
            const filename = `recording-${Date.now()}.webm`;
            const response = await fetch(`/api/upload?filename=${filename}`, {
                method: 'POST',
                body: blob,
            });

            if (!response.ok) throw new Error('Failed to upload audio');

            const data = await response.json();
            onRecordingComplete(data.url, duration);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload audio recording.');
            onStatusChange?.('idle');
        } finally {
            setIsUploading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const reset = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setDuration(0);
        onStatusChange?.('idle');
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-4">
                {!isRecording && !audioUrl && (
                    <Button
                        onClick={startRecording}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 h-16 w-16 shadow-lg transition-transform hover:scale-105"
                    >
                        <Mic size={32} />
                    </Button>
                )}

                {isRecording && (
                    <Button
                        onClick={stopRecording}
                        className="bg-slate-800 hover:bg-slate-900 text-white rounded-full p-4 h-16 w-16 animate-pulse"
                    >
                        <Square size={32} />
                    </Button>
                )}

                {audioUrl && !isUploading && (
                    <div className="flex items-center gap-2">
                        <audio src={audioUrl} controls className="h-10" />
                        <Button variant="ghost" size="icon" onClick={reset} className="text-red-500">
                            <Trash2 size={20} />
                        </Button>
                    </div>
                )}

                {isUploading && (
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <Loader2 className="animate-spin" />
                        Processing recording...
                    </div>
                )}
            </div>

            {(isRecording || audioUrl) && (
                <div className="text-lg font-mono">
                    {formatTime(duration)}
                </div>
            )}
        </div>
    );
};
