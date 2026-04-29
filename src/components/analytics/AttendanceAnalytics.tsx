"use client";

import { useState, useEffect } from 'react';
import { getAttendanceReport, getAttendanceStats } from '@/app/actions/attendance';
import { MapPin, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';

type Period = 'day' | 'week' | 'month';

interface DayRecord {
    id: string;
    clockIn: Date | string;
    clockOut: Date | string | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface StaffStat {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    daysPresent: number;
    avgClockInMinutes: number;
    earliestMinutes: number;
    latestMinutes: number;
}

function minsToTime(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtTime(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function punctuality(avgMins: number) {
    if (avgMins <= 8 * 60 + 30) return { label: 'Early', color: '#16a34a', bg: '#f0fdf4' };
    if (avgMins <= 9 * 60) return { label: 'On Time', color: '#0d9488', bg: '#f0fdfa' };
    if (avgMins <= 9 * 60 + 30) return { label: 'Slightly Late', color: '#d97706', bg: '#fffbeb' };
    return { label: 'Late', color: '#dc2626', bg: '#fef2f2' };
}

// Mini bar showing avg time on a 6 AM–11 AM scale
function TimeBar({ minutes }: { minutes: number }) {
    const MIN = 6 * 60;   // 6:00 AM
    const MAX = 11 * 60;  // 11:00 AM
    const pct = Math.min(Math.max((minutes - MIN) / (MAX - MIN), 0), 1) * 100;
    const p = punctuality(minutes);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: p.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: p.color, minWidth: 60, textAlign: 'right' }}>{minsToTime(minutes)}</span>
        </div>
    );
}

export default function AttendanceAnalytics({ workspaceId }: { workspaceId: string }) {
    const today = todayStr();
    const [period, setPeriod] = useState<Period>('day');
    const [date, setDate] = useState(today);
    const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);
    const [stats, setStats] = useState<StaffStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        if (period === 'day') {
            getAttendanceReport(workspaceId, new Date(date))
                .then(r => { setDayRecords(r as DayRecord[]); setLoading(false); });
        } else {
            getAttendanceStats(workspaceId, period)
                .then(r => { setStats(r as StaffStat[]); setLoading(false); });
        }
    }, [period, date, workspaceId]);

    function shiftDay(d: number) {
        const dt = new Date(date);
        dt.setDate(dt.getDate() + d);
        const next = dt.toISOString().slice(0, 10);
        if (next <= today) setDate(next);
    }

    const displayDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
    });

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={panel}>
                {/* Panel header */}
                <div style={panelHeader}>
                    <div>
                        <div style={panelTitle}>Staff Attendance</div>
                        <div style={panelSub}>Clock-in patterns and punctuality</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Period tabs */}
                        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                            {(['day', 'week', 'month'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    style={{
                                        padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                        fontSize: '0.78rem', fontWeight: 600,
                                        background: period === p ? '#fff' : 'transparent',
                                        color: period === p ? '#0f172a' : '#64748b',
                                        boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    }}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Day navigator — only shown for day view */}
                        {period === 'day' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={() => shiftDay(-1)} style={navBtn}><ChevronLeft size={13} /></button>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', minWidth: 100, textAlign: 'center' }}>{displayDate}</span>
                                <button onClick={() => shiftDay(1)} disabled={date >= today} style={{ ...navBtn, opacity: date >= today ? 0.35 : 1 }}><ChevronRight size={13} /></button>
                                <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
                                    style={{ padding: '3px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.78rem', color: '#1e293b', background: '#fff' }} />
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Loading…</div>
                ) : period === 'day' ? (
                    <DayView records={dayRecords} />
                ) : (
                    <AggView stats={stats} period={period} />
                )}
            </div>
        </div>
    );
}

function DayView({ records }: { records: DayRecord[] }) {
    if (records.length === 0) {
        return (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <MapPin size={30} color="#e2e8f0" style={{ marginBottom: 8 }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No attendance recorded for this day.</p>
            </div>
        );
    }

    const active = records.filter(r => !r.clockOut).length;

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, padding: '1rem 1.25rem 0' }}>
                <div style={statChip('#f0fdfa', '#0d9488')}><Users size={12} /> {records.length} present</div>
                {active > 0 && <div style={statChip('#f0fdf4', '#16a34a')}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> {active} active</div>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                        {['Member', 'Clock In', 'Clock Out', 'Duration', 'Status'].map(h => (
                            <th key={h} style={tHead}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, i) => {
                        const ms = r.clockOut ? new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime() : null;
                        const dur = ms ? (Math.floor(ms / 3600000) > 0 ? `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m` : `${Math.floor(ms / 60000)}m`) : null;
                        return (
                            <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={tCell}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', flexShrink: 0, overflow: 'hidden' }}>
                                            {r.user.image ? <img src={r.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.user.name || r.user.email || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>{r.user.name || '—'}</div>
                                            <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{r.user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...tCell, fontWeight: 700, color: '#0f172a' }}>{fmtTime(r.clockIn)}</td>
                                <td style={tCell}>{fmtTime(r.clockOut)}</td>
                                <td style={{ ...tCell, color: '#475569' }}>{dur ?? '—'}</td>
                                <td style={tCell}>
                                    {r.clockOut
                                        ? <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '2px 9px', fontWeight: 600 }}>Out</span>
                                        : <span style={{ fontSize: '0.72rem', color: '#15803d', background: '#f0fdf4', borderRadius: 20, padding: '2px 9px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Active
                                          </span>
                                    }
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function AggView({ stats, period }: { stats: StaffStat[]; period: 'week' | 'month' }) {
    if (stats.length === 0) {
        return (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Clock size={30} color="#e2e8f0" style={{ marginBottom: 8 }} />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No attendance data for this {period}.</p>
            </div>
        );
    }

    const label = period === 'week' ? 'This Week' : 'This Month';

    return (
        <div style={{ padding: '0.5rem 0 0.25rem' }}>
            <div style={{ padding: '0.5rem 1.25rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Average clock-in time · {label} · sorted by earliest arrival
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                        {['Member', 'Days Present', 'Avg Arrival', 'Range', 'Punctuality'].map(h => (
                            <th key={h} style={tHead}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {stats.map((s, i) => {
                        const p = punctuality(s.avgClockInMinutes);
                        return (
                            <tr key={s.id} style={{ borderBottom: i < stats.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={tCell}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', flexShrink: 0, overflow: 'hidden' }}>
                                            {s.image ? <img src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (s.name || s.email || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1e293b' }}>{s.name || '—'}</div>
                                            <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{s.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...tCell, fontWeight: 600 }}>{s.daysPresent} {s.daysPresent === 1 ? 'day' : 'days'}</td>
                                <td style={{ ...tCell, minWidth: 200 }}>
                                    <TimeBar minutes={s.avgClockInMinutes} />
                                </td>
                                <td style={{ ...tCell, fontSize: '0.75rem', color: '#64748b' }}>
                                    {minsToTime(s.earliestMinutes)} – {minsToTime(s.latestMinutes)}
                                </td>
                                <td style={tCell}>
                                    <span style={{ fontSize: '0.72rem', background: p.bg, color: p.color, borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
                                        {p.label}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

const panel: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    overflow: 'hidden',
};

const panelHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '1.1rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: 12,
};

const panelTitle: React.CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
};

const panelSub: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: 2,
};

const tHead: React.CSSProperties = {
    padding: '0.6rem 1rem',
    textAlign: 'left',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tCell: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.84rem',
};

const navBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 6,
    border: '1px solid #e2e8f0', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#475569',
};

function statChip(bg: string, color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bg, color, borderRadius: 20,
        padding: '3px 11px', fontSize: '0.75rem', fontWeight: 600,
        border: `1px solid ${color}22`,
    };
}
