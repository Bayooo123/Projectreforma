'use client';

import React, { useState } from 'react';
import { X, Mic, Check, Loader2, Save, FileText, Play } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { recordMeeting } from '@/app/actions/matters';
import styles from '../calendar/MatterDetailModal.module.css';

interface CreateMeetingRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    matterId: string;
    workspaceId: string;
    onSuccess: () => void;
}

export const CreateMeetingRecordModal: React.FC<CreateMeetingRecordModalProps> = ({
    isOpen,
    onClose,
    matterId,
    workspaceId,
    onSuccess,
}) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'reviewing'>('idle');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [transcription, setTranscription] = useState('');
    const [summary, setSummary] = useState('');
    const [actionItems, setActionItems] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const handleRecordingComplete = async (url: string, dur: number) => {
        setAudioUrl(url);
        setDuration(dur);
        setStatus('reviewing');

        // AUTOMATION: Immediately save the record and let processing happen in background
        setIsSubmitting(true);
        try {
            const result = await recordMeeting({
                matterId,
                date: new Date(),
                participants: 'Recorded Session',
                summary: 'Processing meeting insights...',
                transcription: 'Transcription in progress...',
                actionItems: '',
                audioUrl: url,
                audioDuration: dur
            } as any);

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                alert('Error saving record: ' + result.error);
            }
        } catch (err) {
            console.error('Auto-save error:', err);
            alert('An error occurred while saving automatically.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSave = async () => {
        if (!summary) {
            alert('Please provide a summary of the meeting.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await recordMeeting({
                matterId,
                date: new Date(),
                participants: 'Recorded Session', // We can add a participants field to the UI later
                summary,
                transcription,
                actionItems,
                audioUrl: audioUrl || undefined,
                audioDuration: duration
            } as any);

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                alert('Error saving record: ' + result.error);
            }
        } catch (err) {
            console.error('Save error:', err);
            alert('An error occurred while saving.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} style={{ zIndex: 1100 }}>
            <div className={styles.modal} style={{ maxWidth: '600px' }}>
                <div className={styles.header}>
                    <div className="flex items-center gap-2">
                        <Mic className="text-red-500" size={20} />
                        <h2 className={styles.title}>Record Meeting</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {status === 'idle' || status === 'recording' || status === 'processing' ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                onStatusChange={setStatus}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border">
                                <div className="flex items-center gap-3 font-medium text-slate-700">
                                    <div className="bg-green-100 text-green-700 p-2 rounded-full">
                                        <Check size={16} />
                                    </div>
                                    Audio Recorded ({Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')})
                                </div>
                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setSummary('');
                                        setTranscription('');
                                        setActionItems('');
                                    }}
                                    className="text-xs text-red-500 hover:underline font-medium"
                                >
                                    Discard and Retake
                                </button>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Meeting Summary *</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Briefly describe what was discussed and any outcomes..."
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Action Items</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="What needs to be done next..."
                                    value={actionItems}
                                    onChange={(e) => setActionItems(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Transcription</label>
                                <div className="relative">
                                    <textarea
                                        className={`${styles.textarea} bg-slate-50 text-slate-600 font-mono text-xs`}
                                        placeholder={isTranscribing ? "Generating transcription..." : "AI Generated transcription will appear here..."}
                                        value={transcription}
                                        onChange={(e) => setTranscription(e.target.value)}
                                        rows={6}
                                        readOnly={isTranscribing}
                                    />
                                    {isTranscribing && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[1px] rounded-md">
                                            <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                                                <Loader2 className="animate-spin" size={16} />
                                                Transcribing and Summarizing...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center p-4 border-t bg-slate-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-md transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    {status === 'reviewing' && (
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting || isTranscribing}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Record
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
