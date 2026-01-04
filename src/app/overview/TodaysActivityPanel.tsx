"use client";

import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Scale } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: string; // 'court_appearance' | 'deadline'
    title: string;
    subtitle: string;
    status: string;
    assignee: string;
    time: string;
}

interface TodaysActivityPanelProps {
    activities: ActivityItem[];
}

export default function TodaysActivityPanel({ activities }: TodaysActivityPanelProps) {
    const courtItems = activities.filter(a => a.type === 'court_appearance');
    const deadlineItems = activities.filter(a => a.type === 'deadline');

    // Helper for status styling
    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('hearing') || s.includes('trial')) return 'bg-amber-100 text-amber-800';
        if (s.includes('judgment') || s.includes('ruling')) return 'bg-purple-100 text-purple-800';
        if (s.includes('mention')) return 'bg-blue-100 text-blue-800';
        if (s.includes('due')) return 'bg-red-100 text-red-800';
        return 'bg-slate-100 text-slate-800';
    };

    if (activities.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 mb-8 border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    All Clear for Today
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    No court appearances or deadlines scheduled. Enjoy the focus time!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Court Schedule */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Court Schedule</h3>
                        <span className="ml-auto text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
                            {courtItems.length} Today
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    {courtItems.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">No filings or appearances today.</p>
                    ) : (
                        <div className="space-y-4">
                            {courtItems.map(item => (
                                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 transition-colors">
                                    <div className="flex-col items-center justify-center text-center w-14 hidden sm:flex">
                                        <span className="text-xs text-slate-500 font-medium uppercase">{item.time.split(' ')[1]}</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">{item.time.split(':')[0]}:{item.time.split(':')[1]}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                                                {item.title}
                                            </h4>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 truncate">
                                            {item.subtitle}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[120px]">{item.subtitle.split('-')[0]}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                                                    {item.assignee.charAt(0)}
                                                </div>
                                                <span>{item.assignee}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Deadlines & Tasks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Deadlines & Filings</h3>
                        <span className="ml-auto text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
                            {deadlineItems.length} Due
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    {deadlineItems.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">No deadlines due today.</p>
                    ) : (
                        <div className="space-y-4">
                            {deadlineItems.map(item => (
                                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-red-200 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                {item.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 truncate">
                                            {item.subtitle}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                            <span>Strict Deadline</span>
                                            <span className="mx-1">•</span>
                                            <span>{item.assignee}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
