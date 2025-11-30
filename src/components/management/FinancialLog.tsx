"use client";

import { useState, useEffect } from 'react';
import { TrendingDown, Plus } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import styles from './FinancialLog.module.css';

interface FinancialEntry {
    id: string;
    type: 'expense' | 'income';
    category: string;
    amount: number;
    description: string;
    date: string;
    reference?: string;
    status?: string;
}

const FinancialLog = () => {
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/financials');
            if (response.ok) {
                const data = await response.json();
                setEntries(data);
            }
        } catch (error) {
            console.error('Failed to fetch financials:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const handleExpenseAdded = () => {
        fetchEntries(); // Refresh the list
    };

    const totalExpenses = entries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);

    const formatCurrency = (amount: number) => {
        // Amount is in kobo, convert to naira
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = () => {
        const today = new Date();
        return today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Daily Expense Log</h2>
                    <p className={styles.subtitle}>{formatDate()}</p>
                </div>
                <button className={styles.addBtn} onClick={() => setIsExpenseModalOpen(true)}>
                    <Plus size={16} />
                    <span>Add Expense</span>
                </button>
            </div>

            <div className={styles.summary}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <p className={styles.summaryLabel}>Total Expenses Today</p>
                        <p className={styles.summaryValue}>{formatCurrency(totalExpenses)}</p>
                    </div>
                </div>
            </div>

            <div className={styles.transactions}>
                {isLoading ? (
                    <div className={styles.loading}>Loading financials...</div>
                ) : entries.length === 0 ? (
                    <div className={styles.empty}>No transactions recorded</div>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className={styles.transaction}>
                            <div className={styles.transactionIcon}>
                                <TrendingDown
                                    size={16}
                                    className={entry.type === 'expense' ? styles.expenseIcon : styles.incomeIcon}
                                    style={{ transform: entry.type === 'income' ? 'rotate(180deg)' : 'none', color: entry.type === 'income' ? '#16a34a' : undefined }}
                                />
                            </div>
                            <div className={styles.transactionInfo}>
                                <p className={styles.transactionDesc}>{entry.description}</p>
                                <div className={styles.transactionMeta}>
                                    <span className={styles.category}>{entry.category}</span>
                                    {entry.reference && (
                                        <>
                                            <span>•</span>
                                            <span className={styles.reference}>{entry.reference}</span>
                                        </>
                                    )}
                                    {entry.status && (
                                        <>
                                            <span>•</span>
                                            <span className={styles.status}>{entry.status}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles.transactionRight}>
                                <p className={`${styles.amount} ${entry.type === 'expense' ? styles.expense : styles.income}`}
                                    style={{ color: entry.type === 'income' ? '#16a34a' : undefined }}>
                                    {entry.type === 'expense' ? '-' : '+'}{formatCurrency(entry.amount)}
                                </p>
                                <p className={styles.time}>{formatTime(entry.date)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={handleExpenseAdded}
            />
        </div>
    );
};

export default FinancialLog;
