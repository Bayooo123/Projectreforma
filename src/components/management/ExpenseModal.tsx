"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader } from 'lucide-react';
import styles from './ExpenseModal.module.css';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    workspaceId?: string;
}

interface Expense {
    id: string; // Temporary ID for UI
    category: string;
    amount: string; // Keep as string for input handling
    description: string;
    date: string;
    reference: string;
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

const ExpenseModal = ({ isOpen, onClose, onSuccess, workspaceId }: ExpenseModalProps) => {
    // List of added expenses
    const [expenseList, setExpenseList] = useState<Expense[]>([]);

    // Current form values
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setExpenseList([]);
            setCategory('');
            setAmount('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setReference('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        if (!category || !amount || !description || !date) {
            setError('Please fill in all required fields to add an item.');
            return;
        }

        const newExpense: Expense = {
            id: crypto.randomUUID(),
            category,
            amount,
            description,
            date,
            reference
        };

        setExpenseList([...expenseList, newExpense]);

        // Reset inputs but keep date
        setCategory('');
        setAmount('');
        setDescription('');
        setReference('');
        setError('');
    };

    const handleRemoveItem = (id: string) => {
        setExpenseList(expenseList.filter(item => item.id !== id));
    };

    const handleSaveAll = async () => {
        if (expenseList.length === 0) {
            setError('Please add at least one expense to the list.');
            return;
        }

        if (!workspaceId) {
            setError('System Error: Workspace ID is missing. Please refresh.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workspaceId,
                    expenses: expenseList.map(item => ({
                        category: item.category,
                        amount: parseFloat(item.amount),
                        description: item.description,
                        date: item.date,
                        reference: item.reference
                    }))
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setError(data.error || 'Failed to save expenses');
            }
        } catch (err) {
            setError('Failed to save expenses. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? '₦0.00' : `₦${num.toLocaleString()}`;
    };

    const totalAmount = expenseList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Record Expenses</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {error && <div className={styles.error}>{error}</div>}

                    {/* Input Section */}
                    <div className={styles.inputSection}>
                        <h3 className={styles.sectionTitle}>New Item</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Category *</label>
                                <select
                                    className={styles.select}
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">Select category...</option>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

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
                                />
                            </div>

                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Description *</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder="Enter expense details..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date *</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Reference (Optional)</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g., REC-001"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                />
                            </div>

                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <button
                                    className={styles.btnAddItem}
                                    onClick={handleAddItem}
                                    type="button"
                                >
                                    <Plus size={16} />
                                    Add to List
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th className={styles.colAction}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyState}>
                                            No items added yet. Use the form above to add expenses.
                                        </td>
                                    </tr>
                                ) : (
                                    expenseList.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div>{item.description}</div>
                                                {item.reference && <small style={{ color: 'var(--text-secondary)' }}>{item.reference}</small>}
                                            </td>
                                            <td>{item.category}</td>
                                            <td>{item.date}</td>
                                            <td>{formatCurrency(item.amount)}</td>
                                            <td className={styles.colAction}>
                                                <button
                                                    className={styles.btnDelete}
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={isSubmitting}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.footer}>
                    <div className={styles.total}>
                        Total: {formatCurrency(totalAmount.toString())}
                    </div>
                    <div className={styles.actions}>
                        <button
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            className={styles.submitBtn}
                            onClick={handleSaveAll}
                            disabled={isSubmitting || expenseList.length === 0}
                        >
                            {isSubmitting ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Loader size={16} className="spin" /> Saving...
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Save size={16} /> Save Expenses
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseModal;
