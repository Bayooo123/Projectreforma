"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, Loader, Search, Users, MapPin, AlignLeft } from 'lucide-react';
import { scheduleMeeting } from '@/app/actions/matters';
import { getLawyersForWorkspace, getBriefs } from '@/lib/briefs';
import styles from './LitigationForm.module.css';

interface ScheduleMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

const ScheduleMeetingModal = ({
    isOpen,
    onClose,
    workspaceId,
    userId,
    onSuccess
}: ScheduleMeetingModalProps) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('10:00');
    const [type, setType] = useState<'CLIENT_MEETING' | 'INTERNAL_MEETING'>('CLIENT_MEETING');
    const [location, setLocation] = useState('');
    const [agenda, setAgenda] = useState('');
    const [selectedMatterId, setSelectedMatterId] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([userId]);

    const [lawyers, setLawyers] = useState<any[]>([]);
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
            const [lawyersData, briefsData] = await Promise.all([
                getLawyersForWorkspace(workspaceId),
                getBriefs(workspaceId)
            ]);
            setLawyers(lawyersData);
            setMatters(briefsData.filter(b => b.matter).map(b => b.matter));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev =>
            prev.includes(lawyerId)
                ? prev.filter(id => id !== lawyerId)
                : [...prev, lawyerId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const meetingDateTime = new Date(`${date}T${time}`);
            const result = await scheduleMeeting({
                title,
                date: meetingDateTime,
                type,
                matterId: selectedMatterId || undefined,
                location: location || undefined,
                agenda: agenda || undefined,
                participantIds: selectedLawyerIds,
                workspaceId
            });

            if (result.success) {
                onSuccess?.();
                onClose();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            alert('Failed to schedule meeting');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Schedule Meeting</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.content} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Meeting Title *</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Strategy Review"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date *</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Time *</label>
                            <input
                                type="time"
                                className={styles.input}
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Meeting Type</label>
                        <select
                            className={styles.select}
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <option value="CLIENT_MEETING">Client Meeting</option>
                            <option value="INTERNAL_MEETING">Internal Meeting</option>
                        </select>
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
                        <label className={styles.label}>Location / Link</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className={styles.input}
                                style={{ paddingLeft: '2.5rem' }}
                                placeholder="Meeting room or URL..."
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Participants</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {lawyers.map(l => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => toggleLawyer(l.id)}
                                    className={`${styles.lawyerBtn} ${selectedLawyerIds.includes(l.id) ? styles.lawyerBtnActive : styles.lawyerBtnInactive}`}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Agenda / Objectives</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Points to discuss..."
                            value={agenda}
                            onChange={(e) => setAgenda(e.target.value)}
                        />
                    </div>
                </form>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                <span>Scheduling...</span>
                            </>
                        ) : (
                            <>
                                <Calendar size={16} />
                                <span>Schedule Meeting</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleMeetingModal;
