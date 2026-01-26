"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import { generateCaseNumber } from '@/lib/matters';
import { getClientsForWorkspace, getLawyersForWorkspace } from '@/lib/briefs';
import { ASCOLP_LAWYERS } from '@/lib/firm-directory';
import styles from './AddMatterModal.module.css';

interface AddMatterModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

interface Client {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
}

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
}

const AddMatterModal = ({ isOpen, onClose, workspaceId, userId, onSuccess }: AddMatterModalProps) => {
    const [matterName, setMatterName] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [courtSummary, setCourtSummary] = useState('');

    // Removed: caseNumber, clientId, proceduralStatus, selectedLawyers, clientSearch, etc.

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load simplified since we don't need clients/lawyers lists anymore

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
            const result = await createMatter({
                name: matterName,
                workspaceId,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
                proceedings: courtSummary || undefined,
                // Pass empty/null for removed fields
                caseNumber: null,
                clientId: null,
                clientNameRaw: null,
                lawyerAssociations: [], // No lawyers assigned initially
                proceduralStatus: undefined,
                createdById: userId // Critical for logging
            });

            if (result.success) {
                // Reset form
                setMatterName('');
                setCourt('');
                setJudge('');
                setNextCourtDate('');
                setCourtSummary('');

                alert('Matter created successfully!');
                onSuccess?.();
                onClose();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error creating matter:', error);
            alert('An error occurred while creating the matter');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add New Matter</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Name of Matter *</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. State v. Johnson"
                                value={matterName}
                                onChange={(e) => setMatterName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Removed Suit Number, Procedural Status */}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Court</label>
                            <select
                                className={styles.select}
                                value={court}
                                onChange={(e) => setCourt(e.target.value)}
                            >
                                <option value="">Select Court...</option>
                                <option>State High Court</option>
                                <option>Federal High Court</option>
                                <option>National Industrial Court</option>
                                <option>Court of Appeal</option>
                                <option>Supreme Court</option>
                                <option>Magistrate Court</option>
                                <option>Customary Court</option>
                                <option>Sharia Court</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Presiding Judge</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Hon. Justice A.B. Cole"
                                value={judge}
                                onChange={(e) => setJudge(e.target.value)}
                            />
                        </div>

                        {/* Removed Client and Legal Team */}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Next Court Date (Optional)</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={nextCourtDate}
                                onChange={(e) => setNextCourtDate(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>What happened in court / Court summary (Optional)</label>
                            <textarea
                                className={styles.input}
                                style={{ height: '100px', resize: 'vertical' }}
                                placeholder="Brief summary of proceedings on the selected date..."
                                value={courtSummary}
                                onChange={(e) => setCourtSummary(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Gavel size={16} />
                                <span>Add Matter</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMatterModal;
