"use client";

import { useState, useEffect, useTransition } from 'react';
import { X, Gavel, FileText, Users, Check, Loader, ChevronDown } from 'lucide-react';
import styles from './EventModal.module.css';
import { getCourtEntriesForWorkspace } from '@/app/actions/calendar-events';
import { updateCalendarEntry } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
}

interface CourtEntry {
    id: string;
    title: string | null;
    date: Date | string;
    court: string | null;
    proceedings: string | null;
    outcome: string | null;
    adjournedFor: string | null;
    adjournedTo: Date | string | null;
    appearances: Lawyer[];
    matter: { id: string; name: string; caseNumber: string | null } | null;
}

interface RecordProceedingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
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

export default function RecordProceedingModal({ isOpen, onClose, workspaceId, onSuccess }: RecordProceedingModalProps) {
    const [entries, setEntries] = useState<CourtEntry[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [selectedEntryId, setSelectedEntryId] = useState('');
    const [proceedings, setProceedings] = useState('');
    const [outcome, setOutcome] = useState('');
    const [adjournedTo, setAdjournedTo] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!isOpen) return;
        setLoadingData(true);
        Promise.all([
            getCourtEntriesForWorkspace(workspaceId),
            getLawyersForWorkspace(workspaceId),
        ]).then(([e, l]) => {
            setEntries(e as CourtEntry[]);
            setLawyers(l as Lawyer[]);
        }).catch(console.error).finally(() => setLoadingData(false));
    }, [isOpen, workspaceId]);

    // Pre-fill when entry selected
    useEffect(() => {
        const entry = entries.find(e => e.id === selectedEntryId);
        if (!entry) return;
        setProceedings(entry.proceedings || '');
        setOutcome(entry.outcome || '');
        setAdjournedTo(entry.adjournedTo ? new Date(entry.adjournedTo).toISOString().split('T')[0] : '');
        setSelectedLawyerIds(new Set(entry.appearances.map(a => a.id)));
    }, [selectedEntryId]);

    function toggleLawyer(id: string) {
        setSelectedLawyerIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function handleClose() {
        setSelectedEntryId('');
        setProceedings('');
        setOutcome('');
        setAdjournedTo('');
        setSelectedLawyerIds(new Set());
        setError('');
        onClose();
    }

    function handleSubmit() {
        if (!selectedEntryId) { setError('Please select a court date.'); return; }
        if (!proceedings.trim()) { setError('Please describe what happened in court.'); return; }
        setError('');

        startTransition(async () => {
            const result = await updateCalendarEntry(selectedEntryId, {
                proceedings: proceedings.trim(),
                outcome: outcome || undefined,
                appearingLawyerIds: Array.from(selectedLawyerIds),
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

    const selectedEntry = entries.find(e => e.id === selectedEntryId);

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.badge} style={{ background: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Gavel size={13} /> Record Court Proceeding
                    </div>
                    <button onClick={handleClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                {/* Body */}
                <div className={styles.content}>
                    {loadingData ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                            <Loader size={20} className="animate-spin" color="#94a3b8" />
                        </div>
                    ) : (
                        <>
                            {/* Select Court Date */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Court Date / Matter *</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={selectedEntryId}
                                        onChange={e => setSelectedEntryId(e.target.value)}
                                        style={{ ...selectStyle, paddingRight: '2.5rem', appearance: 'none' }}
                                    >
                                        <option value="">— Select a court date —</option>
                                        {entries.map(entry => {
                                            const d = new Date(entry.date);
                                            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                            const label = entry.matter?.name || entry.title || 'Untitled';
                                            return (
                                                <option key={entry.id} value={entry.id}>
                                                    {dateStr} — {label}{entry.matter?.caseNumber ? ` (${entry.matter.caseNumber})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                </div>
                                {selectedEntry?.court && (
                                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                                        {selectedEntry.court}
                                        {selectedEntry.adjournedFor ? ` · ${selectedEntry.adjournedFor}` : ''}
                                    </p>
                                )}
                            </div>

                            {/* Proceedings */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>
                                    <FileText size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                                    What happened in court *
                                </label>
                                <textarea
                                    value={proceedings}
                                    onChange={e => setProceedings(e.target.value)}
                                    placeholder="Describe the events of the sitting — arguments made, applications moved, orders given..."
                                    rows={5}
                                    style={{ ...selectStyle, resize: 'vertical', lineHeight: 1.6 }}
                                />
                            </div>

                            {/* Outcome */}
                            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Outcome</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={outcome}
                                            onChange={e => setOutcome(e.target.value)}
                                            style={{ ...selectStyle, paddingRight: '2.5rem', appearance: 'none' }}
                                        >
                                            {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Adjourned To</label>
                                    <input
                                        type="date"
                                        value={adjournedTo}
                                        onChange={e => setAdjournedTo(e.target.value)}
                                        style={selectStyle}
                                    />
                                </div>
                            </div>

                            {/* Lawyers who appeared */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ ...labelStyle, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Users size={13} /> Lawyers Who Appeared
                                </label>
                                {lawyers.length === 0 ? (
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No lawyers found in workspace.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {lawyers.map(lawyer => {
                                            const selected = selectedLawyerIds.has(lawyer.id);
                                            return (
                                                <button
                                                    key={lawyer.id}
                                                    type="button"
                                                    onClick={() => toggleLawyer(lawyer.id)}
                                                    style={{
                                                        padding: '5px 14px',
                                                        borderRadius: 20,
                                                        border: `1.5px solid ${selected ? '#0d9488' : '#e2e8f0'}`,
                                                        background: selected ? 'rgba(13,148,136,0.08)' : 'transparent',
                                                        color: selected ? '#0d9488' : '#64748b',
                                                        cursor: 'pointer',
                                                        fontSize: '0.82rem',
                                                        fontWeight: selected ? 600 : 400,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {selected && <Check size={12} />}
                                                    {lawyer.name || lawyer.email}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
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

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.4rem',
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.85rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
};
