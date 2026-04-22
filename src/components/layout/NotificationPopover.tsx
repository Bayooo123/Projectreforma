'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Bell, Check, AlertTriangle, FileText, Gavel, Calendar,
    ShieldAlert, Users, CreditCard, Archive, Settings, Info,
} from 'lucide-react';
import { getUserNotifications, markAsRead, markAllAsRead } from '@/app/actions/notifications';
import Link from 'next/link';
import styles from './NotificationPopover.module.css';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    priority?: string;
    createdAt: Date;
    relatedMatterId?: string | null;
    relatedBriefId?: string | null;
    relatedInvoiceId?: string | null;
    relatedPaymentId?: string | null;
}

type TabId = 'ALL' | 'BRIEFS' | 'BILLING' | 'CALENDAR' | 'ALERTS';

const TABS: { id: TabId; label: string }[] = [
    { id: 'ALL',      label: 'All'      },
    { id: 'BRIEFS',   label: 'Briefs'   },
    { id: 'BILLING',  label: 'Billing'  },
    { id: 'CALENDAR', label: 'Calendar' },
    { id: 'ALERTS',   label: 'Alerts'   },
];

function getSeverity(n: Notification): 'urgent' | 'warning' | 'info' | 'success' {
    if (n.type === 'alert' || n.priority === 'critical') return 'urgent';
    if (n.type === 'warning' || n.priority === 'high')   return 'warning';
    if (n.type === 'success' || n.relatedPaymentId)      return 'success';
    return 'info';
}

function getIcon(n: Notification) {
    const severity = getSeverity(n);
    const cls = styles[`icon${severity.charAt(0).toUpperCase() + severity.slice(1)}` as keyof typeof styles];

    const titleLower = n.title.toLowerCase();

    let Icon = Info;
    if (n.relatedPaymentId)  Icon = Check;
    else if (n.relatedInvoiceId) Icon = CreditCard;
    else if (n.relatedBriefId)   Icon = FileText;
    else if (titleLower.includes('court') || titleLower.includes('adjourn')) Icon = Gavel;
    else if (titleLower.includes('meeting') || titleLower.includes('calendar')) Icon = Calendar;
    else if (titleLower.includes('compliance') || titleLower.includes('deadline')) Icon = ShieldAlert;
    else if (titleLower.includes('client')) Icon = Users;
    else if (n.type === 'success') Icon = Check;
    else if (n.type === 'warning' || n.type === 'alert') Icon = AlertTriangle;

    return (
        <div className={`${styles.iconWrap} ${cls}`}>
            <Icon size={16} />
        </div>
    );
}

function getLink(n: Notification): string {
    if (n.relatedBriefId)   return `/briefs/${n.relatedBriefId}`;
    if (n.relatedMatterId)  return `/calendar?matterId=${n.relatedMatterId}`;
    if (n.relatedInvoiceId) return `/management/clients`;
    return '#';
}

function relativeTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const NotificationPopover = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('ALL');

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await getUserNotifications();
            if (res.success && res.data) {
                setNotifications(res.data as any);
                setUnreadCount(res.unreadCount || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
        setUnreadCount(0);
    };

    const filtered = useMemo(() => {
        switch (activeTab) {
            case 'BRIEFS':
                return notifications.filter(n => n.relatedBriefId);
            case 'BILLING':
                return notifications.filter(n => n.relatedInvoiceId || n.relatedPaymentId);
            case 'CALENDAR': {
                const kw = ['court', 'meeting', 'adjourn', 'hearing', 'calendar'];
                return notifications.filter(n =>
                    n.relatedMatterId ||
                    kw.some(w => n.title.toLowerCase().includes(w) || n.message.toLowerCase().includes(w))
                );
            }
            case 'ALERTS':
                return notifications.filter(n => n.type === 'warning' || n.type === 'alert');
            default:
                return notifications;
        }
    }, [notifications, activeTab]);

    const grouped = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const today: Notification[]     = [];
        const yesterday: Notification[] = [];
        const earlier: Notification[]   = [];

        for (const n of filtered) {
            const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
            if (d >= todayStart)         today.push(n);
            else if (d >= yesterdayStart) yesterday.push(n);
            else                          earlier.push(n);
        }

        return [
            { label: 'Today',     items: today },
            { label: 'Yesterday', items: yesterday },
            { label: 'Earlier',   items: earlier },
        ].filter(g => g.items.length > 0);
    }, [filtered]);

    return (
        <div className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.headerTitle}>Activity Feed</span>
                    <div className={styles.headerMeta}>
                        <span className={styles.pulse} />
                        <span className={styles.unreadLabel}>{unreadCount} unread</span>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                        Mark all read
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Feed */}
            <div className={styles.feed}>
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className={styles.skeleton}>
                            <div className={styles.skeletonIcon} />
                            <div className={styles.skeletonLines}>
                                <div className={styles.skeletonLine} style={{ width: '65%' }} />
                                <div className={styles.skeletonLine} style={{ width: '90%' }} />
                                <div className={styles.skeletonLine} style={{ width: '35%' }} />
                            </div>
                        </div>
                    ))
                ) : grouped.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <Archive size={26} />
                        </div>
                        <p className={styles.emptyTitle}>All caught up</p>
                        <p className={styles.emptyText}>
                            No {activeTab !== 'ALL' ? activeTab.toLowerCase() + ' ' : ''}notifications in your feed.
                        </p>
                    </div>
                ) : (
                    grouped.map(section => (
                        <div key={section.label}>
                            <div className={styles.sectionLabel}>{section.label}</div>
                            {section.items.map(n => {
                                const severity = getSeverity(n);
                                const isUnread = n.status === 'unread';
                                const severityCls = isUnread
                                    ? ''
                                    : styles[`item${severity.charAt(0).toUpperCase() + severity.slice(1)}` as keyof typeof styles];
                                const typeCls = styles[`type${n.type.charAt(0).toUpperCase() + n.type.slice(1)}` as keyof typeof styles]
                                    || styles.typeInfo;

                                return (
                                    <Link
                                        key={n.id}
                                        href={getLink(n)}
                                        className={`${styles.item} ${isUnread ? styles.itemUnread : severityCls}`}
                                        onClick={() => handleMarkRead(n.id)}
                                    >
                                        {getIcon(n)}
                                        <div className={styles.itemBody}>
                                            <div className={styles.itemHeader}>
                                                <span className={`${styles.itemTitle} ${isUnread ? styles.itemTitleUnread : ''}`}>
                                                    {n.title}
                                                </span>
                                                {isUnread && <span className={styles.unreadDot} />}
                                            </div>
                                            <p className={styles.itemMessage}>{n.message}</p>
                                            <div className={styles.itemFooter}>
                                                <span className={styles.itemTime}>{relativeTime(n.createdAt)}</span>
                                                <span className={`${styles.itemType} ${typeCls}`}>{n.type}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <Link href="/settings" className={styles.footerIconBtn}>
                    <Settings size={15} />
                </Link>
                <Link href="/management/compliance" className={styles.footerLink}>
                    Compliance Dashboard
                </Link>
                <div style={{ width: 23 }} />
            </div>
        </div>
    );
};

export default NotificationPopover;
