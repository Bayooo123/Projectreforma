"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Download, ArrowUp, ArrowDown, TrendingDown } from 'lucide-react';
import ExpenseBreakdownModal from '@/components/analytics/ExpenseBreakdownModal';
import styles from './page.module.css';

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string;
    date: string;
    reference?: string;
}

interface ExpenseData {
    expenses: Expense[];
    aggregations: {
        total: number;
        count: number;
        byCategory: Record<string, number>;
        byDate: Record<string, { total: number; count: number; expenses: Expense[] }>;
    };
}

export default function AnalyticsPage() {
    const [filter, setFilter] = useState<'this-month' | 'last-month' | 'this-quarter'>('this-month');
    const [expenseData, setExpenseData] = useState<ExpenseData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchExpenseData = async () => {
        try {
            const response = await fetch(`/api/expenses?filter=${filter}`);
            const data = await response.json();
            if (data.success) {
                setExpenseData(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch expense data:', error);
        }
    };

    useEffect(() => {
        fetchExpenseData();
    }, [filter]);

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const selectedExpenses = selectedDate && expenseData?.aggregations.byDate[selectedDate]
        ? expenseData.aggregations.byDate[selectedDate].expenses
        : [];

    // Calculate expense metrics
    const thisMonthTotal = expenseData?.aggregations.total || 0;
    const expenseCount = expenseData?.aggregations.count || 0;

    // Get top expense categories
    const topCategories = expenseData?.aggregations.byCategory
        ? Object.entries(expenseData.aggregations.byCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
        : [];

    const totalCategoryAmount = topCategories.reduce((sum, [, amount]) => sum + amount, 0);

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
                        <button
                            className={`${styles.filterBtn} ${filter === 'this-month' ? styles.active : ''}`}
                            onClick={() => setFilter('this-month')}
                        >
                            This Month
                        </button>
                        <button
                            className={`${styles.filterBtn} ${filter === 'last-month' ? styles.active : ''}`}
                            onClick={() => setFilter('last-month')}
                        >
                            Last Month
                        </button>
                        <button
                            className={`${styles.filterBtn} ${filter === 'this-quarter' ? styles.active : ''}`}
                            onClick={() => setFilter('this-quarter')}
                        >
                            This Quarter
                        </button>
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
                    <h3 className={styles.metricLabel}>TOTAL EXPENSES</h3>
                    <div className={styles.metricValue}>{formatCurrency(thisMonthTotal)}</div>
                    <div className={`${styles.metricChange} ${styles.down}`}>
                        <TrendingDown size={12} /> {expenseCount} transactions
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

            {/* Charts Row 1 - Revenue & Expenses */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Monthly Revenue Trend</h3>
                    <div className={styles.chartPlaceholder}>
                        <div className={styles.lineChart}>
                            <svg viewBox="0 0 300 100" className={styles.chartSvg}>
                                <path d="M0,80 Q50,20 100,60 T200,40 T300,10" fill="none" stroke="#2C3E50" strokeWidth="3" />
                                <circle cx="0" cy="80" r="4" fill="#2C3E50" />
                                <circle cx="100" cy="60" r="4" fill="#2C3E50" />
                                <circle cx="200" cy="40" r="4" fill="#2C3E50" />
                                <circle cx="300" cy="10" r="4" fill="#2C3E50" />
                            </svg>
                        </div>
                        <div className={styles.chartLabels}>
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        </div>
                    </div>
                </div>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Expense by Category</h3>
                    <div className={styles.donutChartContainer}>
                        {topCategories.length > 0 ? (
                            <>
                                <div className={styles.donutChart} style={{
                                    background: generateConicGradient(topCategories, totalCategoryAmount)
                                }}></div>
                                <div className={styles.legend}>
                                    {topCategories.map(([category, amount], index) => (
                                        <div key={category} className={styles.legendItem}>
                                            <span className={styles.dot} style={{ background: getCategoryColor(index) }}></span>
                                            {category} ({Math.round((amount / totalCategoryAmount) * 100)}%)
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className={styles.noData}>No expense data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Daily Expense Calendar */}
            <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Daily Expenses - Click to View Breakdown</h3>
                <div className={styles.expenseCalendar}>
                    {expenseData && Object.entries(expenseData.aggregations.byDate).length > 0 ? (
                        Object.entries(expenseData.aggregations.byDate)
                            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                            .map(([date, data]) => (
                                <div
                                    key={date}
                                    className={styles.expenseDay}
                                    onClick={() => handleDateClick(date)}
                                >
                                    <div className={styles.expenseDayDate}>
                                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className={styles.expenseDayAmount}>
                                        {formatCurrency(data.total)}
                                    </div>
                                    <div className={styles.expenseDayCount}>
                                        {data.count} {data.count === 1 ? 'expense' : 'expenses'}
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className={styles.noData}>No expenses recorded for this period</div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Active Matters Status</h3>
                    <div className={styles.pieChartContainer}>
                        <div className={styles.pieChart} style={{ background: 'conic-gradient(#2C3E50 0% 38%, #10B981 38% 70%, #F59E0B 70% 91%, #E2E8F0 91% 100%)' }}></div>
                        <div className={styles.legend}>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#2C3E50' }}></span> Active-Trial (18)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#10B981' }}></span> Active-Mention (15)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#F59E0B' }}></span> Pending (10)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#E2E8F0' }}></span> Closed (4)</div>
                        </div>
                    </div>
                </div>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Matters by Practice Area</h3>
                    <div className={styles.donutChartContainer}>
                        <div className={styles.donutChart} style={{ background: 'conic-gradient(#2C3E50 0% 40%, #34495E 40% 65%, #10B981 65% 85%, #64748B 85% 100%)' }}></div>
                        <div className={styles.legend}>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#2C3E50' }}></span> Litigation (40%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#34495E' }}></span> Corporate (25%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#10B981' }}></span> Property (20%)</div>
                            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#64748B' }}></span> IP (15%)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 3 */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Court Visits This Month</h3>
                    <div className={styles.barChartContainer}>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>High Court Lagos</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '90%', background: '#2C3E50' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Federal High Court</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '70%', background: '#34495E' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Probate Registry</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '50%', background: '#10B981' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Lagos State HC</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '30%', background: '#64748B' }}></div></div>
                        </div>
                        <div className={styles.barRow}>
                            <span className={styles.barLabel}>Magistrate Court</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '20%', background: '#94A3B8' }}></div></div>
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

            <ExpenseBreakdownModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                date={selectedDate || ''}
                expenses={selectedExpenses}
            />
        </div>
    );
}

// Helper functions
function getCategoryColor(index: number): string {
    const colors = ['#2C3E50', '#34495E', '#10B981', '#64748B', '#94A3B8'];
    return colors[index % colors.length];
}

function generateConicGradient(categories: [string, number][], total: number): string {
    let currentPercent = 0;
    const gradientParts = categories.map(([, amount], index) => {
        const percent = (amount / total) * 100;
        const start = currentPercent;
        currentPercent += percent;
        return `${getCategoryColor(index)} ${start}% ${currentPercent}%`;
    });
    return `conic-gradient(${gradientParts.join(', ')})`;
}
