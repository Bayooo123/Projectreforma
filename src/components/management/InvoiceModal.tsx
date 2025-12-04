"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, DollarSign, Loader } from 'lucide-react';
import { createInvoice, generateInvoiceNumber, getClientMatters } from '@/app/actions/invoices';
import styles from './InvoiceModal.module.css';

interface InvoiceItem {
    description: string;
    amount: number;
    quantity: number;
}

interface Matter {
    id: string;
    name: string;
    caseNumber: string;
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
    workspaceId: string;
}

const InvoiceModal = ({ isOpen, onClose, clientName, clientId, workspaceId }: InvoiceModalProps) => {
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', amount: 0, quantity: 1 }]);
    const [vatRate, setVatRate] = useState(7.5);
    const [securityChargeRate, setSecurityChargeRate] = useState(1.0);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [matters, setMatters] = useState<Matter[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingMatters, setIsLoadingMatters] = useState(false);

    // Generate invoice number and fetch matters when modal opens
    useEffect(() => {
        if (isOpen && clientId) {
            // Generate invoice number
            generateInvoiceNumber(workspaceId).then(number => {
                setInvoiceNumber(number);
            });

            // Fetch client matters
            setIsLoadingMatters(true);
            getClientMatters(clientId).then(result => {
                if (result.success && result.data) {
                    setMatters(result.data);
                }
                setIsLoadingMatters(false);
            });
        }
    }, [isOpen, clientId, workspaceId]);

    if (!isOpen) return null;

    const addItem = () => {
        setItems([...items, { description: '', amount: 0, quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) * Number(item.quantity) || 0), 0);
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

        setIsSubmitting(true);

        try {
            const result = await createInvoice({
                clientId,
                matterId: formData.get('matterId') as string || undefined,
                billToName: formData.get('billToName') as string,
                billToAddress: formData.get('billToAddress') as string || undefined,
                billToCity: formData.get('billToCity') as string || undefined,
                billToState: formData.get('billToState') as string || undefined,
                attentionTo: formData.get('attentionTo') as string || undefined,
                notes: formData.get('notes') as string || undefined,
                dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : undefined,
                items: items.map((item, index) => ({
                    description: item.description,
                    amount: Math.round(Number(item.amount) * 100), // Convert to kobo
                    quantity: Number(item.quantity),
                    order: index,
                })),
                vatRate,
                securityChargeRate,
            });

            if (result.success) {
                alert(`Invoice ${invoiceNumber} created successfully!`);
                // Reset form
                setItems([{ description: '', amount: 0, quantity: 1 }]);
                e.currentTarget.reset();
                onClose();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Failed to create invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Invoice Management</h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('create')}
                        disabled={isSubmitting}
                    >
                        <Plus size={16} />
                        Create Invoice
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('list')}
                        disabled={isSubmitting}
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
                                        className={styles.input}
                                        value={invoiceNumber}
                                        disabled
                                        style={{ backgroundColor: 'var(--background)', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date</label>
                                    <input
                                        type="date"
                                        name="dueDate"
                                        className={styles.input}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Matter Selection */}
                            {matters.length > 0 && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Link to Matter (Optional)</label>
                                    <select
                                        name="matterId"
                                        className={styles.input}
                                        disabled={isSubmitting || isLoadingMatters}
                                    >
                                        <option value="">No matter selected</option>
                                        {matters.map(matter => (
                                            <option key={matter.id} value={matter.id}>
                                                {matter.caseNumber} - {matter.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Bill To Information */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Bill To (Name/Company) *</label>
                                <input
                                    type="text"
                                    name="billToName"
                                    className={styles.input}
                                    placeholder="The Managing Director, Arete Protea Global Services Ltd"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Address</label>
                                <input
                                    type="text"
                                    name="billToAddress"
                                    className={styles.input}
                                    placeholder="47b Royal Palm Drive, Osborne Foreshore Estate"
                                    disabled={isSubmitting}
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
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>State</label>
                                    <input
                                        type="text"
                                        name="billToState"
                                        className={styles.input}
                                        placeholder="Phase 2, Ikoyi"
                                        disabled={isSubmitting}
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
                                    disabled={isSubmitting}
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
                                                    disabled={isSubmitting}
                                                />
                                                <div className={styles.formRow}>
                                                    <input
                                                        type="number"
                                                        className={styles.input}
                                                        placeholder="Amount (₦)"
                                                        value={item.amount || ''}
                                                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                        required
                                                        step="0.01"
                                                        disabled={isSubmitting}
                                                    />
                                                    <input
                                                        type="number"
                                                        className={styles.input}
                                                        placeholder="Qty"
                                                        value={item.quantity || 1}
                                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                        required
                                                        min="1"
                                                        disabled={isSubmitting}
                                                        style={{ maxWidth: '100px' }}
                                                    />
                                                </div>
                                            </div>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className={styles.removeItemBtn}
                                                    title="Remove item"
                                                    disabled={isSubmitting}
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
                                    disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={18} className="spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign size={18} />
                                            Create Invoice
                                        </>
                                    )}
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
