"use client";

import { X } from 'lucide-react';
import styles from './ExpenseBreakdownModal.module.css';

interface Expense {
    id: string;
    category: string;
    amount: number | string;
    description: string;
    date: string;
    reference?: string;
}

interface ExpenseBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    expenses: Expense[];
}

const ExpenseBreakdownModal = ({ isOpen, onClose, date, expenses }: ExpenseBreakdownModalProps) => {
    if (!isOpen) return null;

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const total = expenses.reduce((sum, e) => {
        const amt = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
        return sum + (amt || 0);
    }, 0);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Expense Breakdown</h2>
                        <p className={styles.subtitle}>{formatDate(date)}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.summary}>
                        <span className={styles.summaryLabel}>Total Expenses</span>
                        <span className={styles.summaryValue}>{formatCurrency(total)}</span>
                    </div>

                    <div className={styles.expenseList}>
                        {expenses.map((expense) => (
                            <div key={expense.id} className={styles.expenseItem}>
                                <div className={styles.expenseInfo}>
                                    <p className={styles.expenseDesc}>{expense.description}</p>
                                    <div className={styles.expenseMeta}>
                                        <span className={styles.category}>{expense.category}</span>
                                        {expense.reference && (
                                            <>
                                                <span>•</span>
                                                <span className={styles.reference}>{expense.reference}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.expenseAmount}>
                                    {formatCurrency(expense.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseBreakdownModal;
