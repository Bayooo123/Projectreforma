"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Download, ArrowUp, ArrowDown, TrendingDown, Users, Scale, AlertCircle } from 'lucide-react';
import { getAnalyticsMetrics, getRevenueTrend, getTopClients, getLawyerStats, getMatterDistribution, getCourtVisits } from '@/app/actions/analytics';
import { getSession } from 'next-auth/react';
import styles from './page.module.css';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

// Types for our analytic data
interface AnalyticsData {
    metrics: any;
    revenueTrend: { month: string; amount: number }[];
    topClients: any[];
    lawyerStats: any[];
    matterDistribution: { status: string; count: number }[];
    courtVisits: { court: string; count: number }[];
}

import { PinProtection } from '@/components/auth/PinProtection';

export default function AnalyticsPage() {
    const [filter, setFilter] = useState<'this-month' | 'last-month' | 'this-quarter'>('this-month');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Get workspace ID from session
                const session = await getSession();
                const sessionWorkspaceId = session?.user?.workspaceId; // Adjust based on your AuthJS session structure

                if (!sessionWorkspaceId) {
                    console.error("No workspace ID found");
                    return;
                }

                setWorkspaceId(sessionWorkspaceId);

                // Fetch all data in parallel
                const [metrics, revenueTrend, topClients, lawyerStats, matterDistribution, courtVisits] = await Promise.all([
                    getAnalyticsMetrics(sessionWorkspaceId),
                    getRevenueTrend(sessionWorkspaceId),
                    getTopClients(sessionWorkspaceId),
                    getLawyerStats(sessionWorkspaceId),
                    getMatterDistribution(sessionWorkspaceId),
                    getCourtVisits(sessionWorkspaceId)
                ]);

                setData({
                    metrics,
                    revenueTrend,
                    topClients,
                    lawyerStats,
                    matterDistribution,
                    courtVisits
                });

            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [filter]); // In a real implementation we'd pass filter to the actions

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    if (isLoading || !data || !workspaceId) {
        return <LoadingIndicator message="Gathering insights..." />;
    }

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
            title="Analytics Access Restricted"
            description="Enter the admin PIN (0987) to view sensitive financial data."
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
                            <button className={`${styles.filterBtn} ${filter === 'this-month' ? styles.active : ''}`} onClick={() => setFilter('this-month')}>This Month</button>
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
                                {/* Simple line rendering */}
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

