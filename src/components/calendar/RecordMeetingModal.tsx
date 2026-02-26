"use client";

import { useState, useEffect } from 'react';
import { X, Save, Loader, Search, FileText, Calendar, User } from 'lucide-react';
import { recordMeeting } from '@/app/actions/matters';
import { getLawyersForWorkspace, getBriefs } from '@/lib/briefs';
import styles from './LitigationForm.module.css';

interface RecordMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

const RecordMeetingModal = ({
    isOpen,
    onClose,
    workspaceId,
    userId,
    onSuccess
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

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
        }
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
                matterId: selectedMatterId || undefined,
                date: new Date(date),
                participants: participants, // JSON or Bson? PRISMA schema says Json? 
                // Wait, schema.prisma: participants Json?
                // Actually my Prisma schema in Step 143 says: participants Json
                // So I should pass it as string or array?
                // Let's pass it as string for now if it's a textarea.
                summary,
                actionItems: actionItems || undefined,
                followUpDate: followUpDate ? new Date(followUpDate) : undefined
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

                <form className={styles.content} onSubmit={handleSubmit}>
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

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Participants</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3 text-slate-400" />
                            <textarea
                                className={`${styles.textarea} pl-10`}
                                style={{ height: '60px' }}
                                placeholder="Who attended this meeting?"
                                value={participants}
                                onChange={(e) => setParticipants(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Meeting Summary *</label>
                        <textarea
                            className={styles.textarea}
                            style={{ height: '150px' }}
                            placeholder="What was discussed? Decisions made..."
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Action Items</label>
                        <textarea
                            className={styles.textarea}
                            style={{ height: '80px' }}
                            placeholder="Points for follow-up..."
                            value={actionItems}
                            onChange={(e) => setActionItems(e.target.value)}
                        />
                    </div>

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
                </form>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || !summary}
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
