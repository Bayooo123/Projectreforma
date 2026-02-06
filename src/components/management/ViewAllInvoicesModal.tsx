"use client";

import { useState, useEffect } from 'react';
import { X, Loader, DollarSign, CheckCircle } from 'lucide-react';
import { getInvoices } from '@/app/actions/invoices';
import { createPayment } from '@/app/actions/payments';
import styles from './ViewAllModal.module.css';

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    dueDate?: Date | null;
    clientId: string;
    client: {
        name: string;
    };
    matter?: {
        name: string;
    } | null;
    payments?: any[];
}

interface ViewAllInvoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const ViewAllInvoicesModal = ({ isOpen, onClose, workspaceId }: ViewAllInvoicesModalProps) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recordingPaymentFor, setRecordingPaymentFor] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<'full' | 'vary'>('full');
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [paymentReference, setPaymentReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInvoices();
        }
    }, [isOpen, workspaceId]);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const result = await getInvoices(workspaceId);
            if (result.success && result.data) {
                setInvoices(result.data as any);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            paid: '#10B981',
            pending: '#F59E0B',
            overdue: '#EF4444',
            partially_paid: '#3B82F6'
        };

        return (
            <span
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: `${statusColors[status] || '#6B7280'}20`,
                    color: statusColors[status] || '#6B7280'
                }}
            >
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    const handleRecordPayment = (invoice: Invoice) => {
        setRecordingPaymentFor(invoice.id);
        setPaymentMode('full');
        setCustomAmount('');
        setPaymentMethod('bank_transfer');
        setPaymentReference('');
    };

    const handleCancelPayment = () => {
        setRecordingPaymentFor(null);
        setPaymentMode('full');
        setCustomAmount('');
        setPaymentReference('');
    };

    const handleSubmitPayment = async (invoice: Invoice) => {
        setIsSubmitting(true);
        try {
            const paidAmount = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const outstanding = invoice.totalAmount - paidAmount;

            let paymentAmount: number;
            if (paymentMode === 'full') {
                paymentAmount = outstanding;
            } else {
                const amountInNaira = parseFloat(customAmount);
                if (isNaN(amountInNaira) || amountInNaira <= 0) {
                    alert('Please enter a valid amount');
                    setIsSubmitting(false);
                    return;
                }
                paymentAmount = Math.round(amountInNaira * 100); // Convert to kobo
            }

            const result = await createPayment({
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                amount: paymentAmount,
                method: paymentMethod,
                reference: paymentReference || undefined,
                date: new Date()
            });

            if (result.success) {
                alert('Payment recorded successfully!');
                handleCancelPayment();
                fetchInvoices(); // Refresh the list
            } else {
                alert(result.error || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getOutstandingAmount = (invoice: Invoice) => {
        const paidAmount = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        return invoice.totalAmount - paidAmount;
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>All Invoices</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <Loader size={24} className="spin" />
                            <p>Loading invoices...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No invoices found</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Matter</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Due Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <>
                                            <tr key={invoice.id}>
                                                <td className={styles.invoiceNumber}>{invoice.invoiceNumber}</td>
                                                <td>{invoice.client.name}</td>
                                                <td>{invoice.matter?.name || 'N/A'}</td>
                                                <td className={styles.amount}>{formatCurrency(invoice.totalAmount)}</td>
                                                <td>{getStatusBadge(invoice.status)}</td>
                                                <td>{formatDate(invoice.createdAt)}</td>
                                                <td>{formatDate(invoice.dueDate)}</td>
                                                <td>
                                                    {invoice.status !== 'paid' && (
                                                        <button
                                                            onClick={() => handleRecordPayment(invoice)}
                                                            className={styles.actionBtn}
                                                            disabled={recordingPaymentFor === invoice.id}
                                                        >
                                                            <DollarSign size={14} />
                                                            Record Payment
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {recordingPaymentFor === invoice.id && (
                                                <tr>
                                                    <td colSpan={8} className={styles.paymentForm}>
                                                        <div className={styles.paymentFormContent}>
                                                            <h4>Record Payment for {invoice.invoiceNumber}</h4>
                                                            <p className={styles.outstandingInfo}>
                                                                Outstanding: <strong>{formatCurrency(getOutstandingAmount(invoice))}</strong>
                                                            </p>

                                                            <div className={styles.paymentModeButtons}>
                                                                <button
                                                                    className={paymentMode === 'full' ? styles.modeActive : styles.modeInactive}
                                                                    onClick={() => setPaymentMode('full')}
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    Confirm Full Payment
                                                                </button>
                                                                <button
                                                                    className={paymentMode === 'vary' ? styles.modeActive : styles.modeInactive}
                                                                    onClick={() => setPaymentMode('vary')}
                                                                >
                                                                    Vary Amount
                                                                </button>
                                                            </div>

                                                            {paymentMode === 'vary' && (
                                                                <div className={styles.formGroup}>
                                                                    <label>Amount (₦)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={customAmount}
                                                                        onChange={(e) => setCustomAmount(e.target.value)}
                                                                        placeholder="Enter amount in Naira"
                                                                        className={styles.input}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className={styles.formGroup}>
                                                                <label>Payment Method</label>
                                                                <select
                                                                    value={paymentMethod}
                                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                                    className={styles.select}
                                                                >
                                                                    <option value="bank_transfer">Bank Transfer</option>
                                                                    <option value="cash">Cash</option>
                                                                    <option value="cheque">Cheque</option>
                                                                    <option value="card">Card</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                            </div>

                                                            <div className={styles.formGroup}>
                                                                <label>Reference (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    value={paymentReference}
                                                                    onChange={(e) => setPaymentReference(e.target.value)}
                                                                    placeholder="Transaction reference"
                                                                    className={styles.input}
                                                                />
                                                            </div>

                                                            <div className={styles.formActions}>
                                                                <button
                                                                    onClick={() => handleSubmitPayment(invoice)}
                                                                    disabled={isSubmitting}
                                                                    className={styles.submitBtn}
                                                                >
                                                                    {isSubmitting ? <Loader size={16} className="spin" /> : 'Submit Payment'}
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelPayment}
                                                                    disabled={isSubmitting}
                                                                    className={styles.cancelBtn}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewAllInvoicesModal;
