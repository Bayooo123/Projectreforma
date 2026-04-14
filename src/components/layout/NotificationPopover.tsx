'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, Info, AlertTriangle, FileText, X, CreditCard, Layout, Loader2, Settings, Archive } from 'lucide-react';
import { getUserNotifications, markAsRead, markAllAsRead } from '@/app/actions/notifications';
import Link from 'next/link';

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

type TabCategory = 'ALL' | 'TASKS' | 'PAYMENTS' | 'ALERTS';

const NotificationPopover = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabCategory>('ALL');

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

    const filteredNotifications = useMemo(() => {
        let list = [...notifications];
        switch (activeTab) {
            case 'TASKS':
                list = list.filter(n => n.relatedMatterId || n.relatedBriefId);
                break;
            case 'PAYMENTS':
                list = list.filter(n => n.relatedInvoiceId || n.relatedPaymentId);
                break;
            case 'ALERTS':
                list = list.filter(n => n.type === 'warning' || n.type === 'alert');
                break;
        }
        return list;
    }, [notifications, activeTab]);

    const groupedNotifications = useMemo(() => {
        const sections: { title: string; data: Notification[] }[] = [
            { title: 'Today', data: [] },
            { title: 'Yesterday', data: [] },
            { title: 'Earlier', data: [] }
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        filteredNotifications.forEach(n => {
            const d = new Date(n.createdAt);
            d.setHours(0, 0, 0, 0);

            if (d.getTime() === today.getTime()) {
                sections[0].data.push(n);
            } else if (d.getTime() === yesterday.getTime()) {
                sections[1].data.push(n);
            } else {
                sections[2].data.push(n);
            }
        });

        return sections.filter(s => s.data.length > 0);
    }, [filteredNotifications]);

    const getIcon = (type: string, n: Notification) => {
        if (n.relatedInvoiceId || n.relatedPaymentId) return <CreditCard size={18} className="text-emerald-600" />;
        if (n.relatedMatterId || n.relatedBriefId) return <Layout size={18} className="text-indigo-600" />;
        
        switch (type) {
            case 'success': return <Check size={18} className="text-green-600" />;
            case 'warning': return <AlertTriangle size={18} className="text-amber-600" />;
            case 'info': default: return <Info size={18} className="text-blue-600" />;
        }
    };

    const getLink = (n: Notification) => {
        if (n.relatedBriefId) return `/briefs/${n.relatedBriefId}`;
        if (n.relatedMatterId) return `/calendar?matterId=${n.relatedMatterId}`;
        if (n.relatedInvoiceId) return `/management/clients`;
        return '#';
    };

    return (
        <div className="absolute right-0 top-12 w-[480px] bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md">
                <div>
                    <h3 className="font-extrabold text-slate-900 tracking-tight">Activity Feed</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {unreadCount} Unread
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    >
                        Mark All Read
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex px-4 border-b border-slate-100 bg-white">
                {(['ALL', 'TASKS', 'PAYMENTS', 'ALERTS'] as TabCategory[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-[10px] font-black tracking-[0.1em] uppercase transition-all relative ${
                            activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-[300px] bg-white custom-scrollbar">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                                    <div className="h-3 bg-slate-50 rounded-lg w-full" />
                                    <div className="h-2 bg-slate-50 rounded-lg w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : groupedNotifications.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center px-12">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 rotate-12">
                            <Archive size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-slate-900 font-bold text-lg tracking-tight">Inbox Zero</h4>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} updates found in your workspace activity feed.
                        </p>
                    </div>
                ) : (
                    <div className="pb-4">
                        {groupedNotifications.map(section => (
                            <div key={section.title}>
                                <div className="px-6 py-3 bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-y border-slate-50/50">
                                    {section.title}
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {section.data.map(n => (
                                        <Link
                                            href={getLink(n)}
                                            key={n.id}
                                            onClick={() => handleMarkRead(n.id)}
                                            className={`group block px-6 py-5 hover:bg-slate-50 transition-all ${n.status === 'unread' ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className="flex gap-4 items-start">
                                                <div className={`mt-0.5 flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                    n.status === 'unread' ? 'bg-white shadow-md border border-blue-100' : 'bg-slate-50'
                                                }`}>
                                                    {getIcon(n.type, n)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`text-[13px] leading-tight ${n.status === 'unread' ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                                                            {n.title}
                                                        </p>
                                                        {n.status === 'unread' && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0 ml-2 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-snug line-clamp-2 mb-3 font-medium">
                                                        {n.message}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                                            {n.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <Link href="/settings" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <Settings size={18} />
                </Link>
                <Link href="/management/compliance" className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">
                    System Dashboard
                </Link>
                <div className="w-10 h-1" /> {/* Spacer */}
            </div>
        </div>
    );
};

export default NotificationPopover;
