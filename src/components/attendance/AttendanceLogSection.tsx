"use client";

import { useState, useEffect, useCallback } from 'react';
import { getAttendanceReport } from '@/app/actions/attendance';
import { MapPin, Clock, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface AttendanceRecord {
    id: string;
    clockIn: Date | string;
    clockOut: Date | string | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
}

function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function duration(clockIn: Date | string, clockOut: Date | string | null) {
    if (!clockOut) return null;
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

export default function AttendanceLogSection({ workspaceId }: { workspaceId: string }) {
    const today = todayStr();
    const [date, setDate] = useState(today);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (d: string) => {
        setLoading(true);
        const r = await getAttendanceReport(workspaceId, new Date(d));
        setRecords(r as AttendanceRecord[]);
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => { load(date); }, [date, load]);

    function shift(days: number) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        const next = d.toISOString().slice(0, 10);
        if (next <= today) setDate(next);
    }

    const displayDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    const present = records.length;
    const active = records.filter(r => !r.clockOut).length;

    return (
        <div style={{ marginTop: '2.5rem' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <MapPin size={16} color="#0d9488" /> Attendance Log
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Geofence clock-in records by date</p>
                </div>

                {/* Date navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => shift(-1)} style={navBtn}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', minWidth: 160, textAlign: 'center' }}>{displayDate}</span>
                    <button
                        onClick={() => shift(1)}
                        disabled={date >= today}
                        style={{ ...navBtn, opacity: date >= today ? 0.35 : 1 }}
                    >
                        <ChevronRight size={14} />
                    </button>
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={e => setDate(e.target.value)}
                        style={{ padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.8rem', color: '#1e293b', background: '#fff' }}
                    />
                </div>
            </div>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
                <div style={pill('#f0fdfa', '#0d9488')}>
                    <Users size={12} /> {present} present
                </div>
                {active > 0 && (
                    <div style={pill('#f0fdf4', '#16a34a')}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        {active} still in
                    </div>
                )}
                {present - active > 0 && (
                    <div style={pill('#f8fafc', '#64748b')}>
                        <Clock size={12} /> {present - active} clocked out
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
                ) : records.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                        <MapPin size={28} color="#e2e8f0" style={{ marginBottom: 8 }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No attendance recorded for this date.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Member', 'Clock In', 'Clock Out', 'Duration', 'Status'].map(h => (
                                    <th key={h} style={th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#475569', flexShrink: 0, overflow: 'hidden' }}>
                                                {r.user.image
                                                    ? <img src={r.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : (r.user.name || r.user.email || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#1e293b' }}>{r.user.name || '—'}</div>
                                                <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{r.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{fmt(r.clockIn)}</td>
                                    <td style={td}>{fmt(r.clockOut)}</td>
                                    <td style={{ ...td, color: '#475569' }}>{duration(r.clockIn, r.clockOut) ?? '—'}</td>
                                    <td style={td}>
                                        {r.clockOut
                                            ? <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '2px 9px', fontWeight: 600 }}>Out</span>
                                            : <span style={{ fontSize: '0.72rem', color: '#15803d', background: '#f0fdf4', borderRadius: 20, padding: '2px 9px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Active
                                              </span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const navBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7,
    border: '1px solid #e2e8f0', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#475569',
};

const th: React.CSSProperties = {
    padding: '0.6rem 0.9rem',
    textAlign: 'left',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const td: React.CSSProperties = {
    padding: '0.75rem 0.9rem',
    fontSize: '0.83rem',
};

function pill(bg: string, color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bg, color, borderRadius: 20,
        padding: '3px 11px', fontSize: '0.75rem', fontWeight: 600,
        border: `1px solid ${color}22`,
    };
}
