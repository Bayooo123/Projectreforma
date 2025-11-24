"use client";

import { useState } from 'react';
import { TrendingDown, Plus } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import styles from './FinancialLog.module.css';

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string;
    date: Date;
    reference?: string;
}

const MOCK_EXPENSES: Expense[] = [
    { id: '1', category: 'Staff Salary', amount: 350000, description: 'Monthly salary - November', date: new Date('2025-11-24T10:30'), reference: 'SAL-NOV-2025' },
    { id: '2', category: 'Office Repairs', amount: 45000, description: 'Air conditioning repair', date: new Date('2025-11-24T11:00') },
    { id: '3', category: 'Costs of Filing Processes', amount: 25000, description: 'Court filing fees - 3 cases', date: new Date('2025-11-24T15:30') },
    { id: '4', category: 'Transportation to Court (Lawyers)', amount: 15000, description: 'Court appearance - Ikeja High Court', date: new Date('2025-11-24T16:00') },
    { id: '5', category: 'Entertainment', amount: 50000, description: 'Client lunch meeting', date: new Date('2025-11-23T14:00') },
    { id: '6', category: 'Local Fees', amount: 8000, description: 'Administrative fees', date: new Date('2025-11-22T09:00') },
];

const FinancialLog = () => {
    const [expenses] = useState<Expense[]>(MOCK_EXPENSES);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString()}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Daily Expense Log</h2>
                    <p className={styles.subtitle}>Administrative & operational expenses</p>
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
                {expenses.map((expense) => (
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
                ))}
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
            />
        </div>
    );
};

export default FinancialLog;
