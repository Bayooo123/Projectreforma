"use client";

import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { getInvoices } from '@/app/actions/invoices';
import styles from './ViewAllModal.module.css';

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    dueDate?: Date | null;
    client: {
        name: string;
    };
    matter?: {
        name: string;
    } | null;
}

interface ViewAllInvoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const ViewAllInvoicesModal = ({ isOpen, onClose, workspaceId }: ViewAllInvoicesModalProps) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className={styles.invoiceNumber}>{invoice.invoiceNumber}</td>
                                            <td>{invoice.client.name}</td>
                                            <td>{invoice.matter?.name || 'N/A'}</td>
                                            <td className={styles.amount}>{formatCurrency(invoice.totalAmount)}</td>
                                            <td>{getStatusBadge(invoice.status)}</td>
                                            <td>{formatDate(invoice.createdAt)}</td>
                                            <td>{formatDate(invoice.dueDate)}</td>
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

export default ViewAllInvoicesModal;
