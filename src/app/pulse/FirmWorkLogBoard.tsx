"use client";

import { FileText } from 'lucide-react';
import type { WorkEntry } from '@/app/actions/work-entries';

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

export default function FirmWorkLogBoard({ initialEntries, teamMembers, currentUserId }: Props) {
    // Group by assignee
    const byMember = new Map<string, WorkEntry[]>();
    for (const e of initialEntries) {
        if (!byMember.has(e.userId)) byMember.set(e.userId, []);
        byMember.get(e.userId)!.push(e);
    }

    // Only members who have logged work, sorted by name
    const membersWithWork = teamMembers
        .filter(m => byMember.has(m.userId))
        .sort((a, b) =>
            displayName(a.user.name, a.user.email).localeCompare(displayName(b.user.name, b.user.email))
        );

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today's Work Log
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            {membersWithWork.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    No work has been logged for today yet.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {membersWithWork.map((member, idx) => {
                        const mEntries = byMember.get(member.userId) ?? [];
                        const doneCount = mEntries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
                        const isYou = member.userId === currentUserId;

                        return (
                            <div
                                key={member.userId}
                                style={{
                                    borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                                    paddingTop: idx === 0 ? 0 : 12,
                                    paddingBottom: 12,
                                }}
                            >
                                {/* Person row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
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
                                    <span style={{
                                        marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                                        color: doneCount === mEntries.length ? '#059669' : '#94a3b8',
                                    }}>
                                        {doneCount}/{mEntries.length} done
                                    </span>
                                </div>

                                {/* Task rows */}
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
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
