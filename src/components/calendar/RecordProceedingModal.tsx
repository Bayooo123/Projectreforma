"use client";

import { useState, useEffect, useTransition } from 'react';
import { X, Gavel, FileText, Users, Check, Loader, ChevronDown } from 'lucide-react';
import styles from './EventModal.module.css';
import litStyles from './LitigationForm.module.css';
import { getMattersForWorkspace, recordProceeding } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';

interface Lawyer { id: string; name: string | null; email: string | null }
interface Matter { id: string; name: string; caseNumber: string | null; court: string | null; judge: string | null }

interface RecordProceedingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

const OUTCOMES = [
    { value: '', label: '— Select outcome —' },
    { value: 'adjourned', label: 'Adjourned' },
    { value: 'part_heard', label: 'Part-Heard' },
    { value: 'judgment_delivered', label: 'Judgment Delivered' },
    { value: 'ruling', label: 'Ruling' },
    { value: 'settled', label: 'Settled / Withdrawn' },
    { value: 'struck_out', label: 'Struck Out' },
    { value: 'hearing_concluded', label: 'Hearing Concluded' },
];

export default function RecordProceedingModal({ isOpen, onClose, workspaceId, userId, onSuccess }: RecordProceedingModalProps) {
    const [matters, setMatters] = useState<Matter[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [selectedMatterId, setSelectedMatterId] = useState('');
    const [sittingDate, setSittingDate] = useState('');
    const [proceedings, setProceedings] = useState('');
    const [outcome, setOutcome] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');
    const [adjournedTo, setAdjournedTo] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!isOpen) return;
        setLoadingData(true);
        Promise.all([
            getMattersForWorkspace(workspaceId),
            getLawyersForWorkspace(workspaceId),
        ]).then(([m, l]) => {
            setMatters(m as Matter[]);
            setLawyers(l as Lawyer[]);
        }).catch(console.error).finally(() => setLoadingData(false));
    }, [isOpen, workspaceId]);

    function reset() {
        setSelectedMatterId(''); setSittingDate('');
        setProceedings(''); setOutcome(''); setAdjournedFor(''); setAdjournedTo('');
        setSelectedLawyerIds(new Set()); setError('');
    }

    function handleClose() { reset(); onClose(); }

    function toggleLawyer(id: string) {
        setSelectedLawyerIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const selectedMatter = matters.find(m => m.id === selectedMatterId);

    function handleSubmit() {
        if (!selectedMatterId) { setError('Please select a matter.'); return; }
        if (!sittingDate) { setError('Please enter the date of this sitting.'); return; }
        if (!proceedings.trim()) { setError('Please describe what happened in court.'); return; }
        setError('');

        startTransition(async () => {
            const result = await recordProceeding({
                matterId: selectedMatterId,
                date: new Date(sittingDate),
                proceedings: proceedings.trim(),
                outcome: outcome || undefined,
                adjournedFor: adjournedFor || undefined,
                adjournedTo: adjournedTo ? new Date(adjournedTo) : undefined,
                appearingLawyerIds: Array.from(selectedLawyerIds),
                userId,
            });

            if (result.success) {
                onSuccess?.();
                handleClose();
            } else {
                setError(result.error || 'Failed to save. Please try again.');
            }
        });
    }

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>

                <div className={styles.header}>
                    <div className={styles.badge} style={{ background: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Gavel size={13} /> Record Court Proceeding
                    </div>
                    <button onClick={handleClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    {loadingData ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                            <Loader size={20} className="animate-spin" color="#94a3b8" />
                        </div>
                    ) : (
                        <>
                            {/* Matter + Date — always visible */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={lbl}>Matter *</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={selectedMatterId}
                                            onChange={e => setSelectedMatterId(e.target.value)}
                                            style={{ ...sel, paddingRight: '2.5rem', appearance: 'none' }}
                                        >
                                            <option value="">— Select a matter —</option>
                                            {matters.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name}{m.caseNumber ? ` (${m.caseNumber})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} style={chevron} />
                                    </div>
                                    {selectedMatter?.court && (
                                        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                                            {selectedMatter.court}{selectedMatter.judge ? ` · ${selectedMatter.judge}` : ''}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label style={lbl}>Date of Sitting *</label>
                                    <input type="date" value={sittingDate} onChange={e => setSittingDate(e.target.value)} style={sel} />
                                </div>
                                <div>
                                    <label style={lbl}>Adjourned For</label>
                                    <input value={adjournedFor} onChange={e => setAdjournedFor(e.target.value)} placeholder="e.g. Adoption of Addresses" style={sel} />
                                </div>
                            </div>

                            {/* What happened */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={lbl}>
                                    <FileText size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    What Happened in Court *
                                </label>
                                <textarea
                                    value={proceedings}
                                    onChange={e => setProceedings(e.target.value)}
                                    placeholder="Describe the events of the sitting — arguments made, applications moved, orders given..."
                                    rows={5}
                                    style={{ ...sel, resize: 'vertical', lineHeight: 1.6 }}
                                />
                            </div>

                            {/* Outcome + Next date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={lbl}>Outcome</label>
                                    <div style={{ position: 'relative' }}>
                                        <select value={outcome} onChange={e => setOutcome(e.target.value)} style={{ ...sel, paddingRight: '2.5rem', appearance: 'none' }}>
                                            {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <ChevronDown size={16} style={chevron} />
                                    </div>
                                </div>
                                <div>
                                    <label style={lbl}>Adjourned To (Next Date)</label>
                                    <input type="date" value={adjournedTo} onChange={e => setAdjournedTo(e.target.value)} style={sel} />
                                </div>
                            </div>

                            {/* Lawyers who appeared */}
                            {lawyers.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.65rem' }}>
                                        <Users size={12} /> Lawyers Who Appeared
                                    </label>
                                    <div className={litStyles.lawyerSelector}>
                                        {lawyers.map(lawyer => {
                                            const selected = selectedLawyerIds.has(lawyer.id);
                                            return (
                                                <button
                                                    key={lawyer.id}
                                                    type="button"
                                                    onClick={() => toggleLawyer(lawyer.id)}
                                                    className={`${litStyles.lawyerBadge} ${selected ? litStyles.activeBadge : ''}`}
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

                            {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
                        </>
                    )}
                </div>

                <div className={styles.footer} style={{ gap: '0.75rem' }}>
                    <button
                        onClick={handleClose}
                        style={{ padding: '0.65rem 1.25rem', borderRadius: 8, background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending || loadingData}
                        className={styles.primaryBtn}
                        style={{ background: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {isPending ? <><Loader size={14} className="animate-spin" /> Saving...</> : <><Gavel size={14} /> Save Proceeding</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
};

const sel: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.9rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
};

const chevron: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none',
};
