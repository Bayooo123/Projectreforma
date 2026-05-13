'use client';

import { useState, useMemo } from 'react';
import { Monitor, Smartphone, Globe, Search, RefreshCw, Tablet } from 'lucide-react';
import styles from './Visitors.module.css';

interface Visit {
    id: string;
    ip: string | null;
    city: string | null;
    country: string | null;
    region: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    referrer: string | null;
    page: string;
    sessionId: string | null;
    createdAt: Date;
}

function relativeTime(date: Date): string {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DeviceIcon({ device }: { device: string | null }) {
    if (device === 'mobile') return <Smartphone size={14} />;
    if (device === 'tablet') return <Tablet size={14} />;
    return <Monitor size={14} />;
}

function getLocationLabel(visit: Visit): string {
    const parts = [visit.city, visit.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Unknown';
}

function getReferrerLabel(ref: string | null): string {
    if (!ref) return 'Direct';
    try {
        const url = new URL(ref);
        return url.hostname.replace('www.', '');
    } catch {
        return ref.slice(0, 40);
    }
}

export default function VisitorsClient({ visits }: { visits: Visit[] }) {
    const [search, setSearch] = useState('');
    const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');

    const uniqueSessions = useMemo(() => new Set(visits.map(v => v.sessionId || v.ip)).size, [visits]);
    const todayCount = useMemo(() => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        return visits.filter(v => new Date(v.createdAt) >= start).length;
    }, [visits]);

    const filtered = useMemo(() => {
        let list = visits;
        if (deviceFilter !== 'all') list = list.filter(v => v.device === deviceFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(v =>
                v.ip?.includes(q) ||
                v.city?.toLowerCase().includes(q) ||
                v.country?.toLowerCase().includes(q) ||
                v.browser?.toLowerCase().includes(q) ||
                v.os?.toLowerCase().includes(q) ||
                v.referrer?.toLowerCase().includes(q) ||
                v.sessionId?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [visits, search, deviceFilter]);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Site Visitors</h1>
                    <p className={styles.subtitle}>Everyone who has visited reforma.ng — newest first</p>
                </div>
                <button className={styles.refreshBtn} onClick={() => window.location.reload()}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* KPI strip */}
            <div className={styles.kpiRow}>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{visits.length.toLocaleString()}</div>
                    <div className={styles.kpiLabel}>Total Visits</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{uniqueSessions.toLocaleString()}</div>
                    <div className={styles.kpiLabel}>Unique Visitors</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{todayCount.toLocaleString()}</div>
                    <div className={styles.kpiLabel}>Today</div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>
                        {visits.length > 0
                            ? (() => {
                                const mobilePct = Math.round(visits.filter(v => v.device === 'mobile').length / visits.length * 100);
                                return `${mobilePct}%`;
                            })()
                            : '—'}
                    </div>
                    <div className={styles.kpiLabel}>Mobile</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Search by IP, location, browser…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.filterGroup}>
                    {(['all', 'desktop', 'mobile', 'tablet'] as const).map(d => (
                        <button
                            key={d}
                            className={`${styles.filterBtn} ${deviceFilter === d ? styles.filterActive : ''}`}
                            onClick={() => setDeviceFilter(d)}
                        >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Visitor</th>
                            <th>Location</th>
                            <th>Device / Browser</th>
                            <th>Referrer</th>
                            <th>Page</th>
                            <th>When</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    {visits.length === 0 ? 'No visits recorded yet.' : 'No results match your filter.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((v, i) => (
                                <tr key={v.id} className={i % 2 === 0 ? styles.rowEven : ''}>
                                    <td>
                                        <div className={styles.visitorCell}>
                                            <span className={styles.ipBadge}>{v.ip || '—'}</span>
                                            {v.sessionId && (
                                                <span className={styles.sessionId} title={v.sessionId}>
                                                    #{v.sessionId.slice(-6)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.locationCell}>
                                            <Globe size={13} className={styles.locationIcon} />
                                            {getLocationLabel(v)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.deviceCell}>
                                            <DeviceIcon device={v.device} />
                                            <span>{v.browser || '—'}</span>
                                            <span className={styles.osBadge}>{v.os || ''}</span>
                                        </div>
                                    </td>
                                    <td className={styles.referrerCell}>
                                        {getReferrerLabel(v.referrer)}
                                    </td>
                                    <td className={styles.pageCell}>{v.page}</td>
                                    <td className={styles.timeCell}>
                                        {relativeTime(v.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className={styles.footer}>Showing {filtered.length} of {visits.length} visits · Bots excluded</p>
        </div>
    );
}
