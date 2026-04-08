"use client";

import { useState } from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, Download, Users, Briefcase, Calendar, DollarSign, TrendingDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PinProtection } from '@/components/auth/PinProtection';
import { useCountUp } from '@/hooks/useCountUp';
import styles from './Analytics.module.css';

interface AnalyticsData {
    metrics: any;
    revenueTrend: { month: string; amount: number }[];
    topClients: any[];
    lawyerStats: any[];
    matterDistribution: { status: string; count: number }[];
    courtVisits: { court: string; count: number }[];
}

interface AnalyticsClientProps {
    data: AnalyticsData;
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
export default function AnalyticsClient({ data, workspaceId, initialFilter }: AnalyticsClientProps) {
    const [filter, setFilter] = useState(initialFilter);
    const router = useRouter();

    const handleFilterChange = (f: string) => {
        setFilter(f);
        router.push(`/analytics?filter=${f}`);
    };

    const { metrics, revenueTrend, topClients, lawyerStats, matterDistribution, courtVisits } = data;

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
                        <div className={styles.filterGroup}>
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
                <div className={styles.kpiRow}>
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
                            {clientDonutData.length > 0
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

                {/* ── Row 3: Expenses Panel ── */}
                <div style={{ marginBottom: 16 }}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>Operational Expenses</div>
                            <div className={styles.panelSubtitle}>Period operating costs — {expenseCount} total entries recorded</div>
                        </div>
                        <div className={styles.panelBody}>
                            {expenseTotal > 0 ? (
                                <>
                                    <div className={styles.summaryRow} style={{ marginBottom: 20 }}>
                                        <div className={styles.summaryItem}>Total Burn: <strong>{formatCurrencyFull(expenseTotal)}</strong></div>
                                        <div className={styles.summaryItem}>Entries: <strong>{expenseCount}</strong></div>
                                        <div className={styles.summaryItem}>Avg per Entry: <strong>{formatCurrency(expenseCount > 0 ? expenseTotal / expenseCount : 0)}</strong></div>
                                        <div className={styles.summaryItem}>
                                            Revenue Ratio: <strong style={{ color: expenseTotal > (metrics?.revenue?.total || 0) ? '#dc2626' : '#16a34a' }}>
                                                {metrics?.revenue?.total > 0 ? Math.round((expenseTotal / metrics.revenue.total) * 100) : 0}%
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Visual: single aggregate bar showing expense vs revenue */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Expenses vs Revenue</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>
                                                {formatCurrencyFull(expenseTotal)} / {formatCurrencyFull(metrics?.revenue?.total || 0)}
                                            </span>
                                        </div>
                                        <div style={{ height: 12, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.min((expenseTotal / Math.max(metrics?.revenue?.total || 1, expenseTotal)) * 100, 100)}%`,
                                                background: expenseTotal > (metrics?.revenue?.total || 0) ? '#dc2626' : '#f87171',
                                                borderRadius: 99,
                                                transition: 'width 1s ease',
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 600 }}>■ Expenses</span>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Revenue →</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    No expense data recorded for this period
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
                                            <td>{lawyer.appearances} appearances</td>
                                            <td>{lawyer.courts || '-'} courts</td>
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
