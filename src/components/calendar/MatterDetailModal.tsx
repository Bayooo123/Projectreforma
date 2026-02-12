"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, FileText, AlertCircle, Loader, Building, Edit, Trash2, Scale } from 'lucide-react';
import { adjournMatter, addMatterNote, updateMatter, deleteMatter, updateCourtDate } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';
import styles from './MatterDetailModal.module.css';

interface Matter {
    id: string;
    workspaceId: string; // Added workspaceId
    caseNumber: string | null;
    name: string;
    court: string | null;
    judge: string | null;
    status: string;
    nextCourtDate: Date | null;
    client: {
        id: string;
        name: string;
    };
    lawyers: {
        lawyer: {
            id: string;
            name: string | null;
            email: string | null;
        };
        role: string;
    }[];
    briefs: {
        id: string;
        briefNumber: string;
        name: string;
    }[];
    courtDates?: {
        id: string;
        date: Date;
        title: string | null;
        proceedings: string | null;
        adjournedFor: string | null;
        judge: string | null;
        externalCounsel: string | null;
        appearances: { id: string; name: string | null }[];
    }[];
}

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

    // We need lists of lawyers to select from. Ideally pass this in or fetch it.
    // For now, assuming we might need to fetch workspace lawyers if not passed.
    // OPTIMIZATION: Just use the assignedLawyer as a default, but we need the full list.
    // Ideally, MatterDetailModal should receive the list of workspace lawyers or fetch them.
    // But since we can't easily change the props interface without changing the parent, 
    // we might need to fetch them client side on open.

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
    }, [isOpen, matter.workspaceId, matter.id]); // Added matter.id to re-fetch if matter changes (though workspaceId is usually static)

    const fetchLawyers = async () => {
        setIsLoadingLawyers(true);
        try {
            const data = await getLawyersForWorkspace(matter.workspaceId);
            setLawyers(data);
            // Default to matching lawyers from the matter
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
            // Save adjournment
            const result = await adjournMatter(
                matter.id,
                new Date(newDate),
                proceedings || 'Court adjourned',
                adjournedFor,
                userId,
                selectedLawyerIds
            );

            if (result.success) {
                // Save proceedings note if provided
                if (proceedings.trim()) {
                    await addMatterNote(matter.id, `Proceedings: ${proceedings}`, userId);
                }

                // Save observations note if provided
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

    const handleUpdateJudge = async (courtDateId: string) => {
        setIsSubmitting(true);
        try {
            const result = await updateCourtDate(
                courtDateId,
                { judge: editingJudgeValue },
                userId
            );

            if (result.success) {
                setEditingJudgeId(null);
            } else {
                alert('Failed to update judge: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating judge:', error);
            alert('An error occurred while updating judge');
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
                                                <div key={idx} className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                                                    <span className="font-semibold">{assoc.lawyer.name}</span>
                                                    <span className="text-slate-500 ml-1">({assoc.role})</span>
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
                        <div className={styles.metaItem} style={{ gridColumn: '1 / -1' }}>
                            <FileText size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Related Briefs</span>
                                <div className={styles.value}>
                                    {matter.briefs && matter.briefs.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {matter.briefs.map(brief => (
                                                <span
                                                    key={brief.id}
                                                    style={{
                                                        background: 'var(--surface-subtle)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                >
                                                    {brief.briefNumber} - {brief.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">
                                            {!matter.id.startsWith('temp') ? 'Loading briefs...' : 'No linked briefs'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FileText size={16} /> Case History & Proceedings
                        </h3>

                        {(matter.courtDates && matter.courtDates.length > 0) ? (
                            <div className="flex flex-col gap-4 mt-3">
                                {matter.courtDates.map((date, idx) => (
                                    <div key={date.id} className="relative pl-6 border-l-2 border-slate-200 pb-4 last:pb-0 last:border-0">
                                        {/* Timestamp Dot */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 border-2 border-white"></div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-start">
                                                <span className="font-semibold text-sm text-slate-800">
                                                    {new Date(date.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                                {date.title && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                                        {date.title}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Proceedings Narrative */}
                                            {date.proceedings ? (
                                                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md mt-1 whitespace-pre-wrap">
                                                    {date.proceedings}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400 italic">No proceedings recorded.</span>
                                            )}

                                            {/* Appearances - Showing all lawyers clearly */}
                                            {(date.appearances && date.appearances.length > 0 || date.externalCounsel) && (
                                                <div className="flex flex-col gap-1.5 mt-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        {date.appearances.map(lawyer => (
                                                            <div key={lawyer.id} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                                                                <User size={12} className="text-maroon-600" />
                                                                <span className="text-xs font-semibold text-slate-700">
                                                                    {lawyer.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {date.externalCounsel && (
                                                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md text-blue-700 italic">
                                                            <Scale size={12} />
                                                            <span className="text-xs font-medium">
                                                                {date.externalCounsel} (Opposing/External)
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Judge / Presiding Officer */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <User size={12} className="text-slate-400" />
                                                {editingJudgeId === date.id ? (
                                                    <div className="flex gap-1 items-center">
                                                        <input
                                                            type="text"
                                                            className="text-xs border rounded px-1 py-0.5"
                                                            value={editingJudgeValue}
                                                            onChange={(e) => setEditingJudgeValue(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateJudge(date.id)}
                                                            className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded"
                                                            disabled={isSubmitting}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingJudgeId(null)}
                                                            className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="group flex items-center gap-1">
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            Judge: {date.judge || '—'}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingJudgeId(date.id);
                                                                setEditingJudgeValue(date.judge || '');
                                                            }}
                                                            className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Edit size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer or outcome info */}
                                            {date.adjournedFor && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Adjourned for: <span className="font-medium">{date.adjournedFor}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                {!matter.id.startsWith('temp') && (!matter.courtDates || matter.courtDates.length === 0) ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader className="animate-spin text-slate-300" size={20} />
                                        <span>Looking for case history...</span>
                                    </div>
                                ) : (
                                    "No court proceedings recorded yet."
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.section} style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        <h3 className={styles.sectionTitle}>
                            <Calendar size={16} /> Quick Adjourn (Next Date)
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                            Use this to record a new adjournment if you haven't already. This creates a new future calendar entry.
                        </p>
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
                                        <option value="further_arguments">Further Arguments</option>
                                        <option value="mention">Mention</option>
                                        <option value="adoption">Adoption of Address</option>
                                        <option value="cross_examination">Cross Examination</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={styles.adjournBtn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Adjournment'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatterDetailModal;
