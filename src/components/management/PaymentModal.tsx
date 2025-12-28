"use client";

import { X, DollarSign, Calendar, Loader, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPayment, getPaymentsByClient, getClientInvoices } from '@/app/actions/payments';
import styles from './InvoiceModal.module.css';

interface Payment {
    id: string;
    amount: number;
    date: Date;
    method: string;
    reference: string | null;
    invoice: {
        invoiceNumber: string;
        totalAmount: number;
    } | null;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number; // Ensuring we have this to calc balance
    status: string;
    dueDate: Date | null;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
    selectedInvoice?: Invoice | null; // Passed when opening from invoice list to pay specific invoice
}

const PAYMENT_METHODS = [
    'Bank Transfer',
    'Cash',
    'Cheque',
    'Card',
    'Mobile Money',
    'Other',
];

const PaymentModal = ({ isOpen, onClose, clientName, clientId, selectedInvoice }: PaymentModalProps) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('create');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Variation State
    const [paymentMode, setPaymentMode] = useState<'full' | 'vary'>('full'); // 'full' | 'vary'
    const [varyAmount, setVaryAmount] = useState<string>('');
    const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchData();
        }
    }, [isOpen, clientId]);

    useEffect(() => {
        // Reset state when modal opens or invoice changes
        if (selectedInvoice) {
            setActiveTab('create');
            setPaymentMode('full');
            setVaryAmount('');
            setMarkAsFullyPaid(false);
        }
    }, [selectedInvoice, isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [paymentsResult, invoicesResult] = await Promise.all([
                getPaymentsByClient(clientId),
                getClientInvoices(clientId),
            ]);

            if (paymentsResult.success && paymentsResult.data) {
                setPayments(paymentsResult.data);
            }

            if (invoicesResult.success && invoicesResult.data) {
                setInvoices(invoicesResult.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const formatCurrency = (amount: number) => {
        // Amount is in kobo, convert to naira
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Calculate balance
    const invoiceBalance = selectedInvoice ? selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0) : 0;

    const handleCreatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setIsSubmitting(true);

        try {
            let amount = 0;
            let invoiceId = formData.get('invoiceId') as string;

            if (selectedInvoice && paymentMode === 'full') {
                amount = invoiceBalance / 100; // Invoice balance in Naira
                invoiceId = selectedInvoice.id;
            } else if (selectedInvoice && paymentMode === 'vary') {
                amount = parseFloat(varyAmount);
                invoiceId = selectedInvoice.id;
            } else {
                // Standard manual entry
                amount = parseFloat(formData.get('amount') as string);
            }

            const method = formData.get('method') as string;
            const reference = formData.get('reference') as string;
            // Append note if full settlement
            const finalReference = markAsFullyPaid ? `${reference} [FULL SETTLEMENT]` : reference;

            const result = await createPayment({
                clientId,
                invoiceId: invoiceId || undefined,
                amount: Math.round(amount * 100), // Convert to kobo
                method: method,
                reference: finalReference,
                date: formData.get('date') ? new Date(formData.get('date') as string) : undefined,
            });

            if (result.success) {
                alert('Payment recorded successfully!');
                e.currentTarget.reset();
                await fetchData(); // Refresh data
                setActiveTab('list');
                if (selectedInvoice) onClose(); // Close if we were paying specific invoice
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>
                            {selectedInvoice ? `Pay Invoice #${selectedInvoice.invoiceNumber}` : 'Payments'}
                        </h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                {!selectedInvoice && (
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('create')}
                            disabled={isSubmitting}
                        >
                            <DollarSign size={16} />
                            Record Payment
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('list')}
                            disabled={isSubmitting}
                        >
                            <FileText size={16} />
                            Payment History ({payments.length})
                        </button>
                    </div>
                )}

                <div className={styles.content}>
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleCreatePayment}>

                            {selectedInvoice ? (
                                // INVOICE SPECIFIC PAYMENT FLOW
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles.totalsBox} style={{ marginBottom: '1.5rem' }}>
                                        <div className={styles.totalRow}>
                                            <span>Invoice Total:</span>
                                            <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                                        </div>
                                        <div className={styles.totalRow}>
                                            <span>Already Paid:</span>
                                            <span>{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                                        </div>
                                        <div className={`${styles.totalRow} ${styles.grandTotal}`} style={{ color: '#DC2626' }}>
                                            <span>Outstanding Balance:</span>
                                            <span>{formatCurrency(invoiceBalance)}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <button
                                            type="button"
                                            className={paymentMode === 'full' ? styles.submitBtn : styles.secondaryBtn}
                                            onClick={() => setPaymentMode('full')}
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <CheckCircle size={16} /> Confirm Full Payment
                                        </button>
                                        <button
                                            type="button"
                                            className={paymentMode === 'vary' ? styles.submitBtn : styles.secondaryBtn}
                                            onClick={() => setPaymentMode('vary')}
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <AlertCircle size={16} /> Vary / Discount
                                        </button>
                                    </div>

                                    {paymentMode === 'full' && (
                                        <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                                            <p style={{ textAlign: 'center', fontWeight: 600 }}>
                                                Recording payment of {formatCurrency(invoiceBalance)}
                                            </p>
                                        </div>
                                    )}

                                    {paymentMode === 'vary' && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Amount to Pay (₦)</label>
                                                <input
                                                    type="number"
                                                    className={styles.input}
                                                    value={varyAmount}
                                                    onChange={(e) => setVaryAmount(e.target.value)}
                                                    placeholder="Enter amount..."
                                                    step="0.01"
                                                    required
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    id="markPaid"
                                                    checked={markAsFullyPaid}
                                                    onChange={(e) => setMarkAsFullyPaid(e.target.checked)}
                                                />
                                                <label htmlFor="markPaid" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    Mark invoice as fully paid (Discount remaining balance)
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // STANDARD GENERIC PAYMENT FLOW
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (₦) *</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        className={styles.input}
                                        placeholder="500000.00"
                                        required
                                        step="0.01"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Method *</label>
                                <select
                                    name="method"
                                    className={styles.input}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select method...</option>
                                    {PAYMENT_METHODS.map(method => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!selectedInvoice && invoices.length > 0 && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Link to Invoice (Optional)</label>
                                    <select
                                        name="invoiceId"
                                        className={styles.input}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">No invoice selected</option>
                                        {invoices.map(invoice => (
                                            <option key={invoice.id} value={invoice.id}>
                                                {invoice.invoiceNumber} - {formatCurrency(invoice.totalAmount)} ({invoice.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Reference</label>
                                <input
                                    name="reference"
                                    type="text"
                                    className={styles.input}
                                    placeholder="TRF/2025/10001"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Date</label>
                                <input
                                    name="date"
                                    type="date"
                                    className={styles.input}
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={styles.cancelBtn}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={16} className="spin" />
                                            Recording...
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign size={16} />
                                            Record Payment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className={styles.invoiceList}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <Loader size={32} className="spin" />
                                    <p>Loading payments...</p>
                                </div>
                            ) : payments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>No payments recorded yet</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {payments.map(payment => (
                                        <div
                                            key={payment.id}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--background)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                                                        {formatCurrency(payment.amount)}
                                                    </h3>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        {payment.method}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Calendar size={14} />
                                                        {formatDate(payment.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            {payment.reference && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                    Ref: {payment.reference}
                                                </p>
                                            )}
                                            {payment.invoice && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <FileText size={14} />
                                                    Linked to {payment.invoice.invoiceNumber}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default PaymentModal;
