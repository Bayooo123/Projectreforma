"use client";

import { useState, useEffect } from 'react';
import { TrendingDown, Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import ExpensePeriodFilter, { DateRange } from './ExpensePeriodFilter';
import styles from './FinancialLog.module.css';

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    date: string;
    reference?: string;
}

interface FinancialLogProps {
    workspaceId: string;
    initialExpenses: Expense[];
    initialSummaries: any[];
    userRole: string;
    isOwner: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    'OFFICE_UTILITIES': 'Office Utilities',
    'OFFICE_EQUIPMENT_MAINTENANCE': 'Office Equipment',
    'COURT_LITIGATION': 'Court & Litigation',
    'NON_LITIGATION_ADVISORY': 'Advisory & Non-Litigation',
    'COMMUNICATION_SUBSCRIPTIONS': 'Communication',
    'STAFF_COSTS': 'Staff Costs',
    'VEHICLE_LOGISTICS': 'Vehicle & Logistics',
    'MISCELLANEOUS': 'Miscellaneous',
};

const FinancialLog = ({ workspaceId, initialExpenses, initialSummaries, userRole, isOwner }: FinancialLogProps) => {
    const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [dailySummaries, setDailySummaries] = useState<any[]>(initialSummaries);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeRange, setActiveRange] = useState<DateRange | null>(null);

    const canManageExpenses = isOwner || ['Managing Partner', 'Partner', 'Practice Manager', 'Head of Chamber'].includes(userRole);

    const fetchExpenses = async (rangeOverride?: DateRange) => {
        setIsLoading(true);
        try {
            const rangeToUse = rangeOverride || activeRange;
            const params: any = { workspaceId: workspaceId };
            
            if (rangeToUse) {
                params.filter = 'date-range';
                params.startDate = rangeToUse.startDate;
                params.endDate = rangeToUse.endDate;
            } else {
                params.filter = 'this-month';
            }
            
            const queryParams = new URLSearchParams(params);
            const response = await fetch(`/api/expenses?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setExpenses(data.data.expenses);

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

    const handleExpenseAdded = () => {
        fetchExpenses();
        setExpenseToEdit(null);
    };

    const handleEditExpense = (expense: Expense) => {
        setExpenseToEdit(expense);
        setIsExpenseModalOpen(true);
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/expenses?id=${id}&workspaceId=${workspaceId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchExpenses();
            } else {
                alert('Failed to delete expense');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting expense');
        }
    };

    const handleRangeChange = (range: DateRange) => {
        setActiveRange(range);
        fetchExpenses(range);
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
    const totalDayExpenses = displayedExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        {viewMode === 'summary' ? (activeRange ? `Expense Log (${activeRange.label})` : 'Expense Log') : formatDisplayDate(selectedDate!)}
                    </h2>
                    <p className={styles.subtitle}>
                        {viewMode === 'summary' ? 'Daily breakdown' : 'Detailed transactions'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {viewMode === 'summary' && (
                        <ExpensePeriodFilter onChange={handleRangeChange} />
                    )}
                    {viewMode === 'detail' && (
                        <button className={styles.secondaryBtn} onClick={handleBackToSummary}>
                            <ArrowLeft size={16} />
                            Back to Summary
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => { setExpenseToEdit(null); setIsExpenseModalOpen(true); }}>
                        <Plus size={16} />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            <div className={styles.summary}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <p className={styles.summaryLabel}>
                            {viewMode === 'summary' ? 'Total for Period' : 'Total for this Day'}
                        </p>
                        <p className={styles.summaryValue}>
                            {formatCurrency(viewMode === 'summary' ? totalPeriodExpenses : totalDayExpenses)}
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.contentArea}>
                {isLoading ? (
                    <div className={styles.loading}>Loading data...</div>
                ) : viewMode === 'summary' ? (
                    // Summary View (List of Days)
                    dailySummaries.length === 0 ? (
                        <div className={styles.empty}>No expenses recorded for this period</div>
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
                                        <p className={styles.transactionDesc}>{expense.description || <em>No description</em>}</p>
                                        <div className={styles.transactionMeta}>
                                            <span className={styles.category}>{CATEGORY_LABELS[expense.category] || expense.category}</span>
                                            {expense.reference && (
                                                <>
                                                    <span>•</span>
                                                    <span className={styles.reference}>{expense.reference}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.transactionRight}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <p className={`${styles.amount} ${styles.expense}`}>
                                                    -{formatCurrency(expense.amount)}
                                                </p>
                                                <p className={styles.time}>{formatTime(expense.date)}</p>
                                            </div>
                                            {canManageExpenses && (
                                                <div className={styles.rowActions}>
                                                    <button 
                                                        className={styles.iconBtn} 
                                                        onClick={(e) => { e.stopPropagation(); handleEditExpense(expense); }}
                                                        title="Edit expense"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        className={styles.iconBtn} 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id); }}
                                                        title="Delete expense"
                                                        style={{ color: 'var(--danger)' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }}
                onSuccess={handleExpenseAdded}
                workspaceId={workspaceId}
                expenseToEdit={expenseToEdit}
            />
        </div>
    );
};


export default FinancialLog;

