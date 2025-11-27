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

const FinancialLog = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchExpenses = async () => {
        try {
            const response = await fetch('/api/expenses?filter=today');
            const data = await response.json();

            if (data.success) {
                setExpenses(data.data.expenses);
            }
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleExpenseAdded = () => {
        fetchExpenses(); // Refresh the list
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
                    <div className={styles.loading}>Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <div className={styles.empty}>No expenses recorded today</div>
                ) : (
                    expenses.map((expense) => (
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

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={handleExpenseAdded}
            />
        </div>
    );
};

export default FinancialLog;
