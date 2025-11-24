"use client";

import { X } from 'lucide-react';
import styles from './ExpenseModal.module.css';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EXPENSE_CATEGORIES = [
    'Office Repairs',
    'Costs of Filing Processes',
    'Transportation to Court (Lawyers)',
    'Entertainment',
    'Local Fees',
    'Staff Salary',
    'Other',
];

const ExpenseModal = ({ isOpen, onClose }: ExpenseModalProps) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add Expense</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select className={styles.select}>
                            <option value="">Select category...</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Amount (₦)</label>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="0.00"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date</label>
                            <input
                                type="date"
                                className={styles.input}
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            className={styles.textarea}
                            rows={3}
                            placeholder="Enter expense details..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Reference (Optional)</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g., REC-2025-001"
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitBtn}>
                            Add Expense
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseModal;
