"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { getAttendanceReport, getWorkspaceMembersBasic, adminClockIn } from '@/app/actions/attendance';
import { MapPin, Clock, ChevronLeft, ChevronRight, UserPlus, Download, Check, X } from 'lucide-react';

interface Member { id: string; name: string | null; email: string | null; image: string | null }
interface AttendanceRecord {
    id: string;
    clockIn: Date | string;
    clockOut: Date | string | null;
    userId: string;
    user: Member;
}

function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function duration(ci: Date | string, co: Date | string | null) {
    if (!co) return null;
    const ms = new Date(co).getTime() - new Date(ci).getTime();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function nowTimeStr() {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function exportCSV(records: AttendanceRecord[], dateStr: string) {
    const header = ['Name', 'Email', 'Clock In', 'Clock Out', 'Duration', 'Status'];
    const rows = records.map(r => {
        const dur = duration(r.clockIn, r.clockOut);
        return [
            r.user.name || '',
            r.user.email || '',
            fmt(r.clockIn),
            fmt(r.clockOut),
            dur || (r.clockOut ? '—' : 'Active'),
            r.clockOut ? 'Clocked Out' : 'Active',
        ];
    });
    const csv = [header, ...rows]
        .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${dateStr}.csv`; a.click();
    URL.revokeObjectURL(url);
}

export default function AttendanceLogSection({ workspaceId }: { workspaceId: string }) {
    const today = todayStr();
    const [date, setDate] = useState(today);
    const [members, setMembers] = useState<Member[]>([]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    // pendingClockIn: userId → time string (HH:MM) being edited
    const [pendingClockIn, setPendingClockIn] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const loadData = useCallback(async (d: string) => {
        setLoading(true);
        const [allMembers, dayRecords] = await Promise.all([
            getWorkspaceMembersBasic(workspaceId),
            getAttendanceReport(workspaceId, new Date(d)),
        ]);
        setMembers(allMembers as Member[]);
        setRecords(dayRecords as AttendanceRecord[]);
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => { loadData(date); }, [date, loadData]);

    function shift(days: number) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        const next = d.toISOString().slice(0, 10);
        if (next <= today) setDate(next);
    }

    // Open time picker for a member — default to current time
    function openClockIn(userId: string) {
        setPendingClockIn(prev => ({ ...prev, [userId]: nowTimeStr() }));
    }

    function cancelClockIn(userId: string) {
        setPendingClockIn(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }

    function confirmClockIn(userId: string) {
        const timeStr = pendingClockIn[userId];
        if (!timeStr) return;
        setSubmitting(userId);

        // Build full datetime from selected date + entered time
        const [hh, mm] = timeStr.split(':').map(Number);
        const clockInDate = new Date(date);
        clockInDate.setHours(hh, mm, 0, 0);

        startTransition(async () => {
            const result = await adminClockIn(workspaceId, userId, clockInDate);
            if (result.success) {
                cancelClockIn(userId);
                await loadData(date);
            }
            setSubmitting(null);
        });
    }

    const clockedInIds = new Set(records.map(r => r.userId));
    const notYetIn = members.filter(m => !clockedInIds.has(m.id));
    const isToday = date === today;
    const active = records.filter(r => !r.clockOut).length;

    const displayDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <div style={{ marginTop: '2.5rem', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <MapPin size={16} color="#0d9488" /> Attendance Log
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Auto-logged via geofence · manually record arrivals below</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => shift(-1)} style={navBtn}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', minWidth: 160, textAlign: 'center' }}>{displayDate}</span>
                    <button onClick={() => shift(1)} disabled={date >= today} style={{ ...navBtn, opacity: date >= today ? 0.35 : 1 }}>
                        <ChevronRight size={14} />
                    </button>
                    <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
                        style={{ padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.8rem', color: '#1e293b', background: '#fff' }} />
                    <button
                        onClick={() => exportCSV(records, date)}
                        disabled={records.length === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0.35rem 0.85rem', borderRadius: 7,
                            border: '1px solid #e2e8f0', background: '#fff',
                            color: records.length === 0 ? '#cbd5e1' : '#0f172a',
                            cursor: records.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem', fontWeight: 600,
                        }}
                    >
                        <Download size={13} /> Export
                    </button>
                </div>
            </div>

            {/* Pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={chip('#f0fdfa', '#0d9488')}>{records.length} / {members.length} in</div>
                {active > 0 && <div style={chip('#f0fdf4', '#16a34a')}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> {active} active</div>}
                {notYetIn.length > 0 && <div style={chip('#fef9f0', '#d97706')}>{notYetIn.length} not yet recorded</div>}
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Member', 'Clock In', 'Clock Out', 'Duration', 'Status / Action'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Clocked-in rows */}
                            {records.map((r, i) => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}><MemberCell user={r.user} /></td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{fmt(r.clockIn)}</td>
                                    <td style={tdStyle}>{fmt(r.clockOut)}</td>
                                    <td style={{ ...tdStyle, color: '#475569' }}>{duration(r.clockIn, r.clockOut) ?? '—'}</td>
                                    <td style={tdStyle}>
                                        {r.clockOut
                                            ? <StatusBadge label="Out" color="#64748b" bg="#f1f5f9" />
                                            : <StatusBadge label="Active" color="#15803d" bg="#f0fdf4" dot />
                                        }
                                    </td>
                                </tr>
                            ))}

                            {/* Not-yet-in rows — available for any date (not just today) */}
                            {notYetIn.map((m) => {
                                const isPending = m.id in pendingClockIn;
                                const isSubmitting = submitting === m.id;
                                return (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: isPending ? '#f8fafc' : undefined }}>
                                        <td style={tdStyle}><MemberCell user={m} dim={!isPending} /></td>
                                        <td style={{ ...tdStyle, color: '#cbd5e1' }}>
                                            {isPending ? (
                                                <input
                                                    type="time"
                                                    value={pendingClockIn[m.id]}
                                                    onChange={e => setPendingClockIn(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                    style={{ padding: '4px 8px', border: '1px solid #0d9488', borderRadius: 6, fontSize: '0.83rem', color: '#0f172a', background: '#fff', width: 110 }}
                                                />
                                            ) : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#cbd5e1' }}>—</td>
                                        <td style={{ ...tdStyle, color: '#cbd5e1' }}>—</td>
                                        <td style={tdStyle}>
                                            {!isPending ? (
                                                <button
                                                    onClick={() => openClockIn(m.id)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '3px 10px', borderRadius: 20,
                                                        border: '1px solid #0d9488', background: 'transparent',
                                                        color: '#0d9488', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                                    }}
                                                >
                                                    <UserPlus size={11} /> Record Arrival
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <button
                                                        onClick={() => confirmClockIn(m.id)}
                                                        disabled={isSubmitting}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            padding: '3px 10px', borderRadius: 20,
                                                            border: 'none', background: '#0d9488',
                                                            color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                                                            cursor: isSubmitting ? 'wait' : 'pointer',
                                                            opacity: isSubmitting ? 0.7 : 1,
                                                        }}
                                                    >
                                                        <Check size={11} /> {isSubmitting ? 'Saving…' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => cancelClockIn(m.id)}
                                                        disabled={isSubmitting}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px 4px', display: 'flex' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {records.length === 0 && notYetIn.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No members found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function MemberCell({ user, dim }: { user: Member; dim?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: dim ? 0.5 : 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', flexShrink: 0, overflow: 'hidden' }}>
                {user.image
                    ? <img src={user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (user.name || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#1e293b' }}>{user.name || '—'}</div>
                <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{user.email}</div>
            </div>
        </div>
    );
}

function StatusBadge({ label, color, bg, dot }: { label: string; color: string; bg: string; dot?: boolean }) {
    return (
        <span style={{ fontSize: '0.72rem', color, background: bg, borderRadius: 20, padding: '2px 9px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />}
            {label}
        </span>
    );
}

const navBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0',
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#475569',
};

const thStyle: React.CSSProperties = {
    padding: '0.6rem 0.9rem', textAlign: 'left', fontSize: '0.68rem',
    fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '0.75rem 0.9rem', fontSize: '0.83rem' };

function chip(bg: string, color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bg, color, borderRadius: 20, padding: '3px 11px',
        fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${color}33`,
    };
}
