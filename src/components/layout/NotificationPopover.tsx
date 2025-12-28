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
    const [isOpen, setIsOpen] = useState(false); // Managed internally or by parent? Header manages open state.
    // Actually Header.tsx manages `showNotifications`. 
    // This component is RENDERED when open. 
    // So we should fetch on mount.

    useEffect(() => {
        fetchNotifications();
        // Optional: Polling interval?
        const interval = setInterval(fetchNotifications, 60000); // 1 min poll
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
            case 'success': return <Check size={16} className="text-green-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'info': default: return <Info size={16} className="text-blue-500" />;
        }
    };

    const getLink = (n: Notification) => {
        if (n.relatedBriefId) return `/briefs/${n.relatedBriefId}`;
        if (n.relatedMatterId) return `/litigation?matterId=${n.relatedMatterId}`; // Assuming litigation route
        if (n.relatedInvoiceId) return `/management/clients`; // Open Invoice modal? Need deep link concept later
        if (n.relatedPaymentId) return `/management/clients`;
        return '#';
    };

    return (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 flex flex-col max-h-[80vh]">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="overflow-y-auto flex-1 p-0">
                {isLoading ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center text-slate-500">
                        <Bell size={24} className="mb-2 opacity-20" />
                        <p className="text-sm">No notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.map(n => (
                            <Link
                                href={getLink(n)}
                                key={n.id}
                                onClick={() => handleMarkRead(n.id)} // Mark read on click
                                className={`block p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${n.status === 'unread' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                            >
                                <div className="flex gap-3 items-start">
                                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${n.status === 'unread' ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                            {n.message}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {n.status === 'unread' && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
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
