"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import styles from './ExpenseModal.module.css';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
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

const ExpenseModal = ({ isOpen, onClose, onSuccess }: ExpenseModalProps) => {
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!category || !amount || !description) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category,
                    amount: parseFloat(amount),
                    description,
                    date,
                    reference: reference || null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Reset form
                setCategory('');
                setAmount('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                setReference('');

                // Call success callback
                if (onSuccess) onSuccess();

                // Close modal
                onClose();
            } else {
                setError(data.error || 'Failed to add expense');
            }
        } catch (err) {
            setError('Failed to add expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add Expense</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category *</label>
                        <select
                            className={styles.select}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                        >
                            <option value="">Select category...</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Amount (₦) *</label>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date *</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Description *</label>
                        <textarea
                            className={styles.textarea}
                            rows={3}
                            placeholder="Enter expense details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Reference (Optional)</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g., REC-2025-001"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseModal;
