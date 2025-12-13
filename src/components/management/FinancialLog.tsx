"use client";

import { useState, useEffect } from 'react';
import { TrendingDown, Plus } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import styles from './FinancialLog.module.css';

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string;
    date: string;
    reference?: string;
}

interface FinancialLogProps {
    workspaceId?: string;
}

const FinancialLog = ({ workspaceId }: FinancialLogProps) => {
    const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dailySummaries, setDailySummaries] = useState<any[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            // Fetch this month's expenses by default to build the summary
            const queryParams = new URLSearchParams({
                filter: 'this-month', // Broaden scope to see trends
                ...(workspaceId && { workspaceId }),
            });
            const response = await fetch(`/api/expenses?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setExpenses(data.data.expenses);

                // Process aggregations for daily summary
                const byDate = data.data.aggregations.byDate;
                const summaries = Object.keys(byDate).sort().reverse().map(dateKey => ({
                    date: dateKey,
                    total: byDate[dateKey].total,
                    count: byDate[dateKey].count
                }));
                setDailySummaries(summaries);
            }
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchExpenses();
        }
    }, [workspaceId]);

    const handleExpenseAdded = () => {
        fetchExpenses();
        // Create a fake event object or just pass a callback if needed, but fetchExpenses reloads everything
    };

    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        setViewMode('detail');
    };

    const handleBackToSummary = () => {
        setSelectedDate(null);
        setViewMode('summary');
    };

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDisplayDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (!workspaceId) {
        return <div className={styles.loading}>Loading workspace configuration...</div>;
    }

    // Filter expenses if in detail mode
    const displayedExpenses = selectedDate
        ? expenses.filter(e => e.date.startsWith(selectedDate))
        : [];

    const totalPeriodExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        {viewMode === 'summary' ? 'Expense Log (This Month)' : formatDisplayDate(selectedDate!)}
                    </h2>
                    <p className={styles.subtitle}>
                        {viewMode === 'summary' ? 'Daily breakdown' : 'Detailed transactions'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {viewMode === 'detail' && (
                        <button className={styles.secondaryBtn} onClick={handleBackToSummary}>
                            ← Back to Summary
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => setIsExpenseModalOpen(true)}>
                        <Plus size={16} />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            {viewMode === 'summary' && (
                <div className={styles.summary}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon} style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className={styles.summaryLabel}>Total This Month</p>
                            <p className={styles.summaryValue}>{formatCurrency(totalPeriodExpenses)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.contentArea}>
                {isLoading ? (
                    <div className={styles.loading}>Loading data...</div>
                ) : viewMode === 'summary' ? (
                    // Summary View (List of Days)
                    dailySummaries.length === 0 ? (
                        <div className={styles.empty}>No expenses recorded this month</div>
                    ) : (
                        <div className={styles.transactions}>
                            {dailySummaries.map((day) => (
                                <div
                                    key={day.date}
                                    className={styles.transaction}
                                    onClick={() => handleDateClick(day.date)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.transactionIcon}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                            {new Date(day.date).getDate()}
                                        </div>
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <p className={styles.transactionDesc}>{formatDisplayDate(day.date)}</p>
                                        <div className={styles.transactionMeta}>
                                            <span>{day.count} transaction{day.count !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <div className={styles.transactionRight}>
                                        <p className={`${styles.amount} ${styles.expense}`}>
                                            -{formatCurrency(day.total)}
                                        </p>
                                        <p className={styles.time}>View Details →</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    // Detail View (List of Transactions for selected date)
                    <div className={styles.transactions}>
                        {displayedExpenses.length === 0 ? (
                            <div className={styles.empty}>No expenses for this date</div>
                        ) : (
                            displayedExpenses.map((expense) => (
                                <div key={expense.id} className={styles.transaction}>
                                    <div className={styles.transactionIcon}>
                                        <TrendingDown size={16} className={styles.expenseIcon} />
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <p className={styles.transactionDesc}>{expense.description}</p>
                                        <div className={styles.transactionMeta}>
                                            <span className={styles.category}>{expense.category}</span>
                                            {expense.reference && (
                                                <>
                                                    <span>•</span>
                                                    <span className={styles.reference}>{expense.reference}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.transactionRight}>
                                        <p className={`${styles.amount} ${styles.expense}`}>
                                            -{formatCurrency(expense.amount)}
                                        </p>
                                        <p className={styles.time}>{formatTime(expense.date)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={handleExpenseAdded}
                workspaceId={workspaceId}
            />
        </div>
    );
};

export default FinancialLog;
