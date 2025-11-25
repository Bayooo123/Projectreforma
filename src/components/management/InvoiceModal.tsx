"use client";

import { useState } from 'react';
import { X, Plus, Trash2, FileText, DollarSign } from 'lucide-react';
import styles from './InvoiceModal.module.css';

interface InvoiceItem {
    description: string;
    amount: number;
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
}

const InvoiceModal = ({ isOpen, onClose, clientName, clientId }: InvoiceModalProps) => {
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }]);
    const [vatRate, setVatRate] = useState(7.5);
    const [securityChargeRate, setSecurityChargeRate] = useState(1.0);

    if (!isOpen) return null;

    const addItem = () => {
        setItems([...items, { description: '', amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: 'description' | 'amount', value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const vat = subtotal * (vatRate / 100);
        const securityCharge = subtotal * (securityChargeRate / 100);
        const total = subtotal + vat + securityCharge;

        return { subtotal, vat, securityCharge, total };
    };

    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const { subtotal, vat, securityCharge, total } = calculateTotals();

        try {
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceNumber: formData.get('invoiceNumber'),
                    clientId,
                    matterId: formData.get('matterId') || null,
                    dueDate: formData.get('dueDate') || null,
                    billToName: formData.get('billToName'),
                    billToAddress: formData.get('billToAddress'),
                    billToCity: formData.get('billToCity'),
                    billToState: formData.get('billToState'),
                    attentionTo: formData.get('attentionTo'),
                    notes: formData.get('notes'),
                    items: items.map(item => ({
                        description: item.description,
                        amount: Math.round(Number(item.amount) * 100), // Convert to kobo
                    })),
                    vatRate,
                    securityChargeRate,
                }),
            });

            if (response.ok) {
                alert('Invoice created successfully!');
                e.currentTarget.reset();
                setItems([{ description: '', amount: 0 }]);
                onClose();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Failed to create invoice');
        }
    };

    const totals = calculateTotals();

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Invoice Management</h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <Plus size={16} />
                        Create Invoice
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        <FileText size={16} />
                        View Invoices
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleSubmit}>
                            {/* Invoice Header */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Invoice Number</label>
                                    <input
                                        type="text"
                                        name="invoiceNumber"
                                        className={styles.input}
                                        placeholder="INV-2025-001"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date</label>
                                    <input
                                        type="date"
                                        name="dueDate"
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Bill To Information */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Bill To (Name/Company)</label>
                                <input
                                    type="text"
                                    name="billToName"
                                    className={styles.input}
                                    placeholder="The Managing Director, Arete Protea Global Services Ltd"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Address</label>
                                <input
                                    type="text"
                                    name="billToAddress"
                                    className={styles.input}
                                    placeholder="47b Royal Palm Drive, Osborne Foreshore Estate"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>City</label>
                                    <input
                                        type="text"
                                        name="billToCity"
                                        className={styles.input}
                                        placeholder="Lagos"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>State</label>
                                    <input
                                        type="text"
                                        name="billToState"
                                        className={styles.input}
                                        placeholder="Phase 2, Ikoyi"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Attention To</label>
                                <input
                                    type="text"
                                    name="attentionTo"
                                    className={styles.input}
                                    placeholder="Sven Hanson"
                                />
                            </div>

                            {/* Line Items */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Line Items</label>
                                <div className={styles.lineItems}>
                                    {items.map((item, index) => (
                                        <div key={index} className={styles.lineItem}>
                                            <div className={styles.lineItemNumber}>{index + 1}.</div>
                                            <div className={styles.lineItemContent}>
                                                <textarea
                                                    className={styles.textarea}
                                                    rows={2}
                                                    placeholder="PROFESSIONAL FEE FOR: RECENT INTERFACE WITH EFCC AND CONCLUSION OF THE CASE"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    required
                                                />
                                                <input
                                                    type="number"
                                                    className={styles.input}
                                                    placeholder="Amount (₦)"
                                                    value={item.amount || ''}
                                                    onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                    required
                                                    step="0.01"
                                                />
                                            </div>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className={styles.removeItemBtn}
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className={styles.addItemBtn}
                                >
                                    <Plus size={16} />
                                    Add Line Item
                                </button>
                            </div>

                            {/* Tax Configuration */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>VAT Rate (%)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={vatRate}
                                        onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                        step="0.1"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Security Charge (%)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={securityChargeRate}
                                        onChange={(e) => setSecurityChargeRate(parseFloat(e.target.value) || 0)}
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className={styles.totalsBox}>
                                <div className={styles.totalRow}>
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>VAT ({vatRate}%):</span>
                                    <span>{formatCurrency(totals.vat)}</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>Security Charges ({securityChargeRate}%):</span>
                                    <span>{formatCurrency(totals.securityCharge)}</span>
                                </div>
                                <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(totals.total)}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Instructions / Notes</label>
                                <textarea
                                    name="notes"
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder="Payment should be made in favour of..."
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    <DollarSign size={18} />
                                    Create Invoice
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className={styles.invoiceList}>
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                Invoice list will be displayed here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
