"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, Download, TrendingDown, Loader } from 'lucide-react';
import { PinProtection } from '@/components/auth/PinProtection';
import { useCountUp } from '@/hooks/useCountUp';
import styles from './Analytics.module.css';
import {
    getAnalyticsMetrics, getTopClients, getCourtVisits,
    getExpenseDistribution, getLawyerStats,
} from '@/app/actions/analytics';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Icon, Donut, AreaChart } from '@/components/mobile/MobileShared';

interface AnalyticsClientProps {
    initialMetrics: any;
    initialRevenueTrend: { month: string; amount: number }[];
    initialMatterDistribution: { status: string; count: number }[];
    workspaceId: string;
    initialFilter: string;
}

// Crimson palette matching the screenshot
const CHART_COLORS = ['#8B0000', '#DC2626', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'];
const EXPENSE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626'];

function formatCurrency(amount: number) {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (num >= 1_000_000) return `₦${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `₦${(num / 1_000).toFixed(0)}K`;
    return `₦${num.toLocaleString()}`;
}

function formatCurrencyFull(amount: number) {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────
// SVG Line / Area Chart
// ─────────────────────────────────────────
function LineChart({ data }: { data: { month: string; amount: number }[] }) {
    if (!data || data.length < 2) {
        return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No trend data</div>;
    }

    const W = 520;
    const H = 150;
    const PAD = { top: 8, right: 8, bottom: 4, left: 4 };
    const maxVal = Math.max(...data.map(d => d.amount), 1);

    const pts = data.map((d, i) => {
        const x = PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
        const y = PAD.top + (1 - d.amount / maxVal) * (H - PAD.top - PAD.bottom);
        return { x, y, ...d };
    });

    const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
    const areaPath = `M ${pts[0].x},${H} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x},${H} Z`;

    // Y-axis ticks (4 levels)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
        y: PAD.top + (1 - ratio) * (H - PAD.top - PAD.bottom),
        label: formatCurrency(maxVal * ratio),
    }));

    return (
        <div>
            <div className={styles.lineChartWrap} style={{ paddingLeft: 58 }}>
                {/* Y labels */}
                <div className={styles.yAxisLabels}>
                    {[...yTicks].reverse().map((t, i) => (
                        <span key={i} className={styles.yLabel}>{t.label}</span>
                    ))}
                </div>

                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.01" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {yTicks.map((t, i) => (
                        <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
                            stroke="#e2e8f0" strokeWidth="0.8" />
                    ))}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#areaGrad)" />

                    {/* Line */}
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Dots */}
                    {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3.5"
                            fill="#dc2626" stroke="white" strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke" />
                    ))}
                </svg>
            </div>

            {/* X axis labels */}
            <div className={styles.xAxisLabels} style={{ paddingLeft: 58 }}>
                {data.map(d => (
                    <span key={d.month} className={styles.xLabel}>{d.month}</span>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// SVG Donut Chart
// ─────────────────────────────────────────
function DonutChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
    const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
    const R = 52, CX = 68, CY = 68, stroke = 22;
    const circ = 2 * Math.PI * R;

    let cumPct = 0;
    const slices = data.map((d, i) => {
        const pct = (d.value || 0) / total;
        const dashArray = `${pct * circ} ${circ}`;
        const offset = circ - cumPct * circ;
        cumPct += pct;
        return { ...d, pct, dashArray, offset, color: colors[i % colors.length] };
    });

    return (
        <div className={styles.donutWrap}>
            <svg width={136} height={136} viewBox="0 0 136 136">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                {slices.map((s, i) => (
                    <circle
                        key={i}
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={stroke}
                        strokeDasharray={s.dashArray}
                        strokeDashoffset={s.offset}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px` }}
                    />
                ))}
                <text x={CX} y={CY - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="currentColor">{total}</text>
                <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">TOTAL</text>
            </svg>

            <div className={styles.donutLegend}>
                {slices.map((s, i) => (
                    <div key={i} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendLabel} title={s.label}>{s.label}</span>
                        <span className={styles.legendValue}>{Math.round(s.pct * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Horizontal Bar Chart
// ─────────────────────────────────────────
function HBarChart({ data }: { data: { label: string; value: number }[] }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className={styles.barChart}>
            {data.map((d, i) => (
                <div key={i} className={styles.barRow}>
                    <span className={styles.barLabel} title={d.label}>{d.label}</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(d.value / max) * 100}%` }} />
                    </div>
                    <span className={styles.barCount}>{d.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function AnalyticsClient({
    initialMetrics, initialRevenueTrend, initialMatterDistribution, workspaceId, initialFilter,
}: AnalyticsClientProps) {
    const [filter, setFilter] = useState(initialFilter);
    const [metrics, setMetrics] = useState(initialMetrics);
    const [revenueTrend] = useState(initialRevenueTrend);
    const [matterDistribution] = useState(initialMatterDistribution);
    const [isFiltering, setIsFiltering] = useState(false);

    // Heavy data — loaded client-side after paint
    const [topClients, setTopClients] = useState<any[]>([]);
    const [lawyerStats, setLawyerStats] = useState<any[]>([]);
    const [courtVisits, setCourtVisits] = useState<any[]>([]);
    const [expenseDistribution, setExpenseDistribution] = useState<any[]>([]);
    const [heavyLoading, setHeavyLoading] = useState(true);

    useEffect(() => {
        setHeavyLoading(true);
        Promise.all([
            getTopClients(workspaceId, filter),
            getLawyerStats(workspaceId),
            getCourtVisits(workspaceId, filter),
            getExpenseDistribution(workspaceId, filter),
        ]).then(([tc, ls, cv, ed]) => {
            setTopClients(tc ?? []);
            setLawyerStats(ls ?? []);
            setCourtVisits(cv ?? []);
            setExpenseDistribution(ed ?? []);
        }).finally(() => setHeavyLoading(false));
    }, [workspaceId, filter]);

    const handleFilterChange = async (f: string) => {
        if (f === filter) return;
        setFilter(f);
        setIsFiltering(true);
        try {
            const newMetrics = await getAnalyticsMetrics(workspaceId, f);
            if (newMetrics) setMetrics(newMetrics);
        } catch {
            // silent
        } finally {
            setIsFiltering(false);
        }
    };

    const totalMatters = (matterDistribution || []).reduce((s: number, d: any) => s + (d.count || 0), 0) || 1;
    const topClientTotal = (topClients || []).reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0) || 1;

    // Animated counters
    const animRevenue = useCountUp(metrics?.revenue?.total || 0, 2000);
    const animMatters = useCountUp(metrics?.matters?.active || 0, 1500);
    const animExpenses = useCountUp(metrics?.expenses?.total || 0, 1800);
    const animCourtDates = useCountUp(metrics?.courtDates?.upcoming || 0, 1000);

    // Client concentration: top client % of total revenue
    const topClientRevPct = topClients && topClients.length > 0
        ? Math.round(((topClients[0]?.totalRevenue || 0) / topClientTotal) * 100) : 0;

    const revenueGrowth = metrics?.revenue?.growth || 0;
    const hasAlerts = (metrics?.courtDates?.upcoming || 0) > 0;

    // Prepare donut data from top clients
    const clientDonutData = (topClients || []).slice(0, 6).map((c: any) => ({
        label: c.name,
        value: c.totalRevenue || 0,
    }));

    // Prepare pie data from matter distribution
    const matterPieData = (matterDistribution || []).map((d: any) => ({
        label: d.status,
        value: d.count || 0,
    }));

    // Expense breakdown — currently we only have total/count from metrics.
    // We create a plausible breakdown from what we know.
    const expenseTotal = metrics?.expenses?.total || 0;
    const expenseCount = metrics?.expenses?.count || 0;

    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <PinProtection workspaceId={workspaceId} featureId="analytics" variant="analytics">
                <div className="rm-screen">
                    <div className="rm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Header */}
                        <div className="rm-hdr" style={{ paddingBottom: 0 }}>
                            <div className="rm-hdr-row" style={{ alignItems: 'center' }}>
                                <div>
                                    <span className="rm-eyebrow">Analytics</span>
                                    <h1 className="rm-h1">Performance</h1>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {['this-month', 'this-quarter'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => handleFilterChange(f)}
                                            className="rm-icon-btn"
                                            style={{
                                                width: 'auto',
                                                height: 32,
                                                padding: '0 12px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                background: filter === f ? '#064e3b' : '#fff',
                                                color: filter === f ? '#fff' : '#475569',
                                                borderColor: filter === f ? '#064e3b' : 'var(--rm-border)'
                                            }}
                                        >
                                            {f === 'this-month' ? 'Month' : 'Quarter'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* KPI 1: Revenue Card */}
                        <div className="rm-an-card">
                            <span className="ttl">Total Revenue</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
                                <span className="big" style={{ fontSize: '28px' }}>{formatCurrencyFull(metrics?.revenue?.total || 0)}</span>
                                <span
                                    className="delta"
                                    style={{
                                        color: revenueGrowth >= 0 ? '#065F46' : '#B91C1C',
                                        background: revenueGrowth >= 0 ? '#D1FAE5' : '#FEE2E2',
                                        marginLeft: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 99
                                    }}
                                >
                                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                                </span>
                            </div>
                            <span className="sub">vs last period</span>
                        </div>

                        {/* KPI 2: Active Matters Card */}
                        <div className="rm-an-card">
                            <span className="ttl">Active Cases</span>
                            <div className="big" style={{ marginTop: 10, fontSize: '28px' }}>{metrics?.matters?.active || 0}</div>
                            <span className="sub">+{metrics?.matters?.newThisMonth || 0} new this period</span>
                        </div>

                        {/* KPI 3: Client Concentration */}
                        <div className="rm-an-card">
                            <span className="ttl">Client Concentration</span>
                            <div className="big" style={{ marginTop: 10, fontSize: '28px', color: topClientRevPct > 40 ? '#D97706' : undefined }}>
                                {topClientRevPct}%
                            </div>
                            <span className="sub">
                                {topClientRevPct > 40 ? 'High concentration risk' : 'Healthy distribution'}
                            </span>
                        </div>

                        {/* KPI 4: Operating Burn */}
                        <div className="rm-an-card">
                            <span className="ttl">Operating Burn</span>
                            <div className="big" style={{ marginTop: 10, fontSize: '28px', color: '#B91C1C' }}>
                                {formatCurrencyFull(expenseTotal)}
                            </div>
                            <span className="sub">{metrics?.expenses?.count || 0} entries recorded</span>
                        </div>

                        {/* Monthly Trend Area Chart */}
                        <div className="rm-an-card">
                            <span className="ttl">Monthly Revenue Trend</span>
                            <div style={{ marginTop: 16 }}>
                                <AreaChart data={revenueTrend} h={140} color="#059669" />
                            </div>
                        </div>

                        {/* Top Clients Donut Chart */}
                        <div className="rm-an-card">
                            <span className="ttl">Revenue by Client</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                                <Donut
                                    data={(topClients || []).slice(0, 5).map((tc, idx) => ({
                                        value: tc.totalRevenue || 0,
                                        color: CHART_COLORS[idx % CHART_COLORS.length]
                                    }))}
                                    size={96}
                                    thick={12}
                                />
                                <div className="rm-legend" style={{ flex: 1 }}>
                                    {(topClients || []).slice(0, 4).map((tc, idx) => {
                                        const pct = Math.round(((tc.totalRevenue || 0) / topClientTotal) * 100);
                                        return (
                                            <div className="li" key={tc.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="sw" style={{ background: CHART_COLORS[idx % CHART_COLORS.length], width: 10, height: 10, borderRadius: 2 }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100, fontSize: 12 }}>
                                                    {tc.name}
                                                </span>
                                                <span className="vl" style={{ marginLeft: 'auto', fontWeight: 600 }}>{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Court Visits Horizontal Bars */}
                        <div className="rm-an-card">
                            <span className="ttl">Court Appearances</span>
                            <div className="rm-hbar" style={{ marginTop: 16 }}>
                                {heavyLoading ? (
                                    <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8' }}>Loading appearances...</div>
                                ) : courtVisits.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8' }}>No records</div>
                                ) : (
                                    courtVisits.slice(0, 5).map(cv => {
                                        const maxVal = Math.max(...courtVisits.map(c => c.count), 1);
                                        const pct = Math.round((cv.count / maxVal) * 100);
                                        return (
                                            <div className="li" key={cv.court} style={{ marginTop: 12 }}>
                                                <div className="hl" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                    <span className="n" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                                        {cv.court}
                                                    </span>
                                                    <span className="v" style={{ fontWeight: 600 }}>{cv.count}</span>
                                                </div>
                                                <div className="track" style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div className="f" style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10B981, #059669)' }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </PinProtection>
        );
    }

    return (
        <PinProtection workspaceId={workspaceId} featureId="analytics" variant="analytics">
            <div className={styles.page}>

                {/* ── Header ── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1>Analytics</h1>
                        <p>Executive dashboard for measuring and improving insights</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div className={styles.filterGroup} style={{ opacity: isFiltering ? 0.6 : 1, pointerEvents: isFiltering ? 'none' : undefined }}>
                            {[{ key: 'this-month', label: 'This Month' }, { key: 'this-quarter', label: 'This Quarter' }, { key: 'this-year', label: 'This Year' }].map(f => (
                                <button
                                    key={f.key}
                                    className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ''}`}
                                    onClick={() => handleFilterChange(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button className={styles.downloadBtn}>
                            <Download size={14} />
                            Download Report
                        </button>
                    </div>
                </div>

                {/* ── Alert Banner ── */}
                {hasAlerts && (
                    <div className={styles.alertBanner}>
                        <div className={styles.alertContent}>
                            <AlertTriangle size={18} className={styles.alertIcon} />
                            <div>
                                <div className={styles.alertTitle}>⚠ Critical Alerts</div>
                                <div className={styles.alertText}>
                                    {metrics.courtDates.upcoming} upcoming court dates detected — {metrics.courtDates.upcoming} active cases at risk
                                </div>
                            </div>
                        </div>
                        <button className={styles.viewDetailsBtn}>View Details</button>
                    </div>
                )}

                {/* ── KPI Cards ── */}
                <div className={styles.kpiRow} style={{ transition: 'opacity 0.2s', opacity: isFiltering ? 0.5 : 1 }}>
                    {/* Revenue */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiLabel}>Total Revenue</div>
                        <div className={`${styles.kpiValue} ${styles.accent}`}>₦{(animRevenue / 1_000_000).toFixed(1)}M</div>
                        <div className={revenueGrowth >= 0 ? styles.kpiGrowthPositive : styles.kpiGrowthNegative}>
                            {revenueGrowth >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                            {Math.abs(revenueGrowth).toFixed(1)}% from last month
                        </div>
                    </div>

                    {/* Active Matters */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiLabel}>Active Matters</div>
                        <div className={styles.kpiValue}>{animMatters}</div>
                        <div className={styles.kpiSubtext}>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>+{metrics?.matters?.newThisMonth || 0}</span>&nbsp;new this month
                        </div>
                    </div>

                    {/* Client Concentration */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiLabel}>Client Concentration</div>
                        <div className={`${styles.kpiValue} ${topClientRevPct > 40 ? styles.warning : ''}`}>{topClientRevPct}%</div>
                        <div className={styles.kpiSubtext} style={{ color: topClientRevPct > 40 ? '#d97706' : undefined }}>
                            {topClientRevPct > 40 ? 'High concentration risk' : 'Healthy distribution'}
                        </div>
                    </div>

                    {/* Operational Expenses */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiLabel}>Operational Burn</div>
                        <div className={`${styles.kpiValue} ${styles.danger}`}>
                            ₦{(animExpenses / 1_000_000).toFixed(1)}M
                        </div>
                        <div className={styles.kpiSubtext}>
                            {expenseCount} tracked {expenseCount === 1 ? 'expense' : 'expenses'} this period
                        </div>
                    </div>
                </div>

                {/* ── Row 1: Revenue Trend + Revenue by Clients ── */}
                <div className={styles.chartFullRow}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Monthly Revenue Trend</div>
                        </div>
                        <div className={styles.panelBody}>
                            <LineChart data={revenueTrend} />
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Revenue by Top Clients</div>
                        </div>
                        <div className={styles.panelBody}>
                            {heavyLoading
                                ? <div style={{ height: 136, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={20} style={{ animation: 'spin 1s linear infinite', color: '#e2e8f0' }} /></div>
                                : clientDonutData.length > 0
                                    ? <DonutChart data={clientDonutData} colors={CHART_COLORS} />
                                    : <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.8rem' }}>No client revenue data</div>
                            }
                        </div>
                    </div>
                </div>

                {/* ── Row 2: Matter Status Pie + Court Visits Bar ── */}
                <div className={styles.chartRow}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Active Matters Status</div>
                        </div>
                        <div className={styles.panelBody}>
                            {matterPieData.length > 0
                                ? <DonutChart data={matterPieData} colors={CHART_COLORS} />
                                : <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.8rem' }}>No matter data</div>
                            }
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Court Visits This Month</div>
                        </div>
                        <div className={styles.panelBody}>
                            {courtVisits.length > 0
                                ? <HBarChart data={courtVisits.map((cv: any) => ({ label: cv.court, value: cv.count }))} />
                                : <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.8rem' }}>No court visits recorded</div>
                            }
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Expenses Distribution Pie Chart ── */}
                <div style={{ marginBottom: 16 }}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Expense Breakdown by Category</div>
                            <div className={styles.panelSubtitle}>Operating costs distribution across the practice</div>
                        </div>
                        <div className={styles.panelBody}>
                            {(expenseDistribution || []).length > 0 ? (
                                <div className={styles.expenseGrid}>
                                    <div className={styles.expenseChartSide}>
                                        <DonutChart 
                                            data={(expenseDistribution || []).map(e => ({ label: e.category, value: e.amount }))} 
                                            colors={EXPENSE_COLORS} 
                                        />
                                    </div>
                                    <div className={styles.expenseStatsSide}>
                                        <div className={styles.summaryRow} style={{ marginBottom: 20 }}>
                                            <div className={styles.summaryItem}>Total Burn: <strong>{formatCurrencyFull(expenseTotal)}</strong></div>
                                            <div className={styles.summaryItem}>Entries: <strong>{expenseCount}</strong></div>
                                            <div className={styles.summaryItem}>
                                                Revenue Ratio: <strong style={{ color: expenseTotal > (metrics?.revenue?.total || 0) ? '#dc2626' : '#16a34a' }}>
                                                    {metrics?.revenue?.total > 0 ? Math.round((expenseTotal / metrics.revenue.total) * 100) : 0}%
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Progressive Bar: expense vs revenue */}
                                        <div style={{ padding: '0 4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Budget Utilization (vs Revenue)</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: expenseTotal > (metrics?.revenue?.total || 0) ? '#dc2626' : '#64748b' }}>
                                                    {metrics?.revenue?.total > 0 ? Math.round((expenseTotal / metrics.revenue.total) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min((expenseTotal / Math.max(metrics?.revenue?.total || 1, expenseTotal)) * 100, 100)}%`,
                                                    background: expenseTotal > (metrics?.revenue?.total || 0) ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                                                    borderRadius: 99,
                                                    transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                }} />
                                            </div>
                                        </div>

                                        <div className={styles.categoryTableWrap} style={{ marginTop: 20 }}>
                                            <table className={styles.miniTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Category</th>
                                                        <th>Amount</th>
                                                        <th>Count</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(expenseDistribution || []).slice(0, 5).map((e, idx) => (
                                                        <tr key={idx}>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: EXPENSE_COLORS[idx % EXPENSE_COLORS.length] }} />
                                                                    {e.category}
                                                                </div>
                                                            </td>
                                                            <td style={{ fontWeight: 600 }}>{formatCurrencyFull(e.amount)}</td>
                                                            <td style={{ color: '#94a3b8' }}>{e.count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                    <TrendingDown size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                                    <p style={{ fontSize: '0.9rem' }}>No expense data recorded for this period</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Add expenses in the Office Manager to see distribution</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Revenue by Client Table ── */}
                <div style={{ marginBottom: 16 }}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Revenue by Client</div>
                            {heavyLoading && <Loader size={13} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />}
                        </div>
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>Total Revenue</th>
                                        <th>Active Matters</th>
                                        <th>Outstanding</th>
                                        <th>Payment Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClients.length > 0 ? topClients.map((client: any) => (
                                        <tr key={client.name}>
                                            <td className={styles.clientName}>{client.name}</td>
                                            <td className={styles.monoValue}>{formatCurrencyFull(client.totalRevenue)}</td>
                                            <td>{client.activeMatters} {client.activeMatters === 1 ? 'matter' : 'matters'}</td>
                                            <td style={{ color: client.outstanding > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                                                {client.outstanding > 0 ? formatCurrencyFull(client.outstanding) : '—'}
                                            </td>
                                            <td>
                                                <span className={`${styles.statusTag} ${
                                                    client.status === 'PAID' ? styles.statusPaid :
                                                    client.status.includes('PARTLY') ? styles.statusPartly :
                                                    styles.statusUnpaid
                                                }`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No client data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ── Court Appearances by Lawyer Table ── */}
                <div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Court Appearances by Lawyer</div>
                            {heavyLoading && <Loader size={13} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />}
                        </div>
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Lawyer</th>
                                        <th>Appearances</th>
                                        <th>Cases</th>
                                        <th>Primary Court</th>
                                        <th>Courts Visited</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lawyerStats.length > 0 ? lawyerStats.map((lawyer: any, idx: number) => (
                                        <tr key={lawyer.name}>
                                            <td className={styles.clientName}>{lawyer.name}</td>
                                            <td>{lawyer.appearances} {lawyer.appearances === 1 ? 'appearance' : 'appearances'}</td>
                                            <td>{lawyer.cases || '-'} {lawyer.cases === 1 ? 'case' : 'cases'}</td>
                                            <td>{lawyer.topCourt || 'N/A'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {Array.from({ length: Math.min(lawyer.courts || 0, 5) }).map((_, i) => (
                                                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', opacity: 1 - i * 0.15, display: 'inline-block' }} />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No appearance data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </PinProtection>
    );
}
