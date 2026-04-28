"use client";

import { useState, useEffect } from 'react';
import { X, Loader, Gavel, Check } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';
import styles from './LitigationForm.module.css';

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
}

interface LitigationFormProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
    mode?: 'create';
}

const LitigationForm = ({ isOpen, onClose, workspaceId, userId, onSuccess }: LitigationFormProps) => {
    const [name, setName] = useState('');
    const [caseNumber, setCaseNumber] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [firstSittingDate, setFirstSittingDate] = useState('');
    const [proceedings, setProceedings] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');
    const [adjournedTo, setAdjournedTo] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<Set<string>>(new Set());
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        getLawyersForWorkspace(workspaceId)
            .then(l => setLawyers(l as Lawyer[]))
            .catch(console.error);
    }, [isOpen, workspaceId]);

    function resetForm() {
        setName(''); setCaseNumber(''); setCourt(''); setJudge('');
        setFirstSittingDate(''); setProceedings(''); setAdjournedFor('');
        setAdjournedTo(''); setSelectedLawyerIds(new Set()); setError('');
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    function toggleLawyer(id: string) {
        setSelectedLawyerIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Matter title is required.'); return; }
        setError('');
        setIsSubmitting(true);
        try {
            const result = await createMatter({
                workspaceId,
                userId,
                name: name.trim(),
                caseNumber: caseNumber || undefined,
                court: court || undefined,
                judge: judge || undefined,
                firstSittingDate: firstSittingDate ? new Date(firstSittingDate) : undefined,
                proceedings: proceedings || undefined,
                adjournedFor: adjournedFor || undefined,
                adjournedTo: adjournedTo ? new Date(adjournedTo) : undefined,
                appearingLawyerIds: Array.from(selectedLawyerIds),
            });

            if (result.success) {
                resetForm();
                onSuccess?.();
                onClose();
                return;
            }
            setError(result.error || 'Failed to create matter');
        } catch (err) {
            console.error('Failed to create matter:', err);
            setError('Failed to create matter. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>New Court Matter</h2>
                    <button onClick={handleClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <form className={styles.form} onSubmit={handleSubmit}>

                        {/* ── Matter Details ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                <label className={styles.label}>Matter Title *</label>
                                <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ayodele v. Federal Republic of Nigeria" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Case Number</label>
                                <input className={styles.input} value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="e.g. FHC/ABJ/CR/123/2024" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Judge</label>
                                <input className={styles.input} value={judge} onChange={e => setJudge(e.target.value)} placeholder="e.g. Hon. Justice A. Bello" />
                            </div>
                            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                <label className={styles.label}>Court</label>
                                <input className={styles.input} value={court} onChange={e => setCourt(e.target.value)} placeholder="e.g. Federal High Court, Abuja" />
                            </div>
                        </div>

                        {/* ── First Sitting ── */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                                First Sitting
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Date of First Sitting</label>
                                    <input type="date" className={styles.input} value={firstSittingDate} onChange={e => setFirstSittingDate(e.target.value)} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Adjourned For</label>
                                    <input className={styles.input} value={adjournedFor} onChange={e => setAdjournedFor(e.target.value)} placeholder="e.g. Hearing of Motion" />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label className={styles.label}>What Happened in Court</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={proceedings}
                                        onChange={e => setProceedings(e.target.value)}
                                        placeholder="Describe the events of the first sitting — arguments made, applications moved, orders given..."
                                        style={{ height: 100 }}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Adjourned To (Next Date)</label>
                                    <input type="date" className={styles.input} value={adjournedTo} onChange={e => setAdjournedTo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* ── Lawyers Who Appeared ── */}
                        {lawyers.length > 0 && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Lawyers Who Appeared</label>
                                <div className={styles.lawyerSelector}>
                                    {lawyers.map(lawyer => {
                                        const selected = selectedLawyerIds.has(lawyer.id);
                                        return (
                                            <button
                                                key={lawyer.id}
                                                type="button"
                                                onClick={() => toggleLawyer(lawyer.id)}
                                                className={`${styles.lawyerBadge} ${selected ? styles.activeBadge : ''}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                            >
                                                {selected && <Check size={12} />}
                                                {lawyer.name || lawyer.email}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
                    </form>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={handleClose} disabled={isSubmitting}>Cancel</button>
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
                        {isSubmitting ? <><Loader size={16} className="animate-spin" /> Saving...</> : <><Gavel size={16} /> Create Matter</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LitigationForm;
