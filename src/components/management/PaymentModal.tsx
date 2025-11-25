"use client";

import { X, DollarSign, Calendar } from 'lucide-react';
import { useState } from 'react';
import styles from './InvoiceModal.module.css';

interface Payment {
    id: string;
    amount: number;
    date: Date;
    method: string;
    reference: string;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
}

const PaymentModal = ({ isOpen, onClose, clientName }: PaymentModalProps) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

    const handleCreatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value);
        const method = (form.elements.namedItem('method') as HTMLInputElement).value;
        const reference = (form.elements.namedItem('reference') as HTMLInputElement).value;

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: clientName,
                    amount,
                    method,
                    reference,
                }),
            });

            if (response.ok) {
                const newPayment = await response.json();
                setPayments([...payments, newPayment]);
                alert('Payment recorded successfully');
                form.reset();
                setActiveTab('list');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Payments for {clientName}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        Payments ({payments.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        Record Payment
                    </button>
                </div>
                <div className={styles.content}>
                    {activeTab === 'list' && (
                        <div className={styles.paymentList}>
                            {payments.map(p => (
                                <div key={p.id} className={styles.paymentCard}>
                                    <div className={styles.paymentIcon}>
                                        <DollarSign size={20} />
                                    </div>
                                    <div className={styles.paymentInfo}>
                                        <h3 className={styles.paymentAmount}>{formatCurrency(p.amount)}</h3>
                                        <p className={styles.paymentMethod}>{p.method}</p>
                                        <p className={styles.paymentRef}>Ref: {p.reference}</p>
                                    </div>
                                    <div className={styles.paymentDate}>
                                        <Calendar size={14} />
                                        {p.date.toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleCreatePayment}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Amount (₦)</label>
                                <input name="amount" type="number" className={styles.input} placeholder="500000" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Method</label>
                                <input name="method" type="text" className={styles.input} placeholder="Bank Transfer" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Reference</label>
                                <input name="reference" type="text" className={styles.input} placeholder="TRF/2025/10001" required />
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                                <button type="submit" className={styles.submitBtn}>Record Payment</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
