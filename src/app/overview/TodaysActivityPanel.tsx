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
        if (s.includes('hearing') || s.includes('trial')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
        if (s.includes('judgment') || s.includes('ruling')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
        if (s.includes('mention')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
        if (s.includes('due')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    };

    if (activities.length === 0) {
        return (
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-10 mb-8 border border-white/20 dark:border-white/5 text-center shadow-lg">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800/30">
                    <CheckCircle className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
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
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 shadow-lg overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/30">
                            <Scale className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Court Schedule</h3>
                        <span className="ml-auto text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                            {courtItems.length} Today
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1">
                    {courtItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-70">
                            <Scale className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">No courtroom appearances today</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {courtItems.map(item => (
                                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 group">
                                    <div className="flex-col items-center justify-center text-center w-16 hidden sm:flex pt-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">{item.time.split(' ')[1]}</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 leading-none">{item.time.split(':')[0]}:{item.time.split(':')[1]}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate pr-2 text-base">
                                                {item.title}
                                            </h4>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm whitespace-nowrap ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 truncate">
                                            {item.subtitle}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="truncate max-w-[100px]">{item.subtitle.split('-')[0] || 'Court'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <div className="w-3 h-3 rounded-full bg-indigo-500 flex items-center justify-center text-[6px] text-white font-bold">
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
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 shadow-lg overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-800/30">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Deadlines & Filings</h3>
                        <span className="ml-auto text-xs font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                            {deadlineItems.length} Due
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1">
                    {deadlineItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-70">
                            <CheckCircle className="w-8 h-8 text-emerald-400/50 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">No deadlines due today</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {deadlineItems.map(item => (
                                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-300 group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate pr-2 text-base">
                                                {item.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    {item.time}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 truncate">
                                            {item.subtitle}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                            <span className="text-rose-600 dark:text-rose-400">Strict Deadline</span>
                                            <span className="mx-1 text-slate-300">•</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-600"></div>
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
        </div>
    );
}
