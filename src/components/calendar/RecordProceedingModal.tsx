"use client";

import { useState, useEffect, useTransition } from 'react';
import { X, Gavel, FileText, Users, Check, Loader, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import styles from './EventModal.module.css';
import litStyles from './LitigationForm.module.css';
import { getMattersForWorkspace, recordProceeding } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';

interface Lawyer { id: string; name: string | null; email: string | null }
interface PendingEntry { id: string; date: Date | string; adjournedFor: string | null; title: string | null }
interface Matter { id: string; name: string; caseNumber: string | null; court: string | null; judge: string | null; calendarEntries: PendingEntry[] }

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

    // Step 1: select matter
    const [selectedMatterId, setSelectedMatterId] = useState('');
    // Step 2: select existing pending entry OR new sitting
    const [selectedEntryId, setSelectedEntryId] = useState('');   // '' = new sitting
    const [sittingDate, setSittingDate] = useState('');

    // Proceeding details
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
        setSelectedMatterId(''); setSelectedEntryId(''); setSittingDate('');
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
    const pendingEntries = selectedMatter?.calendarEntries ?? [];
    const isNewSitting = selectedEntryId === '__new__';

    function handleSubmit() {
        if (!selectedMatterId) { setError('Please select a matter.'); return; }
        if (!selectedEntryId) { setError('Please select a scheduled date or choose "New sitting".'); return; }
        if (isNewSitting && !sittingDate) { setError('Please enter the date of this sitting.'); return; }
        if (!proceedings.trim()) { setError('Please describe what happened in court.'); return; }
        setError('');

        startTransition(async () => {
            const result = await recordProceeding({
                matterId: selectedMatterId,
                entryId: isNewSitting ? undefined : selectedEntryId,
                date: isNewSitting ? new Date(sittingDate) : undefined,
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
            <div className={styles.modal} style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
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
                            {/* ── Step 1: Select Matter ── */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={lbl}>Matter *</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={selectedMatterId}
                                        onChange={e => { setSelectedMatterId(e.target.value); setSelectedEntryId(''); }}
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

                            {/* ── Step 2: Select Date ── */}
                            {selectedMatterId && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={lbl}>Which sitting are you recording? *</label>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {/* Pending entries */}
                                        {pendingEntries.map(entry => {
                                            const d = new Date(entry.date);
                                            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                            const selected = selectedEntryId === entry.id;
                                            return (
                                                <button
                                                    key={entry.id}
                                                    type="button"
                                                    onClick={() => setSelectedEntryId(entry.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '0.75rem 1rem',
                                                        border: `1.5px solid ${selected ? '#0d9488' : '#e2e8f0'}`,
                                                        borderRadius: 8,
                                                        background: selected ? 'rgba(13,148,136,0.06)' : '#fff',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{dateStr}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                                                            {entry.adjournedFor || entry.title || 'Scheduled court date — no proceedings recorded yet'}
                                                        </div>
                                                    </div>
                                                    {selected ? <Check size={16} color="#0d9488" /> : <ChevronRight size={16} color="#cbd5e1" />}
                                                </button>
                                            );
                                        })}

                                        {/* New sitting option */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEntryId('__new__')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.65rem 1rem',
                                                border: `1.5px dashed ${isNewSitting ? '#0d9488' : '#cbd5e1'}`,
                                                borderRadius: 8,
                                                background: isNewSitting ? 'rgba(13,148,136,0.06)' : 'transparent',
                                                color: isNewSitting ? '#0d9488' : '#64748b',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <Plus size={15} />
                                            {pendingEntries.length === 0
                                                ? 'Record a sitting (no scheduled dates exist yet)'
                                                : 'New sitting not yet in calendar'}
                                        </button>
                                    </div>

                                    {isNewSitting && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <label style={lbl}>Date of Sitting *</label>
                                            <input type="date" value={sittingDate} onChange={e => setSittingDate(e.target.value)} style={sel} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Proceeding Details (shown once entry selected) ── */}
                            {selectedEntryId && (
                                <>
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '1rem' }}>
                                            Proceeding Details
                                        </p>

                                        {/* What happened */}
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={lbl}>
                                                <FileText size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                                What happened in court *
                                            </label>
                                            <textarea
                                                value={proceedings}
                                                onChange={e => setProceedings(e.target.value)}
                                                placeholder="Describe the events of the sitting — arguments made, applications moved, orders given..."
                                                rows={4}
                                                style={{ ...sel, resize: 'vertical', lineHeight: 1.6 }}
                                            />
                                        </div>

                                        {/* Outcome + Adjourned To */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
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
                                                <label style={lbl}>Adjourned To</label>
                                                <input type="date" value={adjournedTo} onChange={e => setAdjournedTo(e.target.value)} style={sel} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={lbl}>Adjourned For</label>
                                                <input value={adjournedFor} onChange={e => setAdjournedFor(e.target.value)} placeholder="e.g. Hearing of Motion, Adoption of Written Addresses..." style={sel} />
                                            </div>
                                        </div>

                                        {/* Lawyers who appeared */}
                                        {lawyers.length > 0 && (
                                            <div>
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
                                    </div>
                                </>
                            )}

                            {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{error}</p>}
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
