"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { getAttendanceReport, getWorkspaceMembersBasic, adminClockIn } from '@/app/actions/attendance';
import { MapPin, Clock, ChevronLeft, ChevronRight, UserPlus, Download } from 'lucide-react';

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
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AttendanceLogSection({ workspaceId }: { workspaceId: string }) {
    const today = todayStr();
    const [date, setDate] = useState(today);
    const [members, setMembers] = useState<Member[]>([]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [clockingIn, setClockingIn] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

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

    function handleManualClockIn(userId: string) {
        setClockingIn(userId);
        startTransition(async () => {
            const result = await adminClockIn(workspaceId, userId);
            if (result.success) {
                await loadData(date);
            }
            setClockingIn(null);
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
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <MapPin size={16} color="#0d9488" /> Attendance Log
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Geofence clock-in records — manual override available</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Date nav */}
                    <button onClick={() => shift(-1)} style={navBtn}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', minWidth: 160, textAlign: 'center' }}>{displayDate}</span>
                    <button onClick={() => shift(1)} disabled={date >= today} style={{ ...navBtn, opacity: date >= today ? 0.35 : 1 }}>
                        <ChevronRight size={14} />
                    </button>
                    <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
                        style={{ padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.8rem', color: '#1e293b', background: '#fff' }} />

                    {/* Export */}
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
                        title="Download CSV"
                    >
                        <Download size={13} /> Export
                    </button>
                </div>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={chip('#f0fdfa', '#0d9488')}>{records.length} / {members.length} in</div>
                {active > 0 && <div style={chip('#f0fdf4', '#16a34a')}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> {active} active</div>}
                {notYetIn.length > 0 && isToday && <div style={chip('#fef9f0', '#d97706')}>{notYetIn.length} not yet in</div>}
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Member', 'Clock In', 'Clock Out', 'Duration', 'Status'].map(h => (
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

                            {/* Not-yet-in rows — only shown for today */}
                            {isToday && notYetIn.map((m) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: 0.7 }}>
                                    <td style={tdStyle}><MemberCell user={m} /></td>
                                    <td style={{ ...tdStyle, color: '#cbd5e1' }}>—</td>
                                    <td style={{ ...tdStyle, color: '#cbd5e1' }}>—</td>
                                    <td style={{ ...tdStyle, color: '#cbd5e1' }}>—</td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => handleManualClockIn(m.id)}
                                            disabled={clockingIn === m.id || isPending}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '3px 10px', borderRadius: 20,
                                                border: '1px solid #0d9488', background: 'transparent',
                                                color: '#0d9488', fontSize: '0.72rem', fontWeight: 700,
                                                cursor: clockingIn === m.id ? 'wait' : 'pointer',
                                                opacity: clockingIn === m.id ? 0.6 : 1,
                                            }}
                                        >
                                            <UserPlus size={11} />
                                            {clockingIn === m.id ? 'Clocking in…' : 'Clock In'}
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Empty state */}
                            {records.length === 0 && (!isToday || notYetIn.length === 0) && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center' }}>
                                        <MapPin size={26} color="#e2e8f0" style={{ marginBottom: 8 }} />
                                        <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No attendance recorded for this date.</p>
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

function MemberCell({ user }: { user: Member }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
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
