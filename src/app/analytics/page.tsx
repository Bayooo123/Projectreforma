"use client";

import { AlertTriangle, Download, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './page.module.css';

export default function AnalyticsPage() {
    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Analytics</h1>
                    <p className={styles.subtitle}>Executive dashboard for managing partner insights</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.dateFilters}>
                        <button className={`${styles.filterBtn} ${styles.active}`}>This Month</button>
                        <button className={styles.filterBtn}>This Quarter</button>
                        <button className={styles.filterBtn}>This Year</button>
                    </div>
                    <button className={styles.downloadBtn}>
                        <Download size={16} />
                        <span>Download Report</span>
                    </button>
                </div>
            </div>

            {/* Critical Alerts Banner */}
            <div className={styles.alertBanner}>
                <div className={styles.alertContent}>
                    <AlertTriangle size={20} className={styles.alertIcon} />
                    <div className={styles.alertText}>
                        <strong>CRITICAL ALERTS</strong>
                        <span>3 overdue payments | ₦2.5M outstanding | 5 active cases at risk</span>
                    </div>
                </div>
                <button className={styles.viewDetailsBtn}>View Details</button>
            </div>

            {/* Metrics Row */}
            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricLabel}>TOTAL REVENUE</h3>
                    <div className={styles.metricValue}>₦18.3M</div>
                    <div className={`${styles.metricChange} ${styles.up}`}>
                        <ArrowUp size={12} /> 12% from last month
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricLabel}>ACTIVE MATTERS</h3>
                    <div className={styles.metricValue}>47</div>
                    <div className={`${styles.metricChange} ${styles.up}`}>
                        5 new this month
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricLabel}>TOP 3 CLIENTS</h3>
                    <div className={styles.metricValue}>45%</div>
                    <div className={`${styles.metricChange} ${styles.down}`}>
                        High concentration risk
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <h3 className={styles.metricLabel}>PENDING COURT DATES</h3>
                    <div className={styles.metricValue}>12</div>
                    <div className={`${styles.metricChange} ${styles.neutral}`}>
                        Next week: 3 appearances
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Monthly Revenue Trend</h3>
                    <div className={styles.chartPlaceholder}>
                        {/* Mock Line Chart Visualization */}
                        <div className={styles.lineChart}>
                            <svg viewBox="0 0 300 100" className={styles.chartSvg}>
                                <path d="M0,80 Q50,20 100,60 T200,40 T300,10" fill="none" stroke="#C53030" strokeWidth="3" />
                                <circle cx="0" cy="80" r="4" fill="#C53030" />
                                <circle cx="100" cy="60" r="4" fill="#C53030" />
                                <circle cx="200" cy="40" r="4" fill="#C53030" />
                                <circle cx="300" cy="10" r="4" fill="#C53030" />
                            </svg>
                        </div>
                        <div className={styles.chartLabels}>
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        </div>
                    </div>
                </div>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Revenue by Top Clients</h3>
                    <div className={styles.donutChartContainer}>
                        <div className={styles.donutChart}></div>
                        <div className={styles.legend}>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#9B2C2C' }}></span> Shell (13%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#E53E3E' }}></span> Zenith (17%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#F56565' }}></span> MTN (10%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#FC8181' }}></span> Dangote (24%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#E2E8F0' }}></span> Others (36%)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Active Matters Status</h3>
                    <div className={styles.pieChartContainer}>
                        <div className={styles.pieChart}></div>
                        <div className={styles.legend}>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#9B2C2C' }}></span> Active-Trial (18)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#F56565' }}></span> Active-Mention (15)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#FC8181' }}></span> Pending (10)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#E2E8F0' }}></span> Closed (4)</div>
                        </div>
                    </div>
                </div>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Court Visits This Month</h3>
                    <div className={styles.barChartContainer}>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>High Court Lagos</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '90%' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Federal High Court</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '70%' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Probate Registry</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '50%' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Lagos State HC</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '30%' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Magistrate Court</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '20%' }}></div></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Revenue by Client</h3>
                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <td>Shell Petroleum Development</td>
                                <td className={styles.amount}>₦2,400,000</td>
                                <td>4 matters</td>
                                <td>₦1,600,000</td>
                                <td><span className={`${styles.status} ${styles.partly}`}>● PARTLY PAID</span></td>
                            </tr>
                            <tr>
                                <td>Zenith Bank PLC</td>
                                <td className={styles.amount}>₦3,200,000</td>
                                <td>6 matters</td>
                                <td>₦3,200,000</td>
                                <td><span className={`${styles.status} ${styles.paid}`}>● PAID</span></td>
                            </tr>
                            <tr>
                                <td>MTN Nigeria Communications</td>
                                <td className={styles.amount}>₦1,800,000</td>
                                <td>5 matters</td>
                                <td>₦900,000</td>
                                <td><span className={`${styles.status} ${styles.partly}`}>● PARTLY PAID</span></td>
                            </tr>
                            <tr>
                                <td>Dangote Group</td>
                                <td className={styles.amount}>₦4,500,000</td>
                                <td>8 matters</td>
                                <td>₦0</td>
                                <td><span className={`${styles.status} ${styles.unpaid}`}>● UNPAID</span></td>
                            </tr>
                            <tr>
                                <td>Access Bank PLC</td>
                                <td className={styles.amount}>₦2,100,000</td>
                                <td>4 matters</td>
                                <td>₦1,050,000</td>
                                <td><span className={`${styles.status} ${styles.partly}`}>● PARTLY PAID</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Court Appearances by Lawyer</h3>
                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <td>Kemi Adeniran</td>
                                <td>12 appearances</td>
                                <td>5 courts</td>
                                <td>High Court Lagos (5x)</td>
                                <td>₦8.2M revenue</td>
                            </tr>
                            <tr>
                                <td>Adebayo Ogundimu</td>
                                <td>10 appearances</td>
                                <td>4 courts</td>
                                <td>Federal High Court (4x)</td>
                                <td>₦6.5M revenue</td>
                            </tr>
                            <tr>
                                <td>Bola Okafor</td>
                                <td>8 appearances</td>
                                <td>3 courts</td>
                                <td>Probate Registry (3x)</td>
                                <td>₦3.6M revenue</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
