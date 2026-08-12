'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Mic, Loader } from 'lucide-react';
import { createQuickMeeting } from '@/app/actions/matters';
import { getBriefsForPicker } from '@/app/actions/briefs';
import MeetingRecorder from './MeetingRecorder';

interface BriefOption {
    id: string;
    name: string;
    briefNumber: string;
}

interface QuickRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    /** Set when opened from a calendar day cell — the entry is created for this date. */
    date?: Date;
    /** Set when opened directly from a brief — skips the brief picker. */
    briefId?: string;
    briefName?: string;
    onCreated?: () => void;
}

export default function QuickRecordModal({
    isOpen, onClose, workspaceId, date, briefId, briefName, onCreated,
}: QuickRecordModalProps) {
    const [briefs, setBriefs] = useState<BriefOption[] | null>(null);
    const [selectedBriefId, setSelectedBriefId] = useState('');
    const [entryId, setEntryId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const start = useCallback(async (id: string) => {
        if (!id) {
            setError('Select a brief first');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const result = await createQuickMeeting({ workspaceId, briefId: id, date });
            if (result.success && result.data) {
                setEntryId(result.data.id);
                onCreated?.();
            } else {
                setError(result.error || 'Could not start the recording');
            }
        } catch {
            setError('Could not start the recording');
        } finally {
            setCreating(false);
        }
    }, [workspaceId, date, onCreated]);

    useEffect(() => {
        if (!isOpen) return;
        setEntryId(null);
        setError(null);
        setSelectedBriefId('');
        if (briefId) {
            void start(briefId);
        } else {
            getBriefsForPicker(workspaceId).then(list =>
                setBriefs(list.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber })))
            );
        }
        // Only re-run when the modal opens for a (possibly) new target — `start` is stable per-target.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, briefId, workspaceId]);

    if (!isOpen) return null;

    const dateLabel = date
        ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff', width: '100%', maxWidth: 480, borderRadius: 16,
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid #e5e7eb',
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>Record meeting</h2>
                        {(briefName || dateLabel) && (
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                                {briefName}{briefName && dateLabel ? ' · ' : ''}{dateLabel}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {!entryId && !briefId && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                                Brief
                            </label>
                            <select
                                value={selectedBriefId}
                                onChange={e => setSelectedBriefId(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #e5e7eb',
                                    fontSize: '0.85rem', color: '#111827', background: '#fff', marginBottom: '1rem',
                                }}
                            >
                                <option value="">Select a brief…</option>
                                {briefs?.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.briefNumber})</option>
                                ))}
                            </select>
                            <button
                                onClick={() => start(selectedBriefId)}
                                disabled={creating || !selectedBriefId}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.1rem',
                                    borderRadius: 8, border: 'none', fontSize: '0.85rem', fontWeight: 600,
                                    background: !selectedBriefId ? '#f3f4f6' : '#dc2626',
                                    color: !selectedBriefId ? '#9ca3af' : '#fff',
                                    cursor: selectedBriefId && !creating ? 'pointer' : 'default',
                                }}
                            >
                                {creating ? <Loader size={14} className="rm-spin" /> : <Mic size={14} />}
                                {creating ? 'Starting…' : 'Start recording'}
                            </button>
                            {error && <p style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.6rem' }}>{error}</p>}
                        </div>
                    )}

                    {!entryId && briefId && creating && (
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Loader size={14} className="rm-spin" /> Starting…
                        </p>
                    )}

                    {!entryId && briefId && !creating && error && (
                        <div>
                            <p style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{error}</p>
                            <button
                                onClick={() => start(briefId)}
                                style={{
                                    padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #e5e7eb',
                                    background: '#fff', color: '#374151', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {entryId && <MeetingRecorder calendarEntryId={entryId} />}
                </div>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.55rem 1.4rem', borderRadius: 8, border: 'none',
                            background: '#111827', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
