"use client";

import { useState } from 'react';
import { AlertTriangle, ArrowUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { PinProtection } from '@/components/auth/PinProtection';

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

export default function AnalyticsClient({ data, workspaceId, initialFilter }: AnalyticsClientProps) {
    const [filter, setFilter] = useState(initialFilter);
    const router = useRouter();

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        // This will trigger a server-side re-fetch in the Page component
        router.push(`/analytics?filter=${newFilter}`);
    };

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const { metrics, revenueTrend, topClients, lawyerStats, matterDistribution, courtVisits } = data;

    // Chart helpers
    const maxRevenue = Math.max(...revenueTrend.map((d: any) => d.amount), 1);

    // Pie chart colors
    const pieColors = ['#2C3E50', '#10B981', '#F59E0B', '#E2E8F0', '#EF4444'];
    const totalMatters = matterDistribution.reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;
    const matterGradient = matterDistribution.length > 0
        ? `conic-gradient(${matterDistribution.map((d: any, i: number) => {
            const start = matterDistribution.slice(0, i).reduce((sum: number, prev: any) => sum + prev.count, 0) / totalMatters * 100;
            const end = start + (d.count / totalMatters * 100);
            return `${pieColors[i % pieColors.length]} ${start}% ${end}%`;
        }).join(', ')})`
        : 'conic-gradient(#E2E8F0 100% 100%)';

    return (
        <PinProtection
            workspaceId={workspaceId}
            featureId="analytics"
            variant="analytics"
        >
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Analytics</h1>
                        <p className={styles.subtitle}>Executive dashboard for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className={styles.actions}>
                        <div className={styles.dateFilters}>
                            <button
                                className={`${styles.filterBtn} ${filter === 'this-month' ? styles.active : ''}`}
                                onClick={() => handleFilterChange('this-month')}
                            >
                                This Month
                            </button>
                        </div>
                    </div>
                </div>

                {/* Critical Alerts Banner */}
                <div className={styles.alertBanner}>
                    <div className={styles.alertContent}>
                        <AlertTriangle size={20} className={styles.alertIcon} />
                        <div className={styles.alertText}>
                            <strong>OPERATIONAL INSIGHTS</strong>
                            <span>{metrics?.courtDates?.upcoming || 0} court dates next week | ₦{((metrics?.revenue?.growth || 0).toFixed(1))}% revenue growth</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className={styles.metricsGrid}>
                    {/* Revenue */}
                    <div className={styles.metricCard}>
                        <h3 className={styles.metricLabel}>TOTAL REVENUE</h3>
                        <div className={styles.metricValue}>{formatCurrency(metrics?.revenue?.total || 0)}</div>
                        <div className={`${styles.metricChange} ${metrics?.revenue?.growth >= 0 ? styles.up : styles.down}`}>
                            {metrics?.revenue?.growth >= 0 ? <ArrowUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(metrics?.revenue?.growth || 0).toFixed(1)}% vs last month
                        </div>
                    </div>

                    {/* Active Matters */}
                    <div className={styles.metricCard}>
                        <h3 className={styles.metricLabel}>ACTIVE MATTERS</h3>
                        <div className={styles.metricValue}>{metrics?.matters?.active || 0}</div>
                        <div className={`${styles.metricChange} ${styles.up}`}>
                            {metrics?.matters?.newThisMonth || 0} new this month
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className={styles.metricCard}>
                        <h3 className={styles.metricLabel}>TOTAL EXPENSES</h3>
                        <div className={styles.metricValue}>{formatCurrency(metrics?.expenses?.total || 0)}</div>
                        <div className={`${styles.metricChange} ${styles.neutral}`}>
                            <TrendingDown size={12} /> {metrics?.expenses?.count || 0} entries
                        </div>
                    </div>

                    {/* Court Dates */}
                    <div className={styles.metricCard}>
                        <h3 className={styles.metricLabel}>NEXT 7 DAYS</h3>
                        <div className={styles.metricValue}>{metrics?.courtDates?.upcoming || 0}</div>
                        <div className={`${styles.metricChange} ${styles.neutral}`}>
                            Court Appearances
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className={styles.chartsGrid}>
                    {/* Revenue Trend */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Revenue Trend (6 Months)</h3>
                        <div className={styles.chartPlaceholder}>
                            <div className={styles.lineChart}>
                                <svg viewBox="0 0 300 100" className={styles.chartSvg}>
                                    <polyline
                                        fill="none"
                                        stroke="#2C3E50"
                                        strokeWidth="3"
                                        points={revenueTrend.map((d: any, i: number) => {
                                            const x = (i / (revenueTrend.length - 1)) * 300;
                                            const y = 100 - (d.amount / maxRevenue) * 80;
                                            return `${x},${y}`;
                                        }).join(' ')}
                                    />
                                    {revenueTrend.map((d: any, i: number) => {
                                        const x = (i / (revenueTrend.length - 1)) * 300;
                                        const y = 100 - (d.amount / maxRevenue) * 80;
                                        return (
                                            <circle key={i} cx={x} cy={y} r="4" fill="#2C3E50">
                                                <title>₦{d.amount}</title>
                                            </circle>
                                        );
                                    })}
                                </svg>
                            </div>
                            <div className={styles.chartLabels}>
                                {revenueTrend.map((d: any) => <span key={d.month}>{d.month}</span>)}
                            </div>
                        </div>
                    </div>

                    {/* Matter Distribution */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Case Status Distribution</h3>
                        <div className={styles.pieChartContainer}>
                            <div className={styles.pieChart} style={{ background: matterGradient }}></div>
                            <div className={styles.legend}>
                                {matterDistribution.map((d: any, i: number) => (
                                    <div key={d.status} className={styles.legendItem}>
                                        <span className={styles.dot} style={{ background: pieColors[i % pieColors.length] }}></span>
                                        {d.status} ({d.count})
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Tables */}
                <div className={styles.chartsGrid}>
                    {/* Top Clients */}
                    <div className={styles.chartCard} style={{ flex: 1 }}>
                        <h3 className={styles.chartTitle}>Top Clients by Revenue</h3>
                        <table className={styles.table} style={{ marginTop: '1rem', width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: '#666', borderBottom: '1px solid #eee' }}>
                                    <th style={{ paddingBottom: '8px' }}>Client</th>
                                    <th style={{ paddingBottom: '8px' }}>Revenue</th>
                                    <th style={{ paddingBottom: '8px' }}>Outstanding</th>
                                    <th style={{ paddingBottom: '8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topClients.map((client: any) => (
                                    <tr key={client.name}>
                                        <td style={{ padding: '12px 0' }}>{client.name}</td>
                                        <td className={styles.amount}>{formatCurrency(client.totalRevenue)}</td>
                                        <td>{formatCurrency(client.outstanding)}</td>
                                        <td>
                                            <span className={`${styles.status} ${styles[client.status.toLowerCase().includes('partly') ? 'partly' : client.status.toLowerCase()]}`}>
                                                ● {client.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {topClients.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No client data available</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Lawyer Performance */}
                    <div className={styles.chartCard} style={{ flex: 1 }}>
                        <h3 className={styles.chartTitle}>Lawyer Activity</h3>
                        <table className={styles.table} style={{ marginTop: '1rem', width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: '#666', borderBottom: '1px solid #eee' }}>
                                    <th style={{ paddingBottom: '8px' }}>Lawyer</th>
                                    <th style={{ paddingBottom: '8px' }}>Appearances</th>
                                    <th style={{ paddingBottom: '8px' }}>Courts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lawyerStats.map((lawyer: any) => (
                                    <tr key={lawyer.name}>
                                        <td style={{ padding: '12px 0' }}>{lawyer.name}</td>
                                        <td>{lawyer.appearances} appearances</td>
                                        <td>{lawyer.courts} courts</td>
                                    </tr>
                                ))}
                                {lawyerStats.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>No lawyer activity recorded</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Court Visits */}
                <div className={styles.chartsGrid}>
                    <div className={styles.chartCard} style={{ width: '100%' }}>
                        <h3 className={styles.chartTitle}>Most Visited Courts</h3>
                        <div className={styles.barChartContainer} style={{ marginTop: '1rem' }}>
                            {courtVisits.map((cv: any, index: number) => (
                                <div key={cv.court} className={styles.barRow}>
                                    <span className={styles.barLabel} style={{ width: '200px' }}>{cv.court}</span>
                                    <div className={styles.barTrack} style={{ flex: 1 }}>
                                        <div className={styles.barFill} style={{
                                            width: `${Math.min((cv.count / (courtVisits[0]?.count || 1)) * 100, 100)}%`,
                                            background: '#2C3E50'
                                        }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', marginLeft: '10px' }}>{cv.count} visits</span>
                                </div>
                            ))}
                            {courtVisits.length === 0 && <div style={{ textAlign: 'center', color: '#666' }}>No court visits recorded this month</div>}
                        </div>
                    </div>
                </div>

            </div>
        </PinProtection>
    );
}
