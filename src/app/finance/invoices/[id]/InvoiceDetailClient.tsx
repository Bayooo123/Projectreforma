'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import styles from './InvoiceDetail.module.css';
import { updateInvoiceStatus } from '@/app/actions/invoices';

function fmt(n: number) {
    return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return (
        <span className={`${styles.badge} ${styles.badgePaid}`}>
            <CheckCircle size={12} /> Paid
        </span>
    );
    if (s === 'overdue') return (
        <span className={`${styles.badge} ${styles.badgeOverdue}`}>
            <AlertCircle size={12} /> Overdue
        </span>
    );
    return (
        <span className={`${styles.badge} ${styles.badgePending}`}>
            <Clock size={12} /> Pending
        </span>
    );
}

export default function InvoiceDetailClient({ invoice }: { invoice: any }) {
    const router = useRouter();
    const [marking, setMarking] = useState(false);

    const lineItems: any[] = invoice.lineItems || invoice.items || [];
    const payments: any[] = invoice.payments || [];
    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const outstanding = Math.max(0, totalAmount - totalPaid);
    const isPaid = (invoice.status || '').toLowerCase() === 'paid' || outstanding <= 0;

    async function handleMarkPaid() {
        setMarking(true);
        await updateInvoiceStatus(invoice.id, 'paid');
        router.refresh();
        setMarking(false);
    }

    return (
        <div className={styles.page}>
            {/* Hero Header */}
            <div className={styles.hero}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={20} />
                </button>
                <div className={styles.heroContent}>
                    <div className={styles.heroMono}>#{invoice.invoiceNumber}</div>
                    <div className={styles.heroClient}>{invoice.client?.name || 'Client'}</div>
                    <div className={styles.heroAmount}>{fmt(totalAmount)}</div>
                    <StatusBadge status={invoice.status} />
                </div>
            </div>

            <div className={styles.body}>
                {/* Meta info */}
                <div className={styles.section}>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Issue date</span>
                            <span className={styles.metaValue}>{fmtDate(invoice.issueDate || invoice.createdAt)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Due date</span>
                            <span className={styles.metaValue}>{fmtDate(invoice.dueDate)}</span>
                        </div>
                        {invoice.brief?.name && (
                            <div className={styles.metaItem} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.metaLabel}>Matter</span>
                                <span className={styles.metaValue}>{invoice.brief.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Line items */}
                {lineItems.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Line items</h3>
                        <div className={styles.lineItems}>
                            {lineItems.map((item: any, i: number) => (
                                <div key={i} className={styles.lineItem}>
                                    <div className={styles.lineItemLeft}>
                                        <FileText size={14} color="#94A3B8" />
                                        <div>
                                            <div className={styles.lineItemName}>{item.description || item.name}</div>
                                            {item.quantity && item.unitPrice && (
                                                <div className={styles.lineItemSub}>
                                                    {item.quantity} × {fmt(Number(item.unitPrice))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.lineItemAmount}>
                                        {fmt(Number(item.amount || (item.quantity * item.unitPrice) || 0))}
                                    </div>
                                </div>
                            ))}
                            <div className={styles.lineItemTotal}>
                                <span>Total</span>
                                <span>{fmt(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payments */}
                {payments.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Payments received</h3>
                        <div className={styles.paymentList}>
                            {payments.map((p: any, i: number) => (
                                <div key={i} className={styles.paymentRow}>
                                    <div>
                                        <div className={styles.paymentMethod}>{p.method || 'Bank transfer'}</div>
                                        <div className={styles.paymentDate}>
                                            {fmtDate(p.createdAt)} {p.reference ? `· ${p.reference}` : ''}
                                        </div>
                                    </div>
                                    <div className={styles.paymentAmount}>+{fmt(Number(p.amount))}</div>
                                </div>
                            ))}
                            {outstanding > 0 && (
                                <div className={styles.outstandingRow}>
                                    <span>Outstanding</span>
                                    <span>{fmt(outstanding)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            {!isPaid && (
                <div className={styles.actions}>
                    <button
                        className={styles.primaryBtn}
                        onClick={handleMarkPaid}
                        disabled={marking}
                    >
                        {marking ? 'Updating…' : 'Mark as Paid'}
                    </button>
                </div>
            )}
        </div>
    );
}
