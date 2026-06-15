"use client";

import { useState } from 'react';
import { Plus, X, FileText } from 'lucide-react';
import type { WorkEntry } from '@/app/actions/work-entries';
import { createWorkEntry } from '@/app/actions/work-entries';

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

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:     { label: 'Planned',     color: '#475569', bg: '#f1f5f9' },
    IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
    SUBMITTED:   { label: 'Submitted',   color: '#0d9488', bg: '#f0fdfa' },
    COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5' },
    OVERDUE:     { label: 'Overdue',     color: '#dc2626', bg: '#fee2e2' },
};

function displayName(name: string | null, email: string) {
    return name || email.split('@')[0];
}

function initials(name: string | null, email: string) {
    if (name) return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return email.slice(0, 2).toUpperCase();
}

interface BriefingRow {
    key: string;
    personId: string;
    task: string;
}

function MorningBriefingForm({ workspaceId, teamMembers, onAdded }: {
    workspaceId: string;
    teamMembers: TeamMember[];
    onAdded: (entries: WorkEntry[]) => void;
}) {
    const [rows, setRows] = useState<BriefingRow[]>([
        { key: '1', personId: '', task: '' },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(0);

    function addRow() {
        setRows(prev => [...prev, { key: Date.now().toString(), personId: prev.at(-1)?.personId ?? '', task: '' }]);
    }

    function removeRow(key: string) {
        setRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev);
    }

    function update(key: string, field: 'personId' | 'task', value: string) {
        setRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const valid = rows.filter(r => r.personId && r.task.trim());
        if (!valid.length) return;
        setSubmitting(true);
        setDone(0);

        const results: WorkEntry[] = [];
        for (const row of valid) {
            const res = await createWorkEntry({
                workspaceId,
                targetUserId: row.personId,
                title: row.task.trim(),
            });
            if (res.success) {
                results.push(res.data);
                setDone(n => n + 1);
            }
        }

        onAdded(results);
        setRows([{ key: Date.now().toString(), personId: '', task: '' }]);
        setSubmitting(false);
        setDone(0);
    }

    const validCount = rows.filter(r => r.personId && r.task.trim()).length;

    return (
        <form onSubmit={handleSubmit} style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: 12, marginBottom: 16,
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Assign today's work
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((row, idx) => (
                    <div key={row.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                            value={row.personId}
                            onChange={e => update(row.key, 'personId', e.target.value)}
                            style={cellStyle}
                        >
                            <option value="">— Person —</option>
                            {teamMembers.map(m => (
                                <option key={m.userId} value={m.userId}>
                                    {displayName(m.user.name, m.user.email)}
                                </option>
                            ))}
                        </select>
                        <input
                            placeholder="Task / deliverable"
                            value={row.task}
                            onChange={e => update(row.key, 'task', e.target.value)}
                            style={{ ...cellStyle, flex: 1 }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); addRow(); }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, flexShrink: 0 }}
                            title="Remove row"
                        >
                            <X size={13} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button
                    type="button"
                    onClick={addRow}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    <Plus size={12} /> Add row
                </button>
                <button
                    type="submit"
                    disabled={submitting || validCount === 0}
                    style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '5px 14px', borderRadius: 6,
                        background: validCount > 0 ? '#064e3b' : '#e2e8f0',
                        color: validCount > 0 ? '#fff' : '#94a3b8',
                        border: 'none', cursor: validCount > 0 ? 'pointer' : 'default',
                        opacity: submitting ? 0.7 : 1,
                    }}
                >
                    {submitting ? `Assigning… (${done}/${validCount})` : `Assign ${validCount > 0 ? validCount : ''} task${validCount !== 1 ? 's' : ''}`}
                </button>
            </div>
        </form>
    );
}

export default function FirmWorkLogBoard({
    workspaceId, currentUserId, isAdmin, initialEntries, teamMembers,
}: Props) {
    const [entries, setEntries] = useState<WorkEntry[]>(initialEntries);
    const [showAssignForm, setShowAssignForm] = useState(false);

    function handleAdded(newEntries: WorkEntry[]) {
        setEntries(prev => [...prev, ...newEntries]);
    }

    // Group by assignee
    const byMember = new Map<string, WorkEntry[]>();
    for (const e of entries) {
        if (!byMember.has(e.userId)) byMember.set(e.userId, []);
        byMember.get(e.userId)!.push(e);
    }

    // For admin: show all members. For others: only members with entries.
    const membersToShow = isAdmin
        ? [...teamMembers].sort((a, b) =>
            displayName(a.user.name, a.user.email).localeCompare(displayName(b.user.name, b.user.email))
          )
        : teamMembers
            .filter(m => byMember.has(m.userId))
            .sort((a, b) =>
                displayName(a.user.name, a.user.email).localeCompare(displayName(b.user.name, b.user.email))
            );

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Today's Work Log
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowAssignForm(v => !v)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            border: '1px solid #d1fae5',
                            borderRadius: 6,
                            background: '#ecfdf5',
                            color: '#065f46',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={12} />
                        {showAssignForm ? 'Hide form' : 'Assign work'}
                    </button>
                )}
            </div>

            {/* Batch entry form — admin only */}
            {isAdmin && showAssignForm && (
                <MorningBriefingForm
                    workspaceId={workspaceId}
                    teamMembers={teamMembers}
                    onAdded={handleAdded}
                />
            )}

            {/* Work list */}
            {membersToShow.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No work has been logged for today yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {membersToShow.map((member, idx) => {
                        const mEntries = byMember.get(member.userId) ?? [];
                        const doneCount = mEntries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
                        const isYou = member.userId === currentUserId;

                        return (
                            <div
                                key={member.userId}
                                style={{
                                    borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                                    paddingTop: idx === 0 ? 0 : 10,
                                    paddingBottom: 10,
                                }}
                            >
                                {/* Person row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: isYou ? '#064e3b' : '#e2e8f0',
                                        color: isYou ? '#fff' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {initials(member.user.name, member.user.email)}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                        {displayName(member.user.name, member.user.email)}
                                        {isYou && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 5, fontSize: 11 }}>(you)</span>}
                                    </span>
                                    {member.role && (
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>· {member.role}</span>
                                    )}
                                    {mEntries.length > 0 && (
                                        <span style={{
                                            marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                                            color: doneCount === mEntries.length ? '#059669' : '#94a3b8',
                                        }}>
                                            {doneCount}/{mEntries.length} done
                                        </span>
                                    )}
                                </div>

                                {/* Tasks */}
                                {mEntries.length === 0 ? (
                                    <p style={{ fontSize: 11, color: '#cbd5e1', margin: '0 0 0 32px' }}>Nothing assigned yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 32 }}>
                                        {mEntries.map(entry => {
                                            const sm = STATUS_META[entry.status] || STATUS_META.PLANNED;
                                            const done = entry.status === 'COMPLETED' || entry.status === 'SUBMITTED';
                                            const ref = entry.brief
                                                ? (entry.brief.customBriefNumber || entry.brief.briefNumber)
                                                : null;
                                            return (
                                                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{
                                                        fontSize: 12, flex: 1, minWidth: 0,
                                                        color: done ? '#94a3b8' : '#1e293b',
                                                        textDecoration: done ? 'line-through' : 'none',
                                                    }}>
                                                        {entry.title}
                                                    </span>
                                                    {ref && (
                                                        <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                                            <FileText size={9} />{ref}
                                                        </span>
                                                    )}
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                                                        padding: '1px 7px', borderRadius: 20,
                                                        background: sm.bg, color: sm.color,
                                                    }}>
                                                        {sm.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const cellStyle: React.CSSProperties = {
    fontSize: 11, padding: '5px 8px',
    border: '1px solid #e2e8f0', borderRadius: 6,
    background: '#fff', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', color: '#1e293b',
};
