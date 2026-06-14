"use client";

import { useState, useTransition } from 'react';
import {
    CheckCircle2, Circle, Clock, AlertCircle, FileText, Plus, ChevronDown, Users,
} from 'lucide-react';
import type { WorkEntry } from '@/app/actions/work-entries';
import { createWorkEntry, updateWorkEntryStatus, deleteWorkEntry } from '@/app/actions/work-entries';

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
    currentUserId: string;
    isAdmin: boolean;
    initialEntries: WorkEntry[];
    teamMembers: TeamMember[];
    briefs: Brief[];
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PLANNED:     { label: 'Planned',     color: '#475569', bg: '#f1f5f9', icon: <Circle size={11} /> },
    IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', icon: <Clock size={11} /> },
    SUBMITTED:   { label: 'Submitted',   color: '#0d9488', bg: '#f0fdfa', icon: <CheckCircle2 size={11} /> },
    COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5', icon: <CheckCircle2 size={11} /> },
    OVERDUE:     { label: 'Overdue',     color: '#dc2626', bg: '#fee2e2', icon: <AlertCircle size={11} /> },
};

const PRIORITY_DOT: Record<string, string> = {
    low: '#94a3b8', medium: '#d97706', high: '#dc2626',
};

function initials(name: string | null, email: string) {
    if (name) return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return email.slice(0, 2).toUpperCase();
}

function displayName(name: string | null, email: string) {
    return name || email.split('@')[0];
}

export default function FirmWorkLogBoard({
    workspaceId, currentUserId, isAdmin, initialEntries, teamMembers, briefs,
}: Props) {
    const [entries, setEntries] = useState<WorkEntry[]>(initialEntries);
    const [, startTransition] = useTransition();
    // Track which member's add-form is open
    const [addingFor, setAddingFor] = useState<string | null>(null);

    // Group entries by assignee userId
    const byMember = new Map<string, WorkEntry[]>();
    for (const e of entries) {
        if (!byMember.has(e.userId)) byMember.set(e.userId, []);
        byMember.get(e.userId)!.push(e);
    }

    // Members with entries come first; if admin, also show members without entries
    const membersToShow: TeamMember[] = [];
    const memberIds = new Set(teamMembers.map(m => m.userId));
    // Members with entries, in the order entries appear
    const seenInEntries = new Set<string>();
    for (const e of entries) {
        if (!seenInEntries.has(e.userId)) {
            seenInEntries.add(e.userId);
            const tm = teamMembers.find(m => m.userId === e.userId);
            if (tm) membersToShow.push(tm);
        }
    }
    // Add members without entries (for admin view)
    if (isAdmin) {
        for (const tm of teamMembers) {
            if (!seenInEntries.has(tm.userId)) membersToShow.push(tm);
        }
    }

    // Summary stats
    const total = entries.length;
    const done = entries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
    const overdue = entries.filter(e => e.status === 'OVERDUE').length;
    const inProgress = entries.filter(e => e.status === 'IN_PROGRESS').length;

    function handleEntryAdded(entry: WorkEntry) {
        setEntries(prev => [...prev, entry]);
        setAddingFor(null);
    }

    function handleStatusChange(id: string, status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE') {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        startTransition(async () => { await updateWorkEntryStatus(id, status); });
    }

    function handleDelete(id: string) {
        setEntries(prev => prev.filter(e => e.id !== id));
        startTransition(async () => { await deleteWorkEntry(id); });
    }

    return (
        <div style={boardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={14} color="#475569" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Today's Work Board
                    </span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <SummaryChip label="Total" value={total} color="#475569" bg="#f1f5f9" />
                <SummaryChip label="Done" value={done} color="#059669" bg="#ecfdf5" />
                <SummaryChip label="In Progress" value={inProgress} color="#2563eb" bg="#eff6ff" />
                {overdue > 0 && <SummaryChip label="Overdue" value={overdue} color="#dc2626" bg="#fee2e2" urgent />}
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div style={{ height: 3, background: '#e2e8f0', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.round((done / total) * 100)}%`,
                        background: '#059669', borderRadius: 99, transition: 'width 0.4s ease',
                    }} />
                </div>
            )}

            {/* Overdue alert banner */}
            {overdue > 0 && (
                <div style={{
                    background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 7,
                    padding: '8px 12px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11, color: '#be123c', fontWeight: 600,
                }}>
                    <AlertCircle size={13} />
                    {overdue} task{overdue !== 1 ? 's are' : ' is'} overdue — requires follow-up
                </div>
            )}

            {/* Member cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {membersToShow.length === 0 && (
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        No work has been logged for today yet.{isAdmin ? ' Use "Log work" to add tasks for your team.' : ''}
                    </p>
                )}
                {membersToShow.map(member => {
                    const memberEntries = byMember.get(member.userId) ?? [];
                    const mDone = memberEntries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
                    const mOverdue = memberEntries.filter(e => e.status === 'OVERDUE').length;
                    const isOwnCard = member.userId === currentUserId;

                    return (
                        <div key={member.userId} style={{
                            border: `1px solid ${mOverdue > 0 ? '#fecdd3' : '#e2e8f0'}`,
                            borderRadius: 9,
                            background: '#fff',
                            overflow: 'hidden',
                        }}>
                            {/* Member header */}
                            <div style={{
                                padding: '10px 12px',
                                background: mOverdue > 0 ? '#fff1f2' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: isOwnCard ? '#064e3b' : '#e2e8f0',
                                    color: isOwnCard ? '#fff' : '#64748b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {initials(member.user.name, member.user.email)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                        {displayName(member.user.name, member.user.email)}
                                        {isOwnCard && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>(you)</span>}
                                    </div>
                                    {member.role && (
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{member.role}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    {memberEntries.length > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 600, color: mDone === memberEntries.length ? '#059669' : '#64748b' }}>
                                            {mDone}/{memberEntries.length} done
                                        </span>
                                    )}
                                    {mOverdue > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: 20 }}>
                                            {mOverdue} overdue
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => setAddingFor(addingFor === member.userId ? null : member.userId)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 3,
                                                fontSize: 10, fontWeight: 600,
                                                padding: '3px 8px', border: '1px solid #d1fae5',
                                                borderRadius: 5, background: '#ecfdf5', color: '#065f46',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Plus size={10} />
                                            Add task
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Inline add form for this member */}
                            {addingFor === member.userId && (
                                <MemberAddForm
                                    workspaceId={workspaceId}
                                    targetUserId={member.userId}
                                    briefs={briefs}
                                    onAdded={handleEntryAdded}
                                    onCancel={() => setAddingFor(null)}
                                />
                            )}

                            {/* Task list */}
                            {memberEntries.length === 0 && addingFor !== member.userId && (
                                <div style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>
                                    No tasks logged for today.
                                </div>
                            )}
                            <div>
                                {memberEntries.map(entry => (
                                    <BoardEntryRow
                                        key={entry.id}
                                        entry={entry}
                                        canEdit={isAdmin || entry.userId === currentUserId}
                                        onStatus={handleStatusChange}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SummaryChip({ label, value, color, bg, urgent }: { label: string; value: number; color: string; bg: string; urgent?: boolean }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, background: bg,
            fontSize: 11, fontWeight: urgent ? 700 : 600, color,
            border: urgent ? `1px solid ${color}33` : 'none',
        }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
            <span style={{ opacity: 0.8 }}>{label}</span>
        </div>
    );
}

function MemberAddForm({ workspaceId, targetUserId, briefs, onAdded, onCancel }: {
    workspaceId: string;
    targetUserId: string;
    briefs: Brief[];
    onAdded: (e: WorkEntry) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [briefId, setBriefId] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        const res = await createWorkEntry({
            workspaceId, targetUserId,
            title, description: description || null,
            briefId: briefId || null, priority,
            dueDate: dueDate || null,
        });
        if (res.success) onAdded(res.data);
        else setSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit} style={{
            padding: '10px 12px', background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                    autoFocus
                    placeholder="Task title *"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={inlineInputStyle}
                    required
                />
                <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ ...inlineInputStyle, minHeight: 46, resize: 'vertical' }}
                    rows={2}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                    <select value={briefId} onChange={e => setBriefId(e.target.value)} style={inlineInputStyle}>
                        <option value="">— No brief —</option>
                        {briefs.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.customBriefNumber || b.briefNumber} · {b.customTitle || b.name}
                            </option>
                        ))}
                    </select>
                    <select value={priority} onChange={e => setPriority(e.target.value)} style={inlineInputStyle}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <input
                        type="date" value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        style={inlineInputStyle}
                        title="Expected completion"
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
                    <button type="button" onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                    <button type="submit" disabled={submitting || !title.trim()} style={{
                        ...addBtnStyle, opacity: submitting || !title.trim() ? 0.5 : 1,
                    }}>
                        {submitting ? 'Adding…' : 'Add task'}
                    </button>
                </div>
            </div>
        </form>
    );
}

function BoardEntryRow({ entry, canEdit, onStatus, onDelete }: {
    entry: WorkEntry;
    canEdit: boolean;
    onStatus: (id: string, s: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE') => void;
    onDelete: (id: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const sm = STATUS_META[entry.status] || STATUS_META.PLANNED;
    const done = entry.status === 'COMPLETED' || entry.status === 'SUBMITTED';
    const ref = entry.brief ? (entry.brief.customBriefNumber || entry.brief.briefNumber) : null;
    const priorityColor = PRIORITY_DOT[entry.priority] || PRIORITY_DOT.medium;

    return (
        <div style={{
            padding: '9px 12px',
            borderBottom: '1px solid #f1f5f9',
            background: done ? '#fafbfc' : '#fff',
            display: 'flex', alignItems: 'flex-start', gap: 9,
        }}>
            {/* Priority dot */}
            <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: priorityColor, flexShrink: 0, marginTop: 5,
            }} title={`${entry.priority} priority`} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: done ? '#94a3b8' : '#1e293b',
                    textDecoration: done ? 'line-through' : 'none',
                    marginBottom: 3,
                }}>
                    {entry.title}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                        background: sm.bg, color: sm.color,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        {sm.icon}{sm.label}
                    </span>
                    {ref && (
                        <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FileText size={9} />{ref}
                        </span>
                    )}
                    {entry.dueDate && (
                        <span style={{ fontSize: 10, color: entry.status === 'OVERDUE' ? '#dc2626' : '#94a3b8' }}>
                            Due {new Date(entry.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                    {entry.createdBy && entry.createdBy.id !== entry.userId && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                            logged by {entry.createdBy.name || entry.createdBy.email.split('@')[0]}
                        </span>
                    )}
                </div>
                {entry.description && (
                    <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {entry.description}
                    </p>
                )}
            </div>

            {/* Action menu — only if canEdit */}
            {canEdit && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={() => setMenuOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                        <ChevronDown size={13} />
                    </button>
                    {menuOpen && (
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 20,
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 150, padding: 4,
                        }} onMouseLeave={() => setMenuOpen(false)}>
                            {(['IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'OVERDUE'] as const).filter(s => s !== entry.status).map(s => (
                                <MenuBtn
                                    key={s}
                                    label={`Mark ${STATUS_META[s].label}`}
                                    color={s === 'OVERDUE' ? '#dc2626' : undefined}
                                    onClick={() => { onStatus(entry.id, s); setMenuOpen(false); }}
                                />
                            ))}
                            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                            <MenuBtn label="Delete" color="#dc2626" onClick={() => { onDelete(entry.id); setMenuOpen(false); }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MenuBtn({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
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

const boardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: '12px 14px', marginBottom: 10,
};

const inlineInputStyle: React.CSSProperties = {
    width: '100%', fontSize: 11, padding: '5px 9px',
    border: '1px solid #e2e8f0', borderRadius: 6,
    background: '#fff', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#1e293b',
};

const cancelBtnStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: '5px 12px',
    border: '1px solid #e2e8f0', borderRadius: 6,
    background: '#fff', color: '#64748b', cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: '5px 12px',
    border: 'none', borderRadius: 6,
    background: '#064e3b', color: '#fff', cursor: 'pointer',
};
