'use client';

import { useState, useTransition } from 'react';
import { Plus, Check, Loader2, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createWorkEntry, updateWorkEntryStatus, deleteWorkEntry } from '@/app/actions/work-entries';
import type { WorkEntryWithRelations } from '@/app/actions/work-entries';
import type { MyBrief } from '@/app/actions/pulse';

interface Props {
    view: 'firm' | 'user';
    workspaceId: string;
    userId: string;
    initialEntries: WorkEntryWithRelations[];
    myBriefs: MyBrief[];
}

export default function DailyFocusPanel({ view, workspaceId, userId, initialEntries, myBriefs }: Props) {
    const [entries, setEntries] = useState<WorkEntryWithRelations[]>(initialEntries);
    const [showAdd, setShowAdd] = useState(false);
    const [newDesc, setNewDesc] = useState('');
    const [newBriefId, setNewBriefId] = useState('');
    const [isPending, startTransition] = useTransition();
    const [completing, setCompleting] = useState<string | null>(null);

    const myEntries = entries.filter(e => e.userId === userId);
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    // Group all entries by user for firm view
    const byUser = entries.reduce<Record<string, { user: WorkEntryWithRelations['user']; entries: WorkEntryWithRelations[] }>>((acc, e) => {
        if (!acc[e.userId]) acc[e.userId] = { user: e.user, entries: [] };
        acc[e.userId].entries.push(e);
        return acc;
    }, {});

    function handleAdd() {
        if (!newDesc.trim()) return;
        startTransition(async () => {
            const res = await createWorkEntry({ workspaceId, briefId: newBriefId || null, description: newDesc.trim() });
            if (res.success && res.data) {
                setEntries(prev => [...prev, res.data as WorkEntryWithRelations]);
                setNewDesc('');
                setNewBriefId('');
                setShowAdd(false);
            }
        });
    }

    function handleComplete(id: string) {
        setCompleting(id);
        startTransition(async () => {
            await updateWorkEntryStatus(id, 'COMPLETED');
            setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'COMPLETED', completedAt: new Date() } : e));
            setCompleting(null);
        });
    }

    function handleUncomplete(id: string) {
        startTransition(async () => {
            await updateWorkEntryStatus(id, 'IN_PROGRESS');
            setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'IN_PROGRESS', completedAt: null } : e));
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            await deleteWorkEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        });
    }

    function getInitial(name: string | null) {
        return (name || '?')[0].toUpperCase();
    }

    if (view === 'firm') {
        return (
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <div>
                        <span style={sectionTitleStyle}>Today at the Firm</span>
                        <span style={sectionSubStyle}>{today}</span>
                    </div>
                    <span style={countBadgeStyle}>{entries.length} logged</span>
                </div>

                {Object.keys(byUser).length === 0 ? (
                    <p style={emptyTextStyle}>No activity logged yet today.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.values(byUser).map(({ user, entries: ues }) => {
                            const done = ues.filter(e => e.status === 'COMPLETED').length;
                            return (
                                <div key={user.id} style={userGroupStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <div style={avatarStyle}>{getInitial(user.name)}</div>
                                        <div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{user.name || user.email}</span>
                                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>
                                                {done}/{ues.length} done
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {ues.map(e => (
                                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{
                                                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                                    background: e.status === 'COMPLETED' ? '#0d9488' : '#e2e8f0',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {e.status === 'COMPLETED' && <Check size={9} color="#fff" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: 11, color: e.status === 'COMPLETED' ? '#94a3b8' : '#475569', textDecoration: e.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                                                    {e.description}
                                                </span>
                                                {e.brief && (
                                                    <Link href={`/briefs/${e.brief.id}`} style={briefTagStyle}>
                                                        {e.brief.customTitle || e.brief.name}
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // My Pulse view
    const doneCount = myEntries.filter(e => e.status === 'COMPLETED').length;

    return (
        <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <div>
                    <span style={sectionTitleStyle}>Today&apos;s Focus</span>
                    {myEntries.length > 0 && (
                        <span style={sectionSubStyle}>{doneCount}/{myEntries.length} done</span>
                    )}
                </div>
                <button onClick={() => setShowAdd(v => !v)} style={addBtnStyle}>
                    <Plus size={13} strokeWidth={2.5} />
                    Log work
                </button>
            </div>

            {myEntries.length === 0 && !showAdd && (
                <p style={emptyTextStyle}>
                    What are you working on today? Log your focus areas against a brief.
                </p>
            )}

            {myEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: showAdd ? 10 : 0 }}>
                    {myEntries.map(e => (
                        <div key={e.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                            borderBottom: '1px solid #f1f5f9',
                        }}>
                            <button
                                onClick={() => e.status === 'COMPLETED' ? handleUncomplete(e.id) : handleComplete(e.id)}
                                disabled={completing === e.id || isPending}
                                style={{
                                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                                    border: e.status === 'COMPLETED' ? 'none' : '1.5px solid #cbd5e1',
                                    background: e.status === 'COMPLETED' ? '#0d9488' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {completing === e.id
                                    ? <Loader2 size={10} className="animate-spin" />
                                    : e.status === 'COMPLETED'
                                        ? <Check size={11} color="#fff" strokeWidth={3} />
                                        : null
                                }
                            </button>
                            <span style={{
                                flex: 1, fontSize: 12, color: e.status === 'COMPLETED' ? '#94a3b8' : '#1e293b',
                                textDecoration: e.status === 'COMPLETED' ? 'line-through' : 'none',
                            }}>
                                {e.description}
                            </span>
                            {e.brief && (
                                <Link href={`/briefs/${e.brief.id}`} style={briefTagStyle}>
                                    {e.brief.customTitle || e.brief.name} <ChevronRight size={9} style={{ display: 'inline' }} />
                                </Link>
                            )}
                            <button
                                onClick={() => handleDelete(e.id)}
                                disabled={isPending}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, display: 'flex', flexShrink: 0 }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <div style={{ marginTop: myEntries.length > 0 ? 6 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                        autoFocus
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
                        placeholder="What are you working on today?"
                        rows={2}
                        style={{
                            width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
                            borderRadius: 7, fontSize: 12, resize: 'none', outline: 'none',
                            fontFamily: 'inherit', color: '#1e293b', boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {myBriefs.length > 0 && (
                            <select
                                value={newBriefId}
                                onChange={e => setNewBriefId(e.target.value)}
                                style={{
                                    flex: 1, padding: '6px 8px', border: '1px solid #e2e8f0',
                                    borderRadius: 6, fontSize: 11, color: '#475569', outline: 'none',
                                    background: '#fff', cursor: 'pointer',
                                }}
                            >
                                <option value="">No brief selected</option>
                                {myBriefs.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.customTitle || b.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={handleAdd}
                            disabled={!newDesc.trim() || isPending}
                            style={{
                                padding: '6px 14px', background: '#0d9488', color: '#fff',
                                border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                cursor: newDesc.trim() ? 'pointer' : 'not-allowed',
                                opacity: newDesc.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 4,
                            }}
                        >
                            {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
                            Log
                        </button>
                        <button
                            onClick={() => { setShowAdd(false); setNewDesc(''); setNewBriefId(''); }}
                            style={{
                                padding: '6px 10px', background: 'transparent', color: '#94a3b8',
                                border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Shared styles ─────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 10,
};

const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const sectionSubStyle: React.CSSProperties = {
    fontSize: 10, color: '#94a3b8', marginLeft: 8,
};

const countBadgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 500, color: '#64748b',
    background: '#f1f5f9', padding: '2px 8px', borderRadius: 20,
};

const addBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', background: '#f0fdfa', color: '#0d9488',
    border: '1px solid #ccfbf1', borderRadius: 6,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
};

const emptyTextStyle: React.CSSProperties = {
    fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.6,
};

const userGroupStyle: React.CSSProperties = {
    padding: '8px 10px',
    background: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #f1f5f9',
};

const avatarStyle: React.CSSProperties = {
    width: 24, height: 24, borderRadius: '50%',
    background: '#1e293b', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, flexShrink: 0,
};

const briefTagStyle: React.CSSProperties = {
    fontSize: 10, padding: '1px 6px', borderRadius: 20,
    background: '#f0fdfa', color: '#0d9488',
    border: '1px solid #ccfbf1', whiteSpace: 'nowrap',
    textDecoration: 'none', fontWeight: 500, flexShrink: 0,
};
