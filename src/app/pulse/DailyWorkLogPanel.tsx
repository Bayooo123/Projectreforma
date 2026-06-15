"use client";

import { useState, useTransition, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Trash2, ChevronDown, FileText, AlertCircle, User } from 'lucide-react';
import type { WorkEntry } from '@/app/actions/work-entries';
import {
    createWorkEntry,
    updateWorkEntryStatus,
    deleteWorkEntry,
} from '@/app/actions/work-entries';

interface Brief {
    id: string;
    name: string;
    customTitle: string | null;
    briefNumber: string;
    customBriefNumber: string | null;
}

interface TeamMember {
    userId: string;
    role: string | null;
    user: { id: string; name: string | null; email: string };
}

interface Props {
    workspaceId: string;
    userId: string;
    initialEntries: WorkEntry[];
    briefs: Brief[];
    teamMembers?: TeamMember[];
    isAdmin?: boolean;
    openForm?: boolean;
    onFormOpened?: () => void;
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
    low:    { label: 'Low',    color: '#64748b', bg: '#f1f5f9' },
    medium: { label: 'Medium', color: '#d97706', bg: '#fef3c7' },
    high:   { label: 'High',   color: '#dc2626', bg: '#fee2e2' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PLANNED:     { label: 'Planned',     color: '#475569', bg: '#f1f5f9', icon: <Circle size={13} /> },
    IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', icon: <Clock size={13} /> },
    SUBMITTED:   { label: 'Submitted',   color: '#0d9488', bg: '#f0fdfa', icon: <CheckCircle2 size={13} /> },
    COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={13} /> },
    OVERDUE:     { label: 'Overdue',     color: '#dc2626', bg: '#fee2e2', icon: <AlertCircle size={13} /> },
};

export default function DailyWorkLogPanel({ workspaceId, userId, initialEntries, briefs, teamMembers, isAdmin, openForm, onFormOpened }: Props) {
    const [entries, setEntries] = useState<WorkEntry[]>(initialEntries);
    const [showForm, setShowForm] = useState(false);
    const [isPending, startTransition] = useTransition();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openForm) {
            setShowForm(true);
            setTimeout(() => {
                panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
            onFormOpened?.();
        }
    }, [openForm]);

    // form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [briefId, setBriefId] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [targetUserId, setTargetUserId] = useState(''); // '' = self
    const [submitting, setSubmitting] = useState(false);

    const completedCount = entries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
    const loggingForOther = isAdmin && targetUserId && targetUserId !== userId;

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        const res = await createWorkEntry({
            workspaceId,
            targetUserId: targetUserId || null,
            title,
            description: description || null,
            briefId: briefId || null,
            priority,
            dueDate: dueDate || null,
        });
        if (res.success) {
            // Only add to local list if logged for self
            if (!loggingForOther) setEntries(prev => [...prev, res.data]);
            setTitle(''); setDescription(''); setBriefId(''); setPriority('medium'); setDueDate(''); setTargetUserId('');
            setShowForm(false);
        }
        setSubmitting(false);
    }

    async function handleStatus(id: string, next: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE') {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: next } : e));
        startTransition(async () => {
            await updateWorkEntryStatus(id, next);
        });
    }

    async function handleDelete(id: string) {
        setEntries(prev => prev.filter(e => e.id !== id));
        startTransition(async () => {
            await deleteWorkEntry(id);
        });
    }

    return (
        <div ref={panelRef} style={panelStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                    <span style={titleStyle}>Today's Work Log</span>
                    {entries.length > 0 && (
                        <span style={subtitleStyle}>
                            {completedCount}/{entries.length} done
                        </span>
                    )}
                </div>
                <button onClick={() => setShowForm(v => !v)} style={addBtnStyle}>
                    <Plus size={13} />
                    Add task
                </button>
            </div>

            {/* Progress bar */}
            {entries.length > 0 && (
                <div style={{ height: 3, background: '#e2e8f0', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.round((completedCount / entries.length) * 100)}%`,
                        background: '#059669',
                        borderRadius: 99,
                        transition: 'width 0.4s ease',
                    }} />
                </div>
            )}

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleAdd} style={formStyle}>
                    {/* Log for selector — admins only */}
                    {isAdmin && teamMembers && teamMembers.length > 0 && (
                        <div>
                            <label style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <User size={10} /> Logging for
                            </label>
                            <select
                                value={targetUserId}
                                onChange={e => setTargetUserId(e.target.value)}
                                style={{ ...inputStyle, fontWeight: targetUserId && targetUserId !== userId ? 600 : 'normal' }}
                            >
                                <option value="">Myself</option>
                                {teamMembers
                                    .filter(m => m.userId !== userId)
                                    .map(m => (
                                        <option key={m.userId} value={m.userId}>
                                            {m.user.name || m.user.email.split('@')[0]}
                                            {m.role ? ` (${m.role})` : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
                    <input
                        autoFocus
                        placeholder="Task title *"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={inputStyle}
                        required
                    />
                    <textarea
                        placeholder="Description / notes (optional)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        style={{ ...inputStyle, minHeight: 58, resize: 'vertical' }}
                        rows={2}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <select value={briefId} onChange={e => setBriefId(e.target.value)} style={inputStyle}>
                            <option value="">— No brief —</option>
                            {briefs.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.customBriefNumber || b.briefNumber} · {b.customTitle || b.name}
                                </option>
                            ))}
                        </select>
                        <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                            <option value="low">Low priority</option>
                            <option value="medium">Medium priority</option>
                            <option value="high">High priority</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                        <div>
                            <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 2 }}>Expected completion</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b', marginTop: 14 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim()}
                            style={{ ...btnStyle, background: '#064e3b', color: '#fff', marginTop: 14, opacity: submitting || !title.trim() ? 0.5 : 1 }}
                        >
                            {submitting ? 'Adding…' : loggingForOther ? 'Log for them' : 'Add'}
                        </button>
                    </div>
                </form>
            )}

            {/* Entry list */}
            {entries.length === 0 && !showForm && (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    No tasks logged for today. Add your first task to start tracking.
                </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.map(entry => (
                    <EntryRow
                        key={entry.id}
                        entry={entry}
                        onStatus={handleStatus}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
        </div>
    );
}

function EntryRow({
    entry,
    onStatus,
    onDelete,
}: {
    entry: WorkEntry;
    onStatus: (id: string, s: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE') => void;
    onDelete: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const sm = STATUS_META[entry.status] || STATUS_META.PLANNED;
    const pm = PRIORITY_META[entry.priority] || PRIORITY_META.medium;
    const done = entry.status === 'COMPLETED' || entry.status === 'SUBMITTED';
    const ref = entry.brief ? (entry.brief.customBriefNumber || entry.brief.briefNumber) : null;

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 10px',
            background: done ? '#f8fafc' : '#fff',
            opacity: done ? 0.8 : 1,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {/* quick-complete toggle */}
                <button
                    onClick={() => onStatus(entry.id, done ? 'IN_PROGRESS' : 'COMPLETED')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, color: done ? '#059669' : '#cbd5e1', flexShrink: 0 }}
                    title={done ? 'Mark as in progress' : 'Mark as complete'}
                >
                    {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 12, fontWeight: 600,
                        textDecoration: done ? 'line-through' : 'none',
                        color: done ? '#94a3b8' : '#1e293b',
                    }}>
                        {entry.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: sm.bg, color: sm.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {sm.icon}{sm.label}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: pm.bg, color: pm.color }}>
                            {pm.label}
                        </span>
                        {ref && (
                            <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <FileText size={10} />{ref}
                            </span>
                        )}
                        {entry.dueDate && (
                            <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={10} />
                                {new Date(entry.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions dropdown */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                        <ChevronDown size={14} />
                    </button>
                    {open && (
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 10,
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 140, padding: 4,
                        }} onMouseLeave={() => setOpen(false)}>
                            {entry.status !== 'IN_PROGRESS' && (
                                <DropItem label="Mark In Progress" onClick={() => { onStatus(entry.id, 'IN_PROGRESS'); setOpen(false); }} />
                            )}
                            {entry.status !== 'SUBMITTED' && (
                                <DropItem label="Mark Submitted" onClick={() => { onStatus(entry.id, 'SUBMITTED'); setOpen(false); }} />
                            )}
                            {entry.status !== 'COMPLETED' && (
                                <DropItem label="Mark Completed" onClick={() => { onStatus(entry.id, 'COMPLETED'); setOpen(false); }} />
                            )}
                            {entry.status !== 'OVERDUE' && (
                                <DropItem label="Mark Overdue" onClick={() => { onStatus(entry.id, 'OVERDUE'); setOpen(false); }} color="#dc2626" />
                            )}
                            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                            <DropItem label="Delete" onClick={() => { onDelete(entry.id); setOpen(false); }} color="#dc2626" />
                        </div>
                    )}
                </div>
            </div>

            {entry.description && (
                <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0 24px', lineHeight: 1.5 }}>
                    {entry.description}
                </p>
            )}
        </div>
    );
}

function DropItem({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 10px', fontSize: 11, background: 'none', border: 'none',
                cursor: 'pointer', borderRadius: 5, color: color || '#1e293b',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
            {label}
        </button>
    );
}

// styles
const panelStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const subtitleStyle: React.CSSProperties = {
    fontSize: 11, color: '#94a3b8', marginLeft: 8,
};

const addBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '4px 10px',
    border: '1px solid #d1fae5', borderRadius: 6,
    background: '#ecfdf5', color: '#065f46', cursor: 'pointer',
};

const formStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 12,
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#1e293b',
};

const btnStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600,
    padding: '6px 14px', borderRadius: 6,
    border: 'none', cursor: 'pointer',
    whiteSpace: 'nowrap',
};
