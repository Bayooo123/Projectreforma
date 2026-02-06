"use client";

import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { getAllPayments } from '@/app/actions/payments';
import styles from './ViewAllModal.module.css';

interface Payment {
    id: string;
    amount: number;
    method: string;
    reference?: string | null;
    date: Date;
    client: {
        name: string;
    };
    invoice?: {
        invoiceNumber: string;
        totalAmount: number;
    } | null;
}

interface ViewAllPaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const ViewAllPaymentsModal = ({ isOpen, onClose, workspaceId }: ViewAllPaymentsModalProps) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPayments();
        }
    }, [isOpen, workspaceId]);

    const fetchPayments = async () => {
        setIsLoading(true);
        try {
            const result = await getAllPayments(workspaceId);
            if (result.success && result.data) {
                setPayments(result.data as any);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString()}`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>All Payments</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <Loader size={24} className="spin" />
                            <p>Loading payments...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No payments found</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Client</th>
                                        <th>Invoice #</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td>{formatDate(payment.date)}</td>
                                            <td>{payment.client.name}</td>
                                            <td className={styles.invoiceNumber}>
                                                {payment.invoice?.invoiceNumber || 'N/A'}
                                            </td>
                                            <td className={styles.amount}>{formatCurrency(payment.amount)}</td>
                                            <td>
                                                <span className={styles.method}>{payment.method}</span>
                                            </td>
                                            <td>{payment.reference || 'N/A'}</td>
                                        </tr>
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

export default ViewAllPaymentsModal;
