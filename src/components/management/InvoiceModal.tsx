"use client";

import { useState } from 'react';
import { X, Plus, DollarSign, FileText, Calendar } from 'lucide-react';
import styles from './InvoiceModal.module.css';

interface Invoice {
    id: string;
    invoiceNumber: string;
    amount: number;
    date: Date;
    dueDate: Date;
    status: 'paid' | 'pending' | 'overdue';
    description: string;
}

interface Payment {
    id: string;
    amount: number;
    date: Date;
    method: string;
    reference: string;
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
}

const MOCK_INVOICES: Invoice[] = [
    {
        id: '1',
        invoiceNumber: 'INV-2025-001',
        amount: 500000,
        date: new Date('2025-10-01'),
        dueDate: new Date('2025-10-15'),
        status: 'paid',
        description: 'Legal consultation and document review',
    },
    {
        id: '2',
        invoiceNumber: 'INV-2025-002',
        amount: 750000,
        date: new Date('2025-10-15'),
        dueDate: new Date('2025-10-30'),
        status: 'pending',
        description: 'Court representation - Motion hearing',
    },
];

const MOCK_PAYMENTS: Payment[] = [
    {
        id: '1',
        amount: 500000,
        date: new Date('2025-10-10'),
        method: 'Bank Transfer',
        reference: 'TRF/2025/10001',
    },
];

const InvoiceModal = ({ isOpen, onClose, clientName }: InvoiceModalProps) => {
    const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'create'>('invoices');
    const [invoices] = useState<Invoice[]>(MOCK_INVOICES);
    const [payments] = useState<Payment[]>(MOCK_PAYMENTS);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString()}`;
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            paid: { text: 'Paid', className: styles.statusPaid },
            pending: { text: 'Pending', className: styles.statusPending },
            overdue: { text: 'Overdue', className: styles.statusOverdue },
        };
        const badge = badges[status as keyof typeof badges];
        return <span className={badge.className}>{badge.text}</span>;
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Invoice & Payment Management</h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'invoices' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('invoices')}
                    >
                        <FileText size={16} />
                        Invoices ({invoices.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'payments' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        <DollarSign size={16} />
                        Payments ({payments.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <Plus size={16} />
                        Create Invoice
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'invoices' && (
                        <div className={styles.invoiceList}>
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className={styles.invoiceCard}>
                                    <div className={styles.invoiceHeader}>
                                        <div>
                                            <h3 className={styles.invoiceNumber}>{invoice.invoiceNumber}</h3>
                                            <p className={styles.invoiceDesc}>{invoice.description}</p>
                                        </div>
                                        {getStatusBadge(invoice.status)}
                                    </div>
                                    <div className={styles.invoiceDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Amount:</span>
                                            <span className={styles.value}>{formatCurrency(invoice.amount)}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Date:</span>
                                            <span className={styles.value}>{invoice.date.toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Due:</span>
                                            <span className={styles.value}>{invoice.dueDate.toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className={styles.paymentList}>
                            {payments.map((payment) => (
                                <div key={payment.id} className={styles.paymentCard}>
                                    <div className={styles.paymentIcon}>
                                        <DollarSign size={20} />
                                    </div>
                                    <div className={styles.paymentInfo}>
                                        <h3 className={styles.paymentAmount}>{formatCurrency(payment.amount)}</h3>
                                        <p className={styles.paymentMethod}>{payment.method}</p>
                                        <p className={styles.paymentRef}>Ref: {payment.reference}</p>
                                    </div>
                                    <div className={styles.paymentDate}>
                                        <Calendar size={14} />
                                        {payment.date.toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <form className={styles.createForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Invoice Number</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="INV-2025-003"
                                    defaultValue={`INV-2025-${String(invoices.length + 1).padStart(3, '0')}`}
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (₦)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        placeholder="500000"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    placeholder="Legal services provided..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Matter/Case</label>
                                <select className={styles.select}>
                                    <option value="">Select matter...</option>
                                    <option value="1">State v. Johnson</option>
                                    <option value="2">Adeyemi v. FBN</option>
                                    <option value="3">Estate of Okoro</option>
                                </select>
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    Create Invoice
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
