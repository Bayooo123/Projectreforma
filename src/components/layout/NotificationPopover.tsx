'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, FileText, X } from 'lucide-react';
import { getUserNotifications, markAsRead, markAllAsRead } from '@/app/actions/notifications';
import styles from './Header.module.css'; // Shared styles or create new
import Link from 'next/link';

// Inline types to match server action return
interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    createdAt: Date;
    relatedMatterId?: string | null;
    relatedBriefId?: string | null;
    relatedInvoiceId?: string | null;
    relatedPaymentId?: string | null;
}

const NotificationPopover = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    // const [isOpen, setIsOpen] = useState(false); // Managed by parent

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

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <Check size={18} className="text-green-600" />;
            case 'warning': return <AlertTriangle size={18} className="text-amber-600" />;
            case 'info': default: return <Info size={18} className="text-blue-600" />;
        }
    };

    const getLink = (n: Notification) => {
        if (n.relatedBriefId) return `/briefs/${n.relatedBriefId}`;
        if (n.relatedMatterId) return `/litigation?matterId=${n.relatedMatterId}`;
        if (n.relatedInvoiceId) return `/management/clients`;
        // if (n.relatedPaymentId) return `/management/clients`;
        return '#';
    };

    return (
        <div className="absolute right-0 top-12 w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
                <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Notifications</h3>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="overflow-y-auto flex-1 p-0">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center text-slate-500">
                        <Bell size={32} className="mb-3 opacity-20" />
                        <p className="text-base">No notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.map(n => (
                            <Link
                                href={getLink(n)}
                                key={n.id}
                                onClick={() => handleMarkRead(n.id)}
                                className={`block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${n.status === 'unread' ? 'bg-blue-50/40 dark:bg-blue-900/15' : ''}`}
                            >
                                <div className="flex gap-4 items-start">
                                    <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[0.95rem] mb-1 ${n.status === 'unread' ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2 font-medium">
                                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    {n.status === 'unread' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPopover;
