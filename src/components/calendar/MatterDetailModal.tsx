"use client";

import { useState } from 'react';
import { X, Calendar, User, MapPin, FileText, AlertCircle, Loader, Building, Edit, Trash2 } from 'lucide-react';
import { adjournMatter, addMatterNote, updateMatter, deleteMatter } from '@/app/actions/matters';
import styles from './MatterDetailModal.module.css';

interface Matter {
    id: string;
    caseNumber: string;
    name: string;
    court: string | null;
    judge: string | null;
    status: string;
    nextCourtDate: Date | null;
    client: {
        id: string;
        name: string;
    };
    assignedLawyer: {
        id: string;
        name: string | null;
    };
    briefs: {
        id: string;
        briefNumber: string;
        name: string;
    }[];
}

interface MatterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    matter: Matter;
    userId: string;
}

const MatterDetailModal = ({ isOpen, onClose, matter, userId }: MatterDetailModalProps) => {
    const [newDate, setNewDate] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');
    const [proceedings, setProceedings] = useState('');
    const [observations, setObservations] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedMatter, setEditedMatter] = useState(matter);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                userId
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
                                <p className={styles.value}>{matter.judge || 'Not assigned'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Lawyer</span>
                                <p className={styles.value}>{matter.assignedLawyer.name || 'Unassigned'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <Building size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Client</span>
                                <p className={styles.value}>{matter.client.name}</p>
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
                                        'No linked briefs'
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FileText size={16} /> Summary of Proceedings
                        </h3>
                        <textarea
                            className={styles.textarea}
                            placeholder="Enter what happened in court today..."
                            rows={3}
                            value={proceedings}
                            onChange={(e) => setProceedings(e.target.value)}
                        />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <AlertCircle size={16} /> Observations
                        </h3>
                        <textarea
                            className={styles.textarea}
                            placeholder="Any important observations or notes..."
                            rows={2}
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                        />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Calendar size={16} /> Adjournment Details
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
