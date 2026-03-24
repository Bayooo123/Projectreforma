"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader, Search, FileText, Calendar, User, Mic, Check, Loader2 } from 'lucide-react';
import { recordMeeting } from '@/app/actions/matters';
import { getBriefs } from '@/lib/briefs';
import { AudioRecorder } from '../meetings/AudioRecorder';
import styles from './LitigationForm.module.css';

interface RecordMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
    calendarEntryId?: string; // Optional: if recording for an existing entry
}

const RecordMeetingModal = ({
    isOpen,
    onClose,
    workspaceId,
    userId,
    onSuccess,
    calendarEntryId
}: RecordMeetingModalProps) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [participants, setParticipants] = useState('');
    const [summary, setSummary] = useState('');
    const [actionItems, setActionItems] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [selectedMatterId, setSelectedMatterId] = useState('');

    const [matters, setMatters] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // AI Recording State
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'reviewing'>('idle');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [transcriptText, setTranscriptText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startPolling = (id: string) => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/meetings/status?id=${id}`);
                const result = await res.json();
                
                if (result.status === 'completed') {
                    setTranscriptText(result.data.transcriptText || '');
                    setSummary(result.data.summary || '');
                    setActionItems(result.data.actionItems || '');
                    setIsTranscribing(false);
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                } else if (result.status === 'failed') {
                    setIsTranscribing(false);
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
    };

    const handleRecordingComplete = async (recId: string, url: string, dur: number) => {
        setRecordingId(recId);
        setAudioUrl(url);
        setDuration(dur);
        setStatus('reviewing');
        setIsTranscribing(true);

        try {
            // Trigger transcription (async)
            fetch('/api/meetings/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordingId: recId }),
            });

            // Start polling for results
            startPolling(recId);
        } catch (err) {
            console.error('Transcription trigger error:', err);
            setIsTranscribing(false);
        }
    };

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
        }
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [isOpen, workspaceId]);

    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const briefsData = await getBriefs(workspaceId);
            setMatters(briefsData.filter(b => b.matter).map(b => b.matter));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary) {
            alert('Please provide a meeting summary.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await recordMeeting({
                recordingId: recordingId || undefined,
                calendarEntryId: calendarEntryId || undefined,
                matterId: selectedMatterId || undefined,
                date: new Date(date),
                participants: participants,
                summary,
                transcriptText,
                actionItems: actionItems || undefined,
                followUpDate: followUpDate ? new Date(followUpDate) : undefined,
                audioUrl: audioUrl || undefined,
                audioDuration: duration
            });

            if (result.success) {
                onSuccess?.();
                onClose();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error recording meeting:', error);
            alert('Failed to record meeting');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Record Meeting Notes</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className="flex flex-col gap-6">
                        {/* Recording Section */}
                        <div className="flex flex-col items-center py-2">
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                onStatusChange={setStatus}
                                calendarEntryId={calendarEntryId}
                                matterId={selectedMatterId}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date of Meeting *</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Linked Matter (Optional)</label>
                                <select
                                    className={styles.select}
                                    value={selectedMatterId}
                                    onChange={(e) => setSelectedMatterId(e.target.value)}
                                >
                                    <option value="">No linked matter</option>
                                    {matters.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Participants</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                                <textarea
                                    className={`${styles.textarea} pl-10`}
                                    style={{ height: '50px' }}
                                    placeholder="Who attended this meeting?"
                                    value={participants}
                                    onChange={(e) => setParticipants(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Meeting Summary *</label>
                            <div className="relative">
                                <textarea
                                    className={styles.textarea}
                                    style={{ height: '120px' }}
                                    placeholder={isTranscribing ? "Generating summary..." : "What was discussed? Decisions made..."}
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    required
                                />
                                {isTranscribing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-md">
                                        <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                                            <Loader2 className="animate-spin" size={16} />
                                            Analyzing...
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Action Items</label>
                            <textarea
                                className={styles.textarea}
                                style={{ height: '80px' }}
                                placeholder={isTranscribing ? "Extracting action items..." : "Points for follow-up..."}
                                value={actionItems}
                                onChange={(e) => setActionItems(e.target.value)}
                            />
                        </div>

                        {transcriptText && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full Transcription</label>
                                <textarea
                                    className={`${styles.textarea} font-mono text-[10px] bg-surface-subtle`}
                                    style={{ height: '80px' }}
                                    value={transcriptText}
                                    onChange={(e) => setTranscriptText(e.target.value)}
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Follow-up Date</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    className={styles.input}
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || isTranscribing || !summary}
                    >

                        {isSubmitting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                <span>Saving Record...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save Record</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordMeetingModal;
