"use client";

import { X, DollarSign, Calendar, Loader, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { createPayment, getPaymentsByClient, getClientInvoices } from '@/app/actions/payments';
import styles from './InvoiceModal.module.css';

interface Payment {
    id: string;
    amount: any;
    date: Date;
    method: string;
    reference: string | null;
    invoice: {
        invoiceNumber: string;
        totalAmount: any;
    } | null;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: any;
    paidAmount: any;
    status: string;
    dueDate: Date | null;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
    selectedInvoice?: Invoice | null;
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

    const [paymentMode, setPaymentMode] = useState<'full' | 'vary'>('full');
    const [varyAmount, setVaryAmount] = useState<string>('');
    const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchData();
        }
    }, [isOpen, clientId]);

    useEffect(() => {
        if (selectedInvoice && isOpen) {
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
                setPayments(paymentsResult.data as any);
            }

            if (invoicesResult.success && invoicesResult.data) {
                setInvoices(invoicesResult.data as any);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const parseNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val));
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCurrency = (amount: any) => {
        const num = parseNum(amount);
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2,
        }).format(num).replace('NGN', '₦');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const { total, paid, balance } = useMemo(() => {
        if (!selectedInvoice) return { total: 0, paid: 0, balance: 0 };
        const t = parseNum(selectedInvoice.totalAmount);
        const p = parseNum(selectedInvoice.paidAmount);
        return { total: t, paid: p, balance: Math.max(0, t - p) };
    }, [selectedInvoice]);

    const handleCreatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setIsSubmitting(true);

        try {
            let amount = 0;
            let invoiceId = formData.get('invoiceId') as string;

            if (selectedInvoice && paymentMode === 'full') {
                amount = balance;
                invoiceId = selectedInvoice.id;
            } else if (selectedInvoice && paymentMode === 'vary') {
                amount = parseNum(varyAmount);
                invoiceId = selectedInvoice.id;
            } else {
                amount = parseNum(formData.get('amount'));
            }

            if (amount <= 0) {
                throw new Error('Payment amount must be greater than zero');
            }

            const method = formData.get('method') as string;
            const reference = formData.get('reference') as string;
            const finalReference = markAsFullyPaid ? `${reference} [FULL SETTLEMENT]`.trim() : reference;

            const dateVal = formData.get('date') as string;
            const parsedDate = dateVal ? new Date(dateVal) : undefined;
            const finalDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : undefined;

            const result = await createPayment({
                clientId,
                invoiceId: invoiceId || undefined,
                amount: amount,
                method: method,
                reference: finalReference,
                date: finalDate,
            });

            if (result.success) {
                e.currentTarget.reset();
                await fetchData();
                setActiveTab('list');
                if (selectedInvoice) onClose();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error: any) {
            console.error('Error recording payment:', error);
            alert(error.message || 'Failed to record payment');
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
                            History ({payments.length})
                        </button>
                    </div>
                )}

                <div className={styles.content}>
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleCreatePayment}>
                            {selectedInvoice ? (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles.totalsBox} style={{ marginBottom: '1.5rem' }}>
                                        <div className={styles.totalRow}>
                                            <span>Invoice Total:</span>
                                            <span>{formatCurrency(total)}</span>
                                        </div>
                                        <div className={styles.totalRow}>
                                            <span>Already Paid:</span>
                                            <span>{formatCurrency(paid)}</span>
                                        </div>
                                        <div className={`${styles.totalRow} ${styles.grandTotal}`} style={{ color: 'var(--danger)' }}>
                                            <span>Outstanding:</span>
                                            <span>{formatCurrency(balance)}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <button
                                            type="button"
                                            className={paymentMode === 'full' ? styles.submitBtn : styles.secondaryBtn}
                                            onClick={() => setPaymentMode('full')}
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <CheckCircle size={16} /> Pay Balance
                                        </button>
                                        <button
                                            type="button"
                                            className={paymentMode === 'vary' ? styles.submitBtn : styles.secondaryBtn}
                                            onClick={() => setPaymentMode('vary')}
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <AlertCircle size={16} /> Partial / Vary
                                        </button>
                                    </div>

                                    {paymentMode === 'full' && (
                                        <div style={{ padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                                            <p style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                                                Recording full settlement of {formatCurrency(balance)}
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
                                                    placeholder="0.00"
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
                                                <label htmlFor="markPaid" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    Mark as fully paid (Apply discount to remaining)
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (₦) *</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        className={styles.input}
                                        placeholder="0.00"
                                        required
                                        step="0.01"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Method *</label>
                                <select name="method" className={styles.input} required disabled={isSubmitting}>
                                    <option value="">Select method...</option>
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            {!selectedInvoice && invoices.length > 0 && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Link to Invoice (Optional)</label>
                                    <select name="invoiceId" className={styles.input} disabled={isSubmitting}>
                                        <option value="">No invoice selected</option>
                                        {invoices.map(inv => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} - {formatCurrency(inv.totalAmount)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Reference / Receipt #</label>
                                <input name="reference" type="text" className={styles.input} placeholder="e.g. TRF-123" disabled={isSubmitting} />
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
                                <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <><Loader size={16} className="spin" /> Recording...</>
                                    ) : (
                                        <><DollarSign size={16} /> Record Payment</>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className={styles.invoiceList}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader size={32} className="spin" /><p>Loading...</p></div>
                            ) : payments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}><p>No history found</p></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {payments.map(p => (
                                        <div key={p.id} className="p-4 border rounded-xl bg-white shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-primary">{formatCurrency(p.amount)}</h3>
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{p.method}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                                        <Calendar size={12} /> {formatDate(p.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            {p.reference && <p className="text-xs text-slate-500 italic">Ref: {p.reference}</p>}
                                            {p.invoice && (
                                                <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase flex items-center gap-1">
                                                    <FileText size={10} /> Linked to {p.invoice.invoiceNumber}
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
