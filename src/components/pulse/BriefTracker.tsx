'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, ClipboardList } from 'lucide-react';
import { getBriefTrackerBoard, updateBriefTracker, type BriefTrackerRow } from '@/app/actions/brief-tracker';

function formatUpdatedAt(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TrackerCell({
    briefId,
    field,
    value,
    placeholder,
    onSaved,
}: {
    briefId: string;
    field: 'manualStatus' | 'manualNextAction';
    value: string | null;
    placeholder: string;
    onSaved: (meta: { manualStatusUpdatedAt: Date | null; manualStatusUpdatedBy: string | null }) => void;
}) {
    const [text, setText] = useState(value ?? '');
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    useEffect(() => setText(value ?? ''), [value]);

    const save = async () => {
        if (text === (value ?? '')) return;
        setSaving(true);
        try {
            const result = await updateBriefTracker(briefId, { [field]: text });
            if (result.success) {
                onSaved({ manualStatusUpdatedAt: result.manualStatusUpdatedAt ?? null, manualStatusUpdatedBy: result.manualStatusUpdatedBy ?? null });
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 1500);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={save}
                placeholder={placeholder}
                rows={2}
                style={{
                    width: '100%', fontSize: '0.78rem', lineHeight: 1.5, color: '#1f2937',
                    border: '1px solid transparent', borderRadius: 6, padding: '0.4rem 0.5rem',
                    resize: 'vertical', fontFamily: 'inherit', background: 'transparent',
                    outline: 'none', minHeight: '2.6rem',
                }}
                onFocus={e => { e.currentTarget.style.border = '1px solid #0d9488'; e.currentTarget.style.background = '#fff'; }}
                onBlurCapture={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
            />
            {(saving || savedFlash) && (
                <span style={{
                    position: 'absolute', top: 2, right: 4, fontSize: '0.62rem', fontWeight: 600,
                    color: saving ? '#9ca3af' : '#0d9488',
                }}>
                    {saving ? 'Saving…' : 'Saved'}
                </span>
            )}
        </div>
    );
}

export default function BriefTracker({ workspaceId }: { workspaceId: string }) {
    const [scope, setScope] = useState<'firm' | 'mine'>('firm');
    const [rows, setRows] = useState<BriefTrackerRow[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

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

    const patchRow = (id: string, meta: { manualStatusUpdatedAt: Date | null; manualStatusUpdatedBy: string | null }) => {
        setRows(prev => prev?.map(r => r.id === id ? { ...r, ...meta } : r) ?? prev);
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
                        display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 1.4fr 1.4fr',
                        background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
                    }}>
                        {['Brief', 'Status / Last Action', 'Next Action / Possible Actions'].map(h => (
                            <div key={h} style={{ padding: '0.55rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {filtered.map(row => (
                        <div key={row.id} style={{
                            display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 1.4fr 1.4fr',
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
                                {row.manualStatusUpdatedAt && (
                                    <div style={{ fontSize: '0.64rem', color: '#c4c9d1', marginTop: 4 }}>
                                        Updated {formatUpdatedAt(row.manualStatusUpdatedAt)}{row.manualStatusUpdatedBy ? ` by ${row.manualStatusUpdatedBy}` : ''}
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '0.3rem 0.4rem', borderLeft: '1px solid #f3f4f6' }}>
                                <TrackerCell
                                    briefId={row.id}
                                    field="manualStatus"
                                    value={row.manualStatus}
                                    placeholder="What's the status / last action?"
                                    onSaved={meta => patchRow(row.id, meta)}
                                />
                            </div>
                            <div style={{ padding: '0.3rem 0.4rem', borderLeft: '1px solid #f3f4f6' }}>
                                <TrackerCell
                                    briefId={row.id}
                                    field="manualNextAction"
                                    value={row.manualNextAction}
                                    placeholder="What happens next?"
                                    onSaved={meta => patchRow(row.id, meta)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
