'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertCircle, Info, CheckCircle, AlertTriangle, Check } from 'lucide-react';
import styles from './Notifications.module.css';
import { markAsRead, markAllAsRead } from '@/app/actions/notifications';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    status: string;
    createdAt: string | Date;
    readAt?: string | Date | null;
    relatedMatterId?: string | null;
    relatedBriefId?: string | null;
    relatedInvoiceId?: string | null;
}

interface Props {
    initialNotifications: Notification[];
    unreadCount: number;
}

function relativeTime(d: string | Date) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function groupByDay(notifications: Notification[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; items: Notification[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'This week', items: [] },
        { label: 'Older', items: [] },
    ];

    for (const n of notifications) {
        const d = new Date(n.createdAt);
        d.setHours(0, 0, 0, 0);
        if (d >= today) groups[0].items.push(n);
        else if (d >= yesterday) groups[1].items.push(n);
        else if (d >= weekAgo) groups[2].items.push(n);
        else groups[3].items.push(n);
    }

    return groups.filter(g => g.items.length > 0);
}

function NotifIcon({ type }: { type: string }) {
    const t = (type || '').toLowerCase();
    if (t === 'alert') return <AlertCircle size={18} />;
    if (t === 'success') return <CheckCircle size={18} />;
    if (t === 'warning') return <AlertTriangle size={18} />;
    return <Info size={18} />;
}

function iconStyle(type: string): React.CSSProperties {
    const t = (type || '').toLowerCase();
    if (t === 'alert') return { background: '#FEF2F2', color: '#EF4444' };
    if (t === 'success') return { background: '#D1FAE5', color: '#059669' };
    if (t === 'warning') return { background: '#FEF3C7', color: '#D97706' };
    return { background: '#EEF4FF', color: '#2563EB' };
}

export default function NotificationsClient({ initialNotifications, unreadCount: initUnread }: Props) {
    const router = useRouter();
    const [notifications, setNotifications] = useState(initialNotifications);
    const [unread, setUnread] = useState(initUnread);
    const [markingAll, setMarkingAll] = useState(false);

    const groups = groupByDay(notifications);

    async function handleMarkRead(id: string) {
        await markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, status: 'read', readAt: new Date() } : n)
        );
        setUnread(u => Math.max(0, u - 1));
    }

    async function handleMarkAllRead() {
        setMarkingAll(true);
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read', readAt: new Date() })));
        setUnread(0);
        setMarkingAll(false);
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <div className={styles.eyebrow}>Activity</div>
                    <h1 className={styles.title}>
                        Notifications
                        {unread > 0 && <span className={styles.badge}>{unread}</span>}
                    </h1>
                </div>
                {unread > 0 && (
                    <button
                        className={styles.markAllBtn}
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                    >
                        <Check size={14} />
                        {markingAll ? 'Marking…' : 'Mark all read'}
                    </button>
                )}
            </div>

            {notifications.length === 0 && (
                <div className={styles.empty}>
                    <Bell size={32} strokeWidth={1.5} />
                    <p>No notifications yet</p>
                </div>
            )}

            {groups.map(group => (
                <div key={group.label} className={styles.group}>
                    <div className={styles.groupLabel}>{group.label}</div>
                    <div className={styles.groupItems}>
                        {group.items.map(n => {
                            const isUnread = n.status === 'unread';
                            return (
                                <div
                                    key={n.id}
                                    className={`${styles.notifCard} ${isUnread ? styles.notifUnread : ''}`}
                                    onClick={() => isUnread && handleMarkRead(n.id)}
                                >
                                    <div className={styles.notifIcon} style={iconStyle(n.type)}>
                                        <NotifIcon type={n.type} />
                                    </div>
                                    <div className={styles.notifBody}>
                                        <div className={styles.notifTop}>
                                            <div className={styles.notifTitle}>{n.title}</div>
                                            <div className={styles.notifTime}>{relativeTime(n.createdAt)}</div>
                                        </div>
                                        <div className={styles.notifMessage}>{n.message}</div>
                                    </div>
                                    {isUnread && <div className={styles.unreadDot} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
