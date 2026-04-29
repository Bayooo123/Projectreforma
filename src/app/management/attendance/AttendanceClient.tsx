"use client";

import { useState, useEffect, useCallback } from 'react';
import { getAttendanceReport, getAttendanceRangeReport } from '@/app/actions/attendance';
import { MapPin, Clock, Calendar, ChevronLeft, ChevronRight, Users, Download } from 'lucide-react';

interface AttendanceRecord {
    id: string;
    clockIn: Date;
    clockOut: Date | null;
    date: Date;
    lat: number | null;
    lng: number | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
}

function formatTime(d: Date | null | string) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(clockIn: Date | string, clockOut: Date | null | string) {
    if (!clockOut) return 'Active';
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function toLocalDateString(d: Date) {
    return d.toISOString().slice(0, 10);
}

export default function AttendanceClient({ workspaceId }: { workspaceId: string }) {
    const today = toLocalDateString(new Date());
    const [selectedDate, setSelectedDate] = useState(today);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (date: string) => {
        setLoading(true);
        const r = await getAttendanceReport(workspaceId, new Date(date));
        setRecords(r as AttendanceRecord[]);
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => { load(selectedDate); }, [selectedDate, load]);

    function prevDay() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(toLocalDateString(d));
    }
    function nextDay() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const next = toLocalDateString(d);
        if (next <= today) setSelectedDate(next);
    }

    const presentCount = records.length;
    const stillInCount = records.filter(r => !r.clockOut).length;

    const displayDate = new Date(selectedDate).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={20} color="#0d9488" /> Attendance
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Geofence-based clock-in records for your workspace</p>
            </div>

            {/* Date nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <button onClick={prevDay} style={navBtn}><ChevronLeft size={16} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={15} color="#64748b" />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{displayDate}</span>
                </div>
                <button
                    onClick={nextDay}
                    disabled={selectedDate >= today}
                    style={{ ...navBtn, opacity: selectedDate >= today ? 0.35 : 1 }}
                >
                    <ChevronRight size={16} />
                </button>
                <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ marginLeft: 'auto', padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', color: '#1e293b', background: '#fff' }}
                />
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Present', value: presentCount, icon: <Users size={16} color="#0d9488" />, color: '#f0fdfa' },
                    { label: 'Still In', value: stillInCount, icon: <Clock size={16} color="#2563eb" />, color: '#eff6ff' },
                    { label: 'Clocked Out', value: presentCount - stillInCount, icon: <Clock size={16} color="#64748b" />, color: '#f8fafc' },
                ].map(s => (
                    <div key={s.label} style={{ background: s.color, border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>Loading...</div>
                ) : records.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <MapPin size={32} color="#e2e8f0" style={{ marginBottom: 12 }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No attendance records for this date.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Member', 'Clock In', 'Clock Out', 'Duration', 'Location'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '0.85rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#475569', flexShrink: 0, overflow: 'hidden' }}>
                                                {r.user.image
                                                    ? <img src={r.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : (r.user.name || r.user.email || '?')[0].toUpperCase()
                                                }
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{r.user.name || '—'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: 500 }}>
                                        {formatTime(r.clockIn)}
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem' }}>
                                        {r.clockOut
                                            ? <span style={{ color: '#0f172a' }}>{formatTime(r.clockOut)}</span>
                                            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Active
                                              </span>
                                        }
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#475569' }}>
                                        {formatDuration(r.clockIn, r.clockOut)}
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {r.lat && r.lng
                                            ? <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" style={{ color: '#0d9488', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <MapPin size={12} /> View
                                              </a>
                                            : '—'
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
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#475569',
};
