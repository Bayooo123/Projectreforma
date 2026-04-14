"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, User, Users, MapPin, FileText, AlertCircle, Loader, Building, Edit, Trash2 } from 'lucide-react';
import { adjournMatter, addMatterNote, updateMatter, deleteMatter, updateCalendarEntry } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';
import styles from './MatterDetailModal.module.css';

import { Matter } from '@/types/legal';

interface MatterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    matter: Matter;
    userId: string;
}

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
}

const MatterDetailModal = ({ isOpen, onClose, matter, userId }: MatterDetailModalProps) => {
    const [newDate, setNewDate] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');
    const [proceedings, setProceedings] = useState('');
    const [observations, setObservations] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);

    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);
    const [editedMatter, setEditedMatter] = useState(matter);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);
    const [editingJudgeValue, setEditingJudgeValue] = useState('');

    // Sync editedMatter when matter prop updates from background fetch
    useEffect(() => {
        if (!isEditMode) {
            setEditedMatter(matter);
        }
    }, [matter, isEditMode]);

    useEffect(() => {
        if (isOpen && matter.workspaceId) {
            fetchLawyers();
        }
    }, [isOpen, matter.workspaceId, matter.id]);

    const fetchLawyers = async () => {
        setIsLoadingLawyers(true);
        try {
            const data = await getLawyersForWorkspace(matter.workspaceId);
            setLawyers(data);
            const initialSelected = matter.lawyers.map(l => l.lawyer.id);
            setSelectedLawyerIds(initialSelected);
        } catch (error) {
            console.error('Error fetching lawyers:', error);
        } finally {
            setIsLoadingLawyers(false);
        }
    };

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev =>
            prev.includes(lawyerId)
                ? prev.filter(id => id !== lawyerId)
                : [...prev, lawyerId]
        );
    };

    if (!isOpen) return null;

    const handleAdjourn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDate || !adjournedFor) {
            alert('Please fill in all adjournment fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await adjournMatter(
                matter.id,
                new Date(newDate),
                proceedings || 'Court adjourned',
                adjournedFor,
                userId,
                selectedLawyerIds
            );

            if (result.success) {
                if (proceedings.trim()) {
                    await addMatterNote(matter.id, `Proceedings: ${proceedings}`, userId);
                }

                if (observations.trim()) {
                    await addMatterNote(matter.id, `Observations: ${observations}`, userId);
                }

                alert('Adjournment saved successfully!');
                onClose();
            } else {
                alert('Failed to save adjournment: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving adjournment:', error);
            alert('An error occurred while saving');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleEdit = () => {
        setIsEditMode(true);
        setEditedMatter(matter);
    };

    const handleSaveEdit = async () => {
        setIsSubmitting(true);
        try {
            const result = await updateMatter(
                matter.id,
                {
                    name: editedMatter.name,
                    court: editedMatter.court || undefined,
                    judge: editedMatter.judge || undefined,
                },
                userId
            );

            if (result.success) {
                alert('Matter updated successfully!');
                setIsEditMode(false);
                onClose();
            } else {
                alert('Failed to update matter: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating matter:', error);
            alert('An error occurred while updating');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${matter.name}"? This action cannot be undone.`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await deleteMatter(matter.id);

            if (result.success) {
                alert('Matter deleted successfully!');
                onClose();
            } else {
                alert('Failed to delete matter: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting matter:', error);
            alert('An error occurred while deleting');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        {isEditMode ? (
                            <input
                                type="text"
                                className={styles.titleInput}
                                value={editedMatter.name}
                                onChange={(e) => setEditedMatter({ ...editedMatter, name: e.target.value })}
                            />
                        ) : (
                            <h2 className={styles.title}>{matter.name}</h2>
                        )}
                        <span className={styles.subtitle}>{matter.caseNumber}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isEditMode ? (
                            <>
                                <button onClick={handleEdit} className={styles.editBtn} disabled={isSubmitting}>
                                    <Edit size={16} />
                                </button>
                                <button onClick={handleDelete} className={styles.deleteBtn} disabled={isSubmitting}>
                                    <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleSaveEdit} className={styles.saveBtn} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader size={16} className="animate-spin" /> : 'Save'}
                                </button>
                                <button onClick={() => setIsEditMode(false)} className={styles.cancelEditBtn} disabled={isSubmitting}>
                                    Cancel
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <Calendar size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Next Court Date</span>
                                <p className={styles.value}>{formatDate(matter.nextCourtDate)}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <MapPin size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Court</span>
                                <p className={styles.value}>{matter.court || 'Not specified'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Judge</span>
                                <p className={styles.value}>{matter.judge || '—'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Appearing Counsel</span>
                                <div className={styles.value}>
                                    {matter.lawyers && matter.lawyers.length > 0 ? (
                                        <div className="flex flex-col gap-1 mt-1">
                                            {matter.lawyers.map((assoc, idx) => (
                                                <div key={idx} className="text-xs bg-surface-subtle border border-border px-2 py-1 rounded">
                                                    <span className="font-semibold">{assoc.lawyer.name}</span>
                                                    <span className="text-secondary ml-1">({assoc.role})</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>—</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <Building size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Client</span>
                                <p className={styles.value}>{matter.client?.name || (matter as any).clientNameRaw || 'Unknown Client'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <AlertCircle size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Status</span>
                                <p className={styles.value} style={{ textTransform: 'capitalize' }}>
                                    {matter.status}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FileText size={16} /> Case History & Proceedings
                        </h3>

                        {(matter.calendarEntries && matter.calendarEntries.length > 0) ? (
                            <div className="flex flex-col gap-4 mt-3">
                                {matter.calendarEntries.map((entry) => (
                                    <div key={entry.id} className="relative pl-6 border-l-2 border-border pb-4 last:pb-0 last:border-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 border-2 border-white"></div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm text-slate-800">
                                                        {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {(entry.type === 'CLIENT_MEETING' || entry.type === 'INTERNAL_MEETING') && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                                                            Meeting
                                                        </span>
                                                    )}
                                                    {entry.title && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                                            {entry.title}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {entry.proceedings || entry.agenda || entry.location ? (
                                                <div className="text-sm text-tertiary bg-surface-subtle p-3 rounded-md mt-1 whitespace-pre-wrap">
                                                    {entry.proceedings}
                                                    {entry.agenda && <div><strong>Agenda:</strong> {entry.agenda}</div>}
                                                    {entry.location && <div><strong>Location:</strong> {entry.location}</div>}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400 italic">No details recorded.</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm bg-surface-subtle rounded-lg border border-dashed border-border px-4">
                                No activities recorded yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.section} style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <h3 className={styles.sectionTitle}>
                        <Calendar size={16} /> Quick Adjourn (Next Date)
                    </h3>
                    <form onSubmit={handleAdjourn} className={styles.adjournForm}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Adjourned To *</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Adjourned For *</label>
                                <select
                                    className={styles.select}
                                    value={adjournedFor}
                                    onChange={(e) => setAdjournedFor(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select purpose...</option>
                                    <option value="ruling">Ruling</option>
                                    <option value="judgment">Judgment</option>
                                    <option value="hearing">Hearing</option>
                                    <option value="mention">Mention</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className={styles.adjournBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : 'Save Adjournment'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MatterDetailModal;
