'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, ClipboardList, Check, Mic } from 'lucide-react';
import { getBriefTrackerBoard, updateBriefTracker, type BriefTrackerRow } from '@/app/actions/brief-tracker';
import QuickRecordModal from '@/components/calendar/QuickRecordModal';

function formatUpdatedAt(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function TrackerRow({
    row,
    onSaved,
    onRecord,
}: {
    row: BriefTrackerRow;
    onSaved: (id: string, patch: Partial<BriefTrackerRow>) => void;
    onRecord: (row: BriefTrackerRow) => void;
}) {
    const [status, setStatus] = useState(row.manualStatus ?? '');
    const [nextAction, setNextAction] = useState(row.manualNextAction ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setStatus(row.manualStatus ?? ''); }, [row.manualStatus]);
    useEffect(() => { setNextAction(row.manualNextAction ?? ''); }, [row.manualNextAction]);

    const dirty = status !== (row.manualStatus ?? '') || nextAction !== (row.manualNextAction ?? '');

    const save = async () => {
        if (!dirty || saving) return;
        setSaving(true);
        setError(null);
        try {
            const result = await updateBriefTracker(row.id, { manualStatus: status, manualNextAction: nextAction });
            if (result.success) {
                onSaved(row.id, {
                    manualStatus: status,
                    manualNextAction: nextAction,
                    manualStatusUpdatedAt: result.manualStatusUpdatedAt ?? null,
                    manualStatusUpdatedBy: result.manualStatusUpdatedBy ?? null,
                });
            } else {
                setError(result.error ?? 'Could not save');
            }
        } catch {
            setError('Could not save');
        } finally {
            setSaving(false);
        }
    };

    const textareaStyle = (focused: boolean): React.CSSProperties => ({
        width: '100%', fontSize: '0.78rem', lineHeight: 1.5, color: '#1f2937',
        border: `1px solid ${focused ? '#0d9488' : '#e5e7eb'}`, borderRadius: 6, padding: '0.4rem 0.5rem',
        resize: 'vertical', fontFamily: 'inherit', background: '#fff',
        outline: 'none', minHeight: '2.6rem',
    });

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 1.3fr 1.3fr minmax(150px, 0.85fr)',
            borderBottom: '1px solid #f3f4f6',
        }}>
            <div style={{ padding: '0.6rem 0.75rem', minWidth: 0 }}>
                <Link href={`/briefs/${row.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
                    {row.name}
                </Link>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                    {row.briefNumber}{row.client ? ` · ${row.client}` : ''}
                </div>
                {row.lawyerInCharge && (
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{row.lawyerInCharge}</div>
                )}
            </div>
            <div style={{ padding: '0.4rem', borderLeft: '1px solid #f3f4f6' }}>
                <textarea
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    placeholder="What's the status / last action?"
                    rows={2}
                    style={textareaStyle(false)}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0d9488'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
            </div>
            <div style={{ padding: '0.4rem', borderLeft: '1px solid #f3f4f6' }}>
                <textarea
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    placeholder="What happens next?"
                    rows={2}
                    style={textareaStyle(false)}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0d9488'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
            </div>
            <div style={{
                padding: '0.5rem 0.6rem', borderLeft: '1px solid #f3f4f6',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem',
            }}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                        onClick={save}
                        disabled={!dirty || saving}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            padding: '0.35rem 0.7rem', borderRadius: 6, border: 'none',
                            background: !dirty ? '#f3f4f6' : saving ? '#5eead4' : '#0d9488',
                            color: !dirty ? '#9ca3af' : '#fff',
                            fontSize: '0.72rem', fontWeight: 600,
                            cursor: dirty && !saving ? 'pointer' : 'default',
                            flex: 1,
                        }}
                    >
                        {saving ? 'Saving…' : dirty ? 'Save' : <><Check size={12} /> Saved</>}
                    </button>
                    <button
                        onClick={() => onRecord(row)}
                        title="Record meeting"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, borderRadius: 6, border: '1px solid #fecaca',
                            background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                        }}
                    >
                        <Mic size={13} />
                    </button>
                </div>
                {error && <span style={{ fontSize: '0.64rem', color: '#b91c1c' }}>{error}</span>}
                {row.manualStatusUpdatedAt && (
                    <div style={{ fontSize: '0.64rem', color: '#9ca3af', lineHeight: 1.4 }}>
                        Last updated {formatUpdatedAt(row.manualStatusUpdatedAt)}
                        {row.manualStatusUpdatedBy ? <><br />by {row.manualStatusUpdatedBy}</> : null}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BriefTracker({ workspaceId }: { workspaceId: string }) {
    const [scope, setScope] = useState<'firm' | 'mine'>('firm');
    const [rows, setRows] = useState<BriefTrackerRow[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [recordingBrief, setRecordingBrief] = useState<{ id: string; name: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const board = await getBriefTrackerBoard(workspaceId, scope);
            setRows(board);
        } catch {
            setLoadError('Could not load the tracker — please try again.');
        } finally {
            setLoading(false);
        }
    }, [workspaceId, scope]);

    // Standard fetch-on-mount/on-scope-change pattern; setState inside load() is intentional.
    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!rows) return [];
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.briefNumber.toLowerCase().includes(q) ||
            (r.client ?? '').toLowerCase().includes(q)
        );
    }, [rows, query]);

    const patchRow = (id: string, patch: Partial<BriefTrackerRow>) => {
        setRows(prev => prev?.map(r => r.id === id ? { ...r, ...patch } : r) ?? prev);
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={18} color="#0d9488" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Brief Tracker</h2>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>— manual, no AI involved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={13} color="#9ca3af" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search briefs…"
                            style={{
                                fontSize: '0.75rem', padding: '0.4rem 0.6rem 0.4rem 1.7rem', borderRadius: 6,
                                border: '1px solid #e5e7eb', outline: 'none', width: 180,
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        {(['firm', 'mine'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                style={{
                                    padding: '0.35rem 0.9rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: scope === s ? '#0d9488' : '#fff', color: scope === s ? '#fff' : '#374151',
                                }}
                            >
                                {s === 'firm' ? 'Firmwide' : 'My Briefs'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Loading…</p>}
            {!loading && loadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0 }}>{loadError}</p>
                    <button
                        onClick={load}
                        style={{
                            padding: '0.3rem 0.8rem', borderRadius: 6, border: '1px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No briefs match.</p>
            )}

            {!loading && !loadError && filtered.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 1.3fr 1.3fr minmax(150px, 0.85fr)',
                        background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
                    }}>
                        {['Brief', 'Status / Last Action', 'Next Action / Possible Actions', ''].map((h, i) => (
                            <div key={i} style={{ padding: '0.55rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {filtered.map(row => (
                        <TrackerRow
                            key={row.id}
                            row={row}
                            onSaved={patchRow}
                            onRecord={r => setRecordingBrief({ id: r.id, name: r.name })}
                        />
                    ))}
                </div>
            )}

            <QuickRecordModal
                isOpen={!!recordingBrief}
                onClose={() => setRecordingBrief(null)}
                workspaceId={workspaceId}
                briefId={recordingBrief?.id}
                briefName={recordingBrief?.name}
            />
        </div>
    );
}
