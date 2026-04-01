"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader } from 'lucide-react';
import styles from './ExpenseModal.module.css';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    workspaceId?: string;
    expenseToEdit?: any;
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
    { label: 'Office Utilities and Electrical Maintenance', value: 'OFFICE_UTILITIES' },
    { label: 'Office Equipment Maintenance and Supplies', value: 'OFFICE_EQUIPMENT_MAINTENANCE' },
    { label: 'Court and Litigation Expenses', value: 'COURT_LITIGATION' },
    { label: 'Non-Litigation / Advisory Related Expenses', value: 'NON_LITIGATION_ADVISORY' },
    { label: 'Communication and Subscriptions', value: 'COMMUNICATION_SUBSCRIPTIONS' },
    { label: 'Staff Costs, Salaries, Bonuses and Welfare', value: 'STAFF_COSTS' },
    { label: 'Vehicle and Administrative Logistics', value: 'VEHICLE_LOGISTICS' },
    { label: 'Miscellaneous', value: 'MISCELLANEOUS' },
];

const ExpenseModal = ({ isOpen, onClose, onSuccess, workspaceId, expenseToEdit }: ExpenseModalProps) => {
    // List of added expenses (for batch mode)
    const [expenseList, setExpenseList] = useState<Expense[]>([]);

    // Current form values
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = !!expenseToEdit;

    useEffect(() => {
        if (isOpen) {
            if (expenseToEdit) {
                // Initialize for edit mode
                setCategory(expenseToEdit.category);
                setAmount(expenseToEdit.amount.toString());
                setDescription(expenseToEdit.description || '');
                setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
                setReference(expenseToEdit.reference || '');
                setExpenseList([]);
            } else {
                // Reset for create mode
                setCategory('');
                setAmount('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                setReference('');
                setExpenseList([]);
            }
            setError('');
        }
    }, [isOpen, expenseToEdit]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        // category, amount, and date are required now. description is optional.
        if (!category || !amount || !date) {
            setError('Please fill in all required fields (Category, Amount, Date) to add an item.');
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

    const handleSave = async () => {
        if (!workspaceId) {
            setError('System Error: Workspace ID is missing.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (isEditMode) {
                // Single Update (PATCH)
                const response = await fetch('/api/expenses', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: expenseToEdit.id,
                        workspaceId,
                        category,
                        amount,
                        description: description || null,
                        date,
                        reference: reference || null
                    }),
                });

                const data = await response.json();
                if (data.success) {
                    if (onSuccess) onSuccess();
                    onClose();
                } else {
                    const errorMessage = data.details 
                        ? `${data.error}: ${data.details}` 
                        : (data.error || 'Failed to update expense');
                    setError(errorMessage);
                }
            } else {
                // Batch Create (POST)
                if (expenseList.length === 0) {
                    // Try to add the current form item if list is empty
                    if (category && amount) {
                        const response = await fetch('/api/expenses', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                workspaceId,
                                expenses: [{
                                    category,
                                    amount,
                                    description: description || null,
                                    date,
                                    reference: reference || null
                                }]
                            }),
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (onSuccess) onSuccess();
                            onClose();
                            return;
                        } else {
                            setError(data.error || 'Failed to save expense');
                            setIsSubmitting(false);
                            return;
                        }
                    } else {
                        setError('Please add at least one expense to the list.');
                        setIsSubmitting(false);
                        return;
                    }
                }

                const response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workspaceId,
                        expenses: expenseList.map(item => ({
                            category: item.category,
                            amount: item.amount,
                            description: item.description || null,
                            date: item.date,
                            reference: item.reference || null
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
            }
        } catch (err) {
            setError('Failed to save expenses. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? '₦0.00' : `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const totalAmount = isEditMode 
        ? parseFloat(amount) || 0 
        : expenseList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const getCategoryLabel = (value: string) => {
        return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{isEditMode ? 'Edit Expense' : 'Record Expenses'}</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {error && <div className={styles.error}>{error}</div>}

                    {/* Input Section */}
                    <div className={styles.inputSection}>
                        <h3 className={styles.sectionTitle}>{isEditMode ? 'Update Details' : 'New Item'}</h3>
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
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                                <label className={styles.label}>Description (Optional)</label>
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

                            {!isEditMode && (
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
                            )}
                        </div>
                    </div>

                    {/* List Section - Only show in batch mode */}
                    {!isEditMode && (
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
                                                    <div>{item.description || <em style={{ color: 'var(--text-secondary)' }}>No description</em>}</div>
                                                    {item.reference && <small style={{ color: 'var(--text-secondary)' }}>{item.reference}</small>}
                                                </td>
                                                <td>{getCategoryLabel(item.category)}</td>
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
                    )}
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
                            onClick={handleSave}
                            disabled={isSubmitting || (!isEditMode && expenseList.length === 0 && (!category || !amount))}
                        >
                            {isSubmitting ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Loader size={16} className="spin" /> Saving...
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Save size={16} /> {isEditMode ? 'Update Expense' : 'Save Expenses'}
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
