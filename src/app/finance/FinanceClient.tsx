'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Receipt, CreditCard, Plus } from 'lucide-react';
import FinancialLog from '@/components/management/FinancialLog';
import { PinProtection } from '@/components/auth/PinProtection';
import styles from './Finance.module.css';

type Tab = 'invoices' | 'payments' | 'expenses';

function fmt(n: number) {
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
    return `₦${n.toLocaleString()}`;
}

function fmtFull(n: number) {
    return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusPill(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return { label: 'Paid', cls: styles.pillPaid };
    if (s === 'overdue') return { label: 'Overdue', cls: styles.pillOverdue };
    return { label: 'Pending', cls: styles.pillPending };
}

interface Props {
    workspaceId: string;
    invoices: any[];
    payments: any[];
    expenses: any[];
    expenseSummaries: any[];
    userRole: string;
    isOwner: boolean;
    outstanding: number;
    collectedMTD: number;
    expensesMTD: number;
}

export default function FinanceClient({
    workspaceId, invoices, payments, expenses, expenseSummaries, userRole, isOwner,
    outstanding, collectedMTD, expensesMTD,
}: Props) {
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>('invoices');

    useEffect(() => {
        const queryTab = searchParams.get('tab');
        if (queryTab === 'invoices' || queryTab === 'payments' || queryTab === 'expenses') {
            setTab(queryTab as Tab);
        }
    }, [searchParams]);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.eyebrow}>Finance</div>
                <h1 className={styles.title}>Financial Overview</h1>
            </div>

            {/* Hero Summary Card */}
            <div className={styles.hero}>
                <div className={styles.heroStats}>
                    <div className={styles.heroStat}>
                        <span className={styles.heroLabel}>Outstanding</span>
                        <span className={styles.heroValue}>{fmtFull(outstanding)}</span>
                    </div>
                    <div className={styles.heroStat}>
                        <span className={styles.heroLabel}>Collected MTD</span>
                        <span className={styles.heroValueSm}>{fmt(collectedMTD)}</span>
                    </div>
                    <div className={styles.heroStat}>
                        <span className={styles.heroLabel}>Expenses MTD</span>
                        <span className={styles.heroValueSm}>{fmt(expensesMTD)}</span>
                    </div>
                </div>
            </div>

            {/* Segment control */}
            <div className={styles.segmentWrap}>
                {(['invoices', 'payments', 'expenses'] as Tab[]).map(t => (
                    <button
                        key={t}
                        className={`${styles.segBtn} ${tab === t ? styles.segBtnActive : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Lists */}
            {tab === 'invoices' && (
                <div className={styles.list}>
                    {invoices.length === 0 && <div className={styles.empty}>No invoices yet</div>}
                    {invoices.map(inv => {
                        const pill = statusPill(inv.status);
                        return (
                            <Link key={inv.id} href={`/finance/invoices/${inv.id}`} className={styles.card}>
                                <div className={styles.cardIcon} style={{ background: '#ECFDF5' }}>
                                    <Receipt size={18} color="#059669" />
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.cardName}>{inv.client?.name || 'Client'}</div>
                                    <div className={styles.cardSub}>
                                        #{inv.invoiceNumber} · {inv.dueDate ? `Due ${fmtDate(inv.dueDate)}` : fmtDate(inv.createdAt)}
                                    </div>
                                </div>
                                <div className={styles.cardTrail}>
                                    <div className={styles.cardAmount}>{fmt(Number(inv.totalAmount || 0))}</div>
                                    <div className={`${styles.cardPill} ${pill.cls}`}>
                                        <span className={styles.pillDot} />
                                        {pill.label}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {tab === 'payments' && (
                <div className={styles.list}>
                    {payments.length === 0 && <div className={styles.empty}>No payments recorded</div>}
                    {payments.map(p => (
                        <div key={p.id} className={styles.card}>
                            <div className={styles.cardIcon} style={{ background: '#D1FAE5' }}>
                                <CreditCard size={18} color="#059669" />
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.cardName}>{p.client?.name || 'Client'}</div>
                                <div className={styles.cardSub}>
                                    {p.reference || p.method || 'Payment'} · {fmtDate(p.createdAt)}
                                </div>
                            </div>
                            <div className={styles.cardTrail}>
                                <div className={`${styles.cardAmount} ${styles.cardAmountPos}`}>
                                    +{fmt(Number(p.amount || 0))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'expenses' && (
                <PinProtection workspaceId={workspaceId} featureId="office" module="office" variant="office">
                    <FinancialLog
                        workspaceId={workspaceId}
                        initialExpenses={expenses}
                        initialSummaries={expenseSummaries}
                        userRole={userRole}
                        isOwner={isOwner}
                    />
                </PinProtection>
            )}

            {/* New Invoice FAB */}
            <Link href="/finance/invoices/new" className={styles.newBtn}>
                <Plus size={18} /> New Invoice
            </Link>
        </div>
    );
}
