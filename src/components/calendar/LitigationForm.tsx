"use client";

import { useState } from 'react';
import { X, Loader, Gavel } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import styles from './LitigationForm.module.css';

interface LitigationFormProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
    mode?: 'create';
}

const LitigationForm = ({
    isOpen,
    onClose,
    workspaceId,
    userId,
    onSuccess,
}: LitigationFormProps) => {
    const [name, setName] = useState('');
    const [caseNumber, setCaseNumber] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createMatter({
                workspaceId,
                userId,
                name: name.trim(),
                caseNumber: caseNumber || undefined,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
            });

            if (result.success) {
                onSuccess?.();
                onClose();
                return;
            }

            alert(result.error || 'Failed to create matter');
        } catch (error) {
            console.error('Failed to create matter:', error);
            alert('Failed to create matter');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>New Court Matter</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Matter Title *</label>
                            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Case Number</label>
                            <input className={styles.input} value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Court</label>
                            <input className={styles.input} value={court} onChange={(e) => setCourt(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Judge</label>
                            <input className={styles.input} value={judge} onChange={(e) => setJudge(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Next Court Date</label>
                            <input type="date" className={styles.input} value={nextCourtDate} onChange={(e) => setNextCourtDate(e.target.value)} />
                        </div>
                    </form>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
                        {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Gavel size={16} />}
                        <span>{isSubmitting ? 'Saving...' : 'Create Matter'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LitigationForm;
