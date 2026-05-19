"use client";

import { useState, useEffect } from 'react';
import { X, RotateCcw, Loader, Trash2 } from 'lucide-react';
import { getDeletedCalendarEntries, restoreCalendarEntry } from '@/app/actions/calendar-events';

interface DeletedEntry {
    id: string;
    title: string | null;
    type: string | null;
    date: Date;
    court: string | null;
    deletedAt: Date | null;
    matter: { id: string; name: string; caseNumber: string | null } | null;
}

interface DeletedEntriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    onRestored: () => void;
}

export default function DeletedEntriesModal({ isOpen, onClose, workspaceId, onRestored }: DeletedEntriesModalProps) {
    const [entries, setEntries] = useState<DeletedEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        setError(null);
        getDeletedCalendarEntries(workspaceId)
            .then(result => {
                if (result.success) {
                    setEntries(result.data as DeletedEntry[]);
                } else {
                    setError(result.error || 'Failed to load deleted entries');
                }
            })
            .catch(() => setError('Failed to load deleted entries'))
            .finally(() => setIsLoading(false));
    }, [isOpen, workspaceId]);

    const handleRestore = async (id: string) => {
        setRestoringId(id);
        try {
            const result = await restoreCalendarEntry(id);
            if (result.success) {
                setEntries(prev => prev.filter(e => e.id !== id));
                onRestored();
            } else {
                alert(result.error || 'Failed to restore entry');
            }
        } finally {
            setRestoringId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trash2 size={18} color="#dc2626" />
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                            Deleted Calendar Entries
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 6 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {isLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', justifyContent: 'center', padding: '32px 0' }}>
                            <Loader size={16} className="animate-spin" /> Loading deleted entries...
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem', padding: '8px 0' }}>{error}</div>
                    )}

                    {!isLoading && !error && entries.length === 0 && (
                        <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '32px 0' }}>
                            No deleted entries found.
                        </p>
                    )}

                    {entries.map(entry => (
                        <div key={entry.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0', borderBottom: '1px solid #f1f5f9',
                        }}>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                    {entry.title || entry.matter?.name || 'Untitled Entry'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                    {entry.type} &middot; {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {entry.court && ` · ${entry.court}`}
                                </div>
                                {entry.matter && (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>
                                        {entry.matter.name} {entry.matter.caseNumber ? `(${entry.matter.caseNumber})` : ''}
                                    </div>
                                )}
                                {entry.deletedAt && (
                                    <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2 }}>
                                        Deleted: {new Date(entry.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleRestore(entry.id)}
                                disabled={restoringId === entry.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    fontSize: '0.8rem', color: '#059669', background: 'none',
                                    border: '1px solid #059669', borderRadius: 6,
                                    padding: '5px 12px', cursor: 'pointer', fontWeight: 500,
                                    opacity: restoringId === entry.id ? 0.6 : 1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {restoringId === entry.id
                                    ? <><Loader size={12} className="animate-spin" /> Restoring...</>
                                    : <><RotateCcw size={13} /> Restore</>
                                }
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
