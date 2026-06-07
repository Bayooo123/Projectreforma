'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Mail, Phone, Building2, MapPin, FileText, Receipt, Activity } from 'lucide-react';
import styles from './ClientDetail.module.css';

type Tab = 'profile' | 'matters' | 'invoices' | 'activity';

function fmt(n: number) {
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
    return `₦${n.toLocaleString()}`;
}

function fmtDate(d: string | Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function statusPill(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return { label: 'Paid', cls: styles.pillPaid };
    if (s === 'overdue') return { label: 'Overdue', cls: styles.pillOverdue };
    return { label: 'Pending', cls: styles.pillPending };
}

export default function ClientDetailClient({ client }: { client: any }) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('profile');

    const matters: any[] = client.matters || [];
    const invoices: any[] = client.invoices || [];
    const comms: any[] = client.clientCommunications || [];
    const totalBilled = invoices.reduce((s: number, inv: any) => s + Number(inv.totalAmount || 0), 0);
    const totalPaid = (client.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    return (
        <div className={styles.page}>
            {/* Hero */}
            <div className={styles.hero}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={20} />
                </button>
                <div className={styles.heroContent}>
                    <div className={styles.avatar}>{initials(client.name)}</div>
                    <div className={styles.heroName}>{client.name}</div>
                    {client.company && (
                        <div className={styles.heroCompany}>{client.company}</div>
                    )}
                    <div className={styles.heroStats}>
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatVal}>{invoices.length}</span>
                            <span className={styles.heroStatLabel}>Invoices</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatVal}>{matters.length}</span>
                            <span className={styles.heroStatLabel}>Matters</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatVal}>{fmt(totalBilled)}</span>
                            <span className={styles.heroStatLabel}>Billed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className={styles.tabBar}>
                {(['profile', 'matters', 'invoices', 'activity'] as Tab[]).map(t => (
                    <button
                        key={t}
                        className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            <div className={styles.body}>
                {/* Profile tab */}
                {tab === 'profile' && (
                    <div className={styles.section}>
                        {client.email && (
                            <div className={styles.infoRow}>
                                <div className={styles.infoIcon}><Mail size={16} color="#059669" /></div>
                                <div>
                                    <div className={styles.infoLabel}>Email</div>
                                    <div className={styles.infoValue}>{client.email}</div>
                                </div>
                            </div>
                        )}
                        {client.phone && (
                            <div className={styles.infoRow}>
                                <div className={styles.infoIcon}><Phone size={16} color="#059669" /></div>
                                <div>
                                    <div className={styles.infoLabel}>Phone</div>
                                    <div className={styles.infoValue}>{client.phone}</div>
                                </div>
                            </div>
                        )}
                        {client.company && (
                            <div className={styles.infoRow}>
                                <div className={styles.infoIcon}><Building2 size={16} color="#059669" /></div>
                                <div>
                                    <div className={styles.infoLabel}>Company</div>
                                    <div className={styles.infoValue}>{client.company}</div>
                                </div>
                            </div>
                        )}
                        {client.industry && (
                            <div className={styles.infoRow}>
                                <div className={styles.infoIcon}><MapPin size={16} color="#94A3B8" /></div>
                                <div>
                                    <div className={styles.infoLabel}>Industry</div>
                                    <div className={styles.infoValue}>{client.industry}</div>
                                </div>
                            </div>
                        )}
                        {client.notes && (
                            <div className={styles.notesCard}>
                                <div className={styles.notesLabel}>Notes</div>
                                <div className={styles.notesText}>{client.notes}</div>
                            </div>
                        )}
                        {!client.email && !client.phone && !client.company && !client.industry && !client.notes && (
                            <div className={styles.empty}>No profile details on file</div>
                        )}
                    </div>
                )}

                {/* Matters tab */}
                {tab === 'matters' && (
                    <div className={styles.list}>
                        {matters.length === 0 && <div className={styles.empty}>No matters yet</div>}
                        {matters.map((m: any) => (
                            <div key={m.id} className={styles.card}>
                                <div className={styles.cardIcon} style={{ background: '#EEF4FF', color: '#2563EB' }}>
                                    <FileText size={16} />
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.cardName}>{m.name}</div>
                                    <div className={styles.cardSub}>
                                        {m.caseNumber || ''} · {m.status || 'active'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Invoices tab */}
                {tab === 'invoices' && (
                    <div className={styles.list}>
                        {invoices.length === 0 && <div className={styles.empty}>No invoices yet</div>}
                        {invoices.map((inv: any) => {
                            const pill = statusPill(inv.status);
                            return (
                                <Link key={inv.id} href={`/finance/invoices/${inv.id}`} className={styles.card}>
                                    <div className={styles.cardIcon} style={{ background: '#ECFDF5', color: '#059669' }}>
                                        <Receipt size={16} />
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardName}>#{inv.invoiceNumber}</div>
                                        <div className={styles.cardSub}>{fmtDate(inv.createdAt)}</div>
                                    </div>
                                    <div className={styles.cardTrail}>
                                        <div className={styles.cardAmount}>{fmt(Number(inv.totalAmount || 0))}</div>
                                        <div className={`${styles.pill} ${pill.cls}`}>{pill.label}</div>
                                    </div>
                                </Link>
                            );
                        })}
                        {invoices.length > 0 && (
                            <div className={styles.summaryRow}>
                                <span>Total collected</span>
                                <span className={styles.summaryVal}>{fmt(totalPaid)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Activity tab */}
                {tab === 'activity' && (
                    <div className={styles.timeline}>
                        {comms.length === 0 && <div className={styles.empty}>No activity recorded</div>}
                        {comms.map((c: any, i: number) => (
                            <div key={c.id || i} className={styles.timelineItem}>
                                <div className={styles.timelineNode} />
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineTitle}>
                                        {c.subject || c.type || 'Communication'}
                                    </div>
                                    <div className={styles.timelineSub}>
                                        {c.user?.name || ''} · {fmtDate(c.sentAt || c.createdAt)}
                                    </div>
                                    {c.notes && <div className={styles.timelineNote}>{c.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
